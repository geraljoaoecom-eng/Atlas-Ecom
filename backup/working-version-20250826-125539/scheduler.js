import cron from 'node-cron';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCountByPageId, getCountFromUrl } from './scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.resolve(__dirname, 'data', 'history.json');
fs.ensureFileSync(DATA_FILE); 
if (!fs.readFileSync(DATA_FILE,'utf8')) fs.writeJsonSync(DATA_FILE, []);

let task = null;
let lastRun = null;
let lastError = null;

function loadHistory(){ 
  try { 
    return fs.readJsonSync(DATA_FILE); 
  } catch { 
    return []; 
  } 
}

function saveRows(rows){ 
  const cur = loadHistory(); 
  fs.writeJsonSync(DATA_FILE, cur.concat(rows), { spaces: 2 }); 
}

async function runBatch({ pageIds=[], urls=[], country='PT' }){
  const now = new Date().toISOString();
  const rows = [];
  lastError = null;

  for (const id of pageIds) {
    try {
      const r = await getCountByPageId(id, country);
      rows.push({ 
        ts: now, 
        type: 'page', 
        pageId: id, 
        country, 
        count: r.count, 
        source: r.source||r.mode 
      });
    } catch(e){ 
      lastError = String(e?.message||e); 
    }
  }
  
  for (const u of urls) {
    try {
      const r = await getCountFromUrl(u);
      rows.push({ 
        ts: now, 
        type: 'url', 
        url: u, 
        count: r.count, 
        source: r.source||r.mode 
      });
    } catch(e){ 
      lastError = String(e?.message||e); 
    }
  }
  
  if (rows.length) saveRows(rows);
  lastRun = { ts: now, rows: rows.length, error: lastError };
  return rows;
}

function startScheduler({ cronExpr, pageIds=[], urls=[], country='PT' }){
  if (task) task.stop();
  task = cron.schedule(cronExpr, () => runBatch({ pageIds, urls, country }), { scheduled: true });
  return true;
}

function stopScheduler(){ 
  if (task){ 
    task.stop(); 
    task = null; 
  } 
  return true; 
}

function statusScheduler(){
  return {
    enabled: !!task,
    next: null, // node-cron não expõe próxima; deixamos null
    lastRun
  };
}

export { runBatch, startScheduler, stopScheduler, statusScheduler, loadHistory };
