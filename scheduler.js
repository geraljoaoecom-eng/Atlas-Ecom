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

  // Otimização: Processar pageIds em paralelo (máximo 3 simultâneas)
  if (pageIds.length > 0) {
    const pageIdChunks = chunkArray(pageIds, 3);
    for (const chunk of pageIdChunks) {
      const chunkPromises = chunk.map(async (id) => {
        try {
          const r = await getCountByPageId(id, country);
          return { 
            ts: now, 
            type: 'page', 
            pageId: id, 
            country, 
            count: r.count, 
            source: r.source||r.mode 
          };
        } catch(e){ 
          lastError = String(e?.message||e);
          return null;
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      rows.push(...chunkResults.filter(r => r !== null));
    }
  }
  
  // Otimização: Processar URLs em paralelo (máximo 5 simultâneas)
  if (urls.length > 0) {
    const urlChunks = chunkArray(urls, 5);
    for (const chunk of urlChunks) {
      const chunkPromises = chunk.map(async (u) => {
        try {
          const r = await getCountFromUrl(u);
          return { 
            ts: now, 
            type: 'url', 
            url: u, 
            count: r.count, 
            source: r.source||r.mode 
          };
        } catch(e){ 
          lastError = String(e?.message||e);
          return null;
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      rows.push(...chunkResults.filter(r => r !== null));
    }
  }
  
  if (rows.length) {
    saveRows(rows);
    
    // Atualizar dados das bibliotecas com os novos resultados
    try {
      const librariesFile = path.join(__dirname, 'data', 'libraries.json');
      if (fs.pathExistsSync(librariesFile)) {
        const libraries = fs.readJsonSync(librariesFile);
        
        for (const row of rows) {
          if (row.type === 'url') {
            // Encontrar biblioteca por URL e atualizar
            const libraryIndex = libraries.findIndex(lib => lib.url === row.url);
            if (libraryIndex !== -1) {
              // Atualizar dados atuais
              libraries[libraryIndex].lastActiveAds = row.count;
              libraries[libraryIndex].lastUpdate = now;
              
              // Adicionar entrada ao histórico
              if (!libraries[libraryIndex].history) {
                libraries[libraryIndex].history = [];
              }
              
              // Adicionar entrada de hoje se não existir
              const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
              const existingEntry = libraries[libraryIndex].history.find(h => h.date === today);
              
              if (existingEntry) {
                // Atualizar entrada existente com o valor mais alto do dia
                existingEntry.count = Math.max(existingEntry.count, row.count);
                existingEntry.lastUpdate = now;
              } else {
                // Criar nova entrada para hoje
                libraries[libraryIndex].history.push({
                  date: today,
                  count: row.count,
                  timestamp: now
                });
              }
              
              // Manter apenas os últimos 30 dias de histórico
              if (libraries[libraryIndex].history.length > 30) {
                libraries[libraryIndex].history = libraries[libraryIndex].history.slice(-30);
              }
              
              console.log(`📊 Biblioteca atualizada: ${libraries[libraryIndex].name} - ${row.count} anúncios (histórico: ${libraries[libraryIndex].history.length} dias)`);
            }
          }
        }
        
        // Guardar bibliotecas atualizadas
        fs.writeJsonSync(librariesFile, libraries, { spaces: 2 });
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar bibliotecas:', error.message);
    }
  }
  
  lastRun = { ts: now, rows: rows.length, error: lastError };
  return rows;
}

// Função auxiliar para dividir arrays em chunks
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
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
