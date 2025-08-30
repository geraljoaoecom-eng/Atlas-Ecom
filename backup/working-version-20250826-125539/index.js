import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import fs from 'fs-extra';

// Importar funções do scraper e scheduler
import { getCountByPageId, getCountFromUrl } from './scraper.js';
import { runBatch, startScheduler, stopScheduler, statusScheduler, loadHistory } from './scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações padrão
const PAGE_IDS = []; // o user preenche depois
const DEFAULT_COUNTRY = process.env.COUNTRY || 'PT';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rotas da API
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/data', async (req, res) => {
  try {
    const history = loadHistory();
    res.json(history);
  } catch (error) {
    console.error('Erro ao ler histórico:', error);
    res.status(500).json({ 
      error: 'Erro ao ler dados',
      message: error.message 
    });
  }
});

app.get('/api/count/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { country = DEFAULT_COUNTRY } = req.query;
    
    console.log(`🔍 Contando anúncios para página ${pageId} no país ${country}`);
    
    const result = await getCountByPageId(pageId, country);
    
    const response = {
      pageId,
      country,
      count: result.count,
      source: result.source || result.mode,
      error: result.error,
      ts: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Erro na rota /api/count:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

app.post('/api/countByUrl', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URL é obrigatória' 
      });
    }
    
    console.log(`🔍 Contando anúncios para URL: ${url}`);
    
    const result = await getCountFromUrl(url);
    
    const response = {
      url,
      count: result.count,
      source: result.source || result.mode,
      error: result.error,
      ts: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Erro na rota /api/countByUrl:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

app.post('/api/monitor', async (req, res) => {
  try {
    const { pageIds = [], urls = [], country = DEFAULT_COUNTRY } = req.body;
    
    console.log('📥 Request recebido:', { 
      pageIds: pageIds?.length, 
      urls: urls?.length, 
      country 
    });
    
    if (pageIds.length === 0 && urls.length === 0) {
      return res.status(400).json({ 
        error: 'Deve fornecer pageIds ou urls' 
      });
    }
    
    const results = await runBatch({ pageIds, urls, country });
    
    console.log(`✅ Monitoramento concluído. ${results.length} resultados processados.`);
    
    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na rota /api/monitor:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Rotas do scheduler
app.get('/api/scheduler/status', (req, res) => {
  try {
    const status = statusScheduler();
    res.json(status);
  } catch (error) {
    console.error('Erro ao obter status do scheduler:', error);
    res.status(500).json({ 
      error: 'Erro ao obter status',
      message: error.message 
    });
  }
});

app.post('/api/scheduler/start', (req, res) => {
  try {
    const { 
      cron = process.env.CRON_SCHEDULE || '*/15 * * * *',
      pageIds = PAGE_IDS,
      urls = [],
      country = DEFAULT_COUNTRY
    } = req.body;
    
    console.log('🚀 Iniciando scheduler:', { cron, pageIds, urls, country });
    
    const success = startScheduler({ cronExpr: cron, pageIds, urls, country });
    
    res.json({
      success,
      message: 'Scheduler iniciado com sucesso',
      config: { cron, pageIds, urls, country },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar scheduler:', error);
    res.status(500).json({ 
      error: 'Erro ao iniciar scheduler',
      message: error.message 
    });
  }
});

app.post('/api/scheduler/stop', (req, res) => {
  try {
    console.log('🛑 Parando scheduler');
    
    const success = stopScheduler();
    
    res.json({
      success,
      message: 'Scheduler parado com sucesso',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao parar scheduler:', error);
    res.status(500).json({ 
      error: 'Erro ao parar scheduler',
      message: error.message 
    });
  }
});

// Inicialização do scheduler se habilitado
if (process.env.CRON_ENABLED === 'true') {
  console.log('🚀 Iniciando scheduler automático...');
  startScheduler({ 
    cronExpr: process.env.CRON_SCHEDULE || '*/15 * * * *', 
    pageIds: PAGE_IDS, 
    urls: [], 
    country: DEFAULT_COUNTRY 
  });
  console.log('✅ Scheduler automático iniciado');
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponível em http://localhost:${PORT}`);
  console.log(`⏰ Scheduler: ${process.env.CRON_ENABLED === 'true' ? 'HABILITADO' : 'DESABILITADO'}`);
  if (process.env.CRON_ENABLED === 'true') {
    console.log(`🔄 Cron: ${process.env.CRON_SCHEDULE || '*/15 * * * *'}`);
  }
});
