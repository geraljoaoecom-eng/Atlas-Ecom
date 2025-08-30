import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { parseVisibleCount } from './utils/parse.js';
import { isAdLibraryUrl, adLibUrlFromPage } from './utils/url.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '.pwdata');
const HEADLESS = String(process.env.HEADLESS || 'true').toLowerCase() !== 'false';
const PROXY_URL = process.env.PROXY_URL || null;
const LANG_HINT = process.env.LANG_HINT || 'pt-PT';

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];
const randUA = () => UAS[Math.floor(Math.random()*UAS.length)];

async function withContext(fn) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const ctx = await chromium.launchPersistentContext(DATA_DIR, {
    headless: HEADLESS,
    proxy: PROXY_URL ? { server: PROXY_URL } : undefined,
    viewport: { width: 1400, height: 900 },
    userAgent: randUA(),
    locale: LANG_HINT,
    timezoneId: 'Europe/Lisbon',
    ignoreHTTPSErrors: true,
    args: ['--disable-blink-features=AutomationControlled','--no-sandbox','--disable-dev-shm-usage',`--lang=${LANG_HINT}`]
  });
  try { 
    return await fn(ctx); 
  } finally { 
    await ctx.close(); 
  }
}

async function clickConsentIfAny(page) {
  const sels = [
    'button:has-text("Aceitar")','button:has-text("Aceito")','button:has-text("Accept")',
    'button:has-text("Allow")','[data-testid="cookie-policy-dialog-accept-button"]',
    'button:has-text("Permitir todos")','button:has-text("Allow all")'
  ];
  for (const s of sels) {
    try { 
      const b = await page.$(s); 
      if (b) { 
        await b.click({timeout:1000}).catch(()=>{}); 
        break; 
      } 
    } catch {}
  }
}

async function readCounterText(page) {
  // 1) seletor direto por regex
  const rxSel = 'text=/~?\\s*\\d[\\d\\.,\\s]*\\s+(resultados|results|résultats|ergebnisse|risultati|risultats)/i';
  try {
    const el = await page.locator(rxSel).first();
    const txt = await el.textContent({ timeout: 2000 }).catch(()=>null);
    const n = parseVisibleCount(txt || '');
    if (Number.isFinite(n)) return { n, raw: txt, from: 'regex-text' };
  } catch {}
  
  // 2) varrer textos candidatos
  try {
    const arr = await page.locator('text=/resultados|results|résultats|ergebnisse|risultati|risultats/i').allTextContents();
    for (const t of arr) {
      const n = parseVisibleCount(t);
      if (Number.isFinite(n)) return { n, raw: t, from: 'scan-texts' };
    }
  } catch {}
  
  // 3) fallback HTML
  try {
    const html = await page.content();
    const n = parseVisibleCount(html.replace(/\s+/g,' '));
    if (Number.isFinite(n)) return { n, raw: '(html)', from: 'html-regex' };
  } catch {}
  
  return { n: null, raw: null, from: 'not-found' };
}

async function getCountFromUrl(url) {
  if (!isAdLibraryUrl(url)) throw new Error('URL inválida para Ads Library');
  
  return await withContext(async (ctx) => {
    const page = await ctx.newPage();
    try {
      await page.setExtraHTTPHeaders({'Accept-Language': `${LANG_HINT},en;q=0.7`});
      await page.goto(url, { timeout: 45000, waitUntil: 'domcontentloaded' });
      await clickConsentIfAny(page);
      
      // esperar interface básica
      await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(()=>{});
      
      const { n, from } = await readCounterText(page);
      return { count: n ?? 0, mode: 'visible-counter', source: from };
    } catch (e) {
      return { count: 0, mode: 'error', error: String(e?.message||e) };
    } finally {
      await page.close().catch(()=>{});
    }
  });
}

async function getCountByPageId(pageId, country='PT') {
  const url = adLibUrlFromPage(country, pageId);
  const r = await getCountFromUrl(url);
  return { ...r, pageId, country };
}

export { getCountFromUrl, getCountByPageId };
