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
  // Verificar se estamos no Vercel (ambiente serverless)
  const isVercel = process.env.VERCEL === '1';
  
  if (isVercel) {
    // No Vercel, usar launch sem contexto persistente
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript',
        `--lang=${LANG_HINT}`
      ]
    });
    
    try {
      const ctx = await browser.newContext({
        viewport: { width: 1200, height: 800 },
        userAgent: randUA(),
        locale: LANG_HINT,
        timezoneId: 'Europe/Lisbon',
        ignoreHTTPSErrors: true
      });
      
      return await fn(ctx);
    } finally {
      await browser.close();
    }
  } else {
    // Em ambiente local, usar contexto persistente
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const ctx = await chromium.launchPersistentContext(DATA_DIR, {
      headless: HEADLESS,
      proxy: PROXY_URL ? { server: PROXY_URL } : undefined,
      viewport: { width: 1200, height: 800 },
      userAgent: randUA(),
      locale: LANG_HINT,
      timezoneId: 'Europe/Lisbon',
      ignoreHTTPSErrors: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript',
        `--lang=${LANG_HINT}`
      ]
    });
    
    try { 
      return await fn(ctx); 
    } finally { 
      await ctx.close(); 
    }
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
  console.log('🔍 Iniciando leitura de contador...');
  
  // Selectors mais robustos para o Facebook Ads Library
  const fastSelectors = [
    // Seletor principal do Facebook
    '[data-testid="ads_library_results_count"]',
    // Seletor alternativo mais genérico
    'div:has-text(/resultados|results|résultats|ergebnisse|risultati|risultats/i)',
    // Seletor de texto direto mais flexível
    'text=/~?\\s*\\d[\\d\\.,\\s]*\\s+(resultados|results|résultats|ergebnisse|risultati|risultats)/i',
    // Novos selectors para diferentes layouts do Facebook
    'span:has-text(/resultados|results|résultats|ergebnisse|risultati|risultats/i)',
    'div[role="main"] span:has-text(/resultados|results|résultats|ergebnisse|risultati|risultats/i)'
  ];
  
  for (const selector of fastSelectors) {
    try {
      console.log(`🔍 Tentando selector: ${selector}`);
      const el = await page.locator(selector).first({ timeout: 5000 });
      const txt = await el.textContent();
      console.log(`🔍 Texto encontrado: "${txt}"`);
      const n = parseVisibleCount(txt || '');
      console.log(`🔍 Número extraído: ${n}`);
      if (Number.isFinite(n)) return { n, raw: txt, from: 'fast-selector' };
    } catch (error) {
      console.log(`❌ Erro com selector ${selector}:`, error.message);
    }
  }
  
  // Fallback rápido se os seletores principais falharem
  console.log('🔍 Tentando fallback...');
  try {
    const arr = await page.locator('text=/resultados|results|résultats|ergebnisse|risultati|risultats/i').allTextContents({ timeout: 3000 });
    console.log(`🔍 Fallback encontrou ${arr.length} elementos de texto`);
    for (const t of arr) {
      console.log(`🔍 Texto do fallback: "${t}"`);
      const n = parseVisibleCount(t);
      console.log(`🔍 Número do fallback: ${n}`);
      if (Number.isFinite(n)) return { n, raw: t, from: 'fallback-scan' };
    }
  } catch (error) {
    console.log(`❌ Erro no fallback:`, error.message);
  }
  
  console.log('❌ Nenhum contador encontrado');
  
  // Debug: Mostrar parte do HTML da página para diagnóstico
  try {
    const pageContent = await page.content();
    const bodyText = await page.locator('body').textContent();
    console.log(`🔍 Conteúdo da página (primeiros 500 chars): ${bodyText?.substring(0, 500)}`);
  } catch (error) {
    console.log('❌ Erro ao ler conteúdo da página:', error.message);
  }
  
  return { n: null, raw: null, from: 'not-found' };
}

// Cache inteligente para resultados recentes (15 minutos)
const resultCache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos em milissegundos

function getCachedResult(url) {
  const cached = resultCache.get(url);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.result;
  }
  return null;
}

function setCachedResult(url, result) {
  resultCache.set(url, {
    result,
    timestamp: Date.now()
  });
  
  // Limpar cache antigo periodicamente
  if (resultCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of resultCache.entries()) {
      if ((now - value.timestamp) > CACHE_DURATION) {
        resultCache.delete(key);
      }
    }
  }
}

async function getCountFromUrl(url) {
  if (!isAdLibraryUrl(url)) throw new Error('URL inválida para Ads Library');
  
  // Otimização: Verificar cache primeiro
  const cached = getCachedResult(url);
  if (cached) {
    return { ...cached, mode: 'cached', source: 'cache' };
  }
  
  return await withContext(async (ctx) => {
    const page = await ctx.newPage();
    try {
      await page.setExtraHTTPHeaders({'Accept-Language': `${LANG_HINT},en;q=0.7`});
      
      // Timeout aumentado para ser mais confiável
      await page.goto(url, { timeout: 45000, waitUntil: 'domcontentloaded' });
      await clickConsentIfAny(page);
      
      // Espera mais tempo para a página carregar completamente
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(()=>{});
      
      const { n, from } = await readCounterText(page);
      const result = { count: n ?? 0, mode: 'visible-counter', source: from };
      
      // Debug detalhado
      console.log(`🔍 Scraping de ${url}:`);
      console.log(`   - Resultado: ${n}`);
      console.log(`   - Fonte: ${from}`);
      console.log(`   - Modo: visible-counter`);
      
      // Otimização: Guardar no cache
      setCachedResult(url, result);
      
      return result;
    } catch (e) {
      const errorResult = { count: 0, mode: 'error', error: String(e?.message||e) };
      setCachedResult(url, errorResult);
      return errorResult;
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
