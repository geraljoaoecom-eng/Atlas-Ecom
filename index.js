import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import fs from 'fs-extra';
import cron from 'node-cron';
import jwt from 'jsonwebtoken';

// Importar funções do scraper e scheduler
import { getCountByPageId, getCountFromUrl } from './scraper.js';
import { runBatch, startScheduler, stopScheduler, statusScheduler, loadHistory } from './scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret (em produção deve estar em variáveis de ambiente)
const JWT_SECRET = 'atlas-ecom-secret-key-2025';

// Credenciais de acesso (em produção deve estar em base de dados)
const VALID_CREDENTIALS = [
    {
        email: 'directbpmarketing@gmail.com',
        password: 'Cuf2020'
    },
    {
        email: 'teste@gmail.com',
        password: 'Teste2020'
    }
];

// Middleware para verificar JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado' });
        }
        req.user = user;
        next();
    });
}

// Middleware para verificar se o utilizador está autenticado (para páginas HTML)
function checkAuth(req, res, next) {
    // Se for uma API, usar o middleware JWT
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    // Se for a página de login, permitir acesso
    if (req.path === '/login') {
        return next();
    }
    
    // Para todas as outras páginas, redirecionar para login
    // (a verificação de token será feita no frontend)
    return res.redirect('/login');
}

// Configurações padrão
const PAGE_IDS = []; // o user preenche depois
const DEFAULT_COUNTRY = process.env.COUNTRY || 'PT';

app.use(express.json());

// Rota de login (pública - deve vir ANTES da proteção)
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const validCredential = VALID_CREDENTIALS.find(cred => cred.email === email && cred.password === password);

    if (validCredential) {
        const token = jwt.sign(
            { email: email, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token: token,
            message: 'Login bem-sucedido'
        });
    } else {
        res.status(401).json({
            success: false,
            error: 'Email ou password incorretos'
        });
    }
});

// Rota para atualizar manualmente o número de anúncios de uma biblioteca
app.post('/api/update-count', async (req, res) => {
  try {
    const { libraryId, count } = req.body;
    
    if (!libraryId || count === undefined) {
      return res.status(400).json({ 
        error: 'libraryId e count são obrigatórios' 
      });
    }
    
    console.log(`📊 Atualizando biblioteca ${libraryId} com ${count} anúncios`);
    
    const librariesFile = path.join(__dirname, 'data', 'libraries.json');
    if (!fs.pathExistsSync(librariesFile)) {
      return res.status(404).json({ error: 'Arquivo de bibliotecas não encontrado' });
    }
    
    const libraries = fs.readJsonSync(librariesFile);
    const libraryIndex = libraries.findIndex(lib => lib.id === libraryId);
    
    if (libraryIndex === -1) {
      return res.status(404).json({ error: 'Biblioteca não encontrada' });
    }
    
    // Atualizar número de anúncios
    libraries[libraryIndex].lastActiveAds = parseInt(count);
    libraries[libraryIndex].lastUpdate = new Date().toISOString();
    
    // Adicionar ao histórico
    if (!libraries[libraryIndex].history) {
      libraries[libraryIndex].history = [];
    }
    
    const today = new Date().toISOString().split('T')[0];
    const existingEntry = libraries[libraryIndex].history.find(h => h.date === today);
    
    if (existingEntry) {
      existingEntry.count = parseInt(count);
      existingEntry.lastUpdate = new Date().toISOString();
    } else {
      libraries[libraryIndex].history.push({
        date: today,
        count: parseInt(count),
        timestamp: new Date().toISOString()
      });
    }
    
    // Guardar alterações
    fs.writeJsonSync(librariesFile, libraries, { spaces: 2 });
    
    console.log(`✅ Biblioteca ${libraries[libraryIndex].name} atualizada: ${count} anúncios`);
    
    res.json({
      success: true,
      library: libraries[libraryIndex],
      message: 'Número de anúncios atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar número de anúncios:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// Middleware de autenticação para todas as outras rotas da API
app.use('/api', authenticateToken);

// Rota de login (pública)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota raiz - redirecionar para login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Rota do dashboard (protegida)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota protegida para verificar se o utilizador está autenticado
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ 
        success: true, 
        user: req.user,
        message: 'Token válido' 
    });
});

// Rota de logout
app.post('/api/auth/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Logout bem-sucedido' 
    });
});

// Servir ficheiros estáticos
app.use(express.static('public'));

// Rotas específicas para arquivos estáticos
app.get('/client.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'client.js'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rotas da API
app.get('/api/ping', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Rotas para bibliotecas
app.get('/api/libraries', async (req, res) => {
  try {
    const { folderId } = req.query;
    const librariesFile = path.join(__dirname, 'data', 'libraries.json');
    let libraries = [];
    
    if (await fs.pathExists(librariesFile)) {
      libraries = await fs.readJson(librariesFile);
    }
    
    // Se folderId for fornecido, filtrar por pasta
    if (folderId) {
      libraries = libraries.filter(lib => lib.folderId === folderId);
    }
    
    res.json(libraries);
  } catch (error) {
    console.error('Erro ao carregar bibliotecas:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar bibliotecas',
      message: error.message 
    });
  }
});

app.put('/api/libraries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, observations, folderId } = req.body;
    
    // Carregar bibliotecas existentes
    const librariesFile = path.join(__dirname, 'data', 'libraries.json');
    let libraries = [];
    
    if (await fs.pathExists(librariesFile)) {
      libraries = await fs.readJson(librariesFile);
    }
    
    // Encontrar biblioteca
    const libraryIndex = libraries.findIndex(lib => lib.id === id);
    
    if (libraryIndex === -1) {
      return res.status(404).json({ 
        error: 'Biblioteca não encontrada' 
      });
    }
    
    // Atualizar campos fornecidos
    if (name !== undefined) libraries[libraryIndex].name = name;
    if (url !== undefined) libraries[libraryIndex].url = url;
    if (observations !== undefined) libraries[libraryIndex].observations = observations;
    if (folderId !== undefined) libraries[libraryIndex].folderId = folderId;
    
    // Adicionar timestamp de atualização
    libraries[libraryIndex].updatedAt = new Date().toISOString();
    
    // Guardar atualizações
    await fs.writeJson(librariesFile, libraries, { spaces: 2 });
    
    console.log(`✅ Biblioteca atualizada: ${libraries[libraryIndex].name}`);
    
    res.json({
      success: true,
      library: libraries[libraryIndex],
      message: 'Biblioteca atualizada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar biblioteca:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar biblioteca',
      message: error.message 
    });
  }
});

app.post('/api/libraries', async (req, res) => {
  try {
    const { name, url, observations, folderId } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Nome e URL são obrigatórios' });
    }
    
    // Verificar se já existe uma biblioteca com a mesma URL
    const librariesFile = path.join(__dirname, 'data', 'libraries.json');
    let libraries = [];
    
    if (await fs.pathExists(librariesFile)) {
      libraries = await fs.readJson(librariesFile);
    }
    
    const existingLibrary = libraries.find(lib => lib.url === url);
    if (existingLibrary) {
      return res.status(400).json({ error: 'Já existe uma biblioteca com esta URL' });
    }
    
    // Criar nova biblioteca
    const newLibrary = {
      id: Date.now().toString(),
      name,
      url,
      observations: observations || '',
      notes: [],
      folderId: folderId || null,
      lastActiveAds: 0,
      lastUpdate: null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Adicionar à lista
    libraries.push(newLibrary);
    
    // Guardar no ficheiro
    await fs.ensureDir(path.dirname(librariesFile));
    await fs.writeJson(librariesFile, libraries, { spaces: 2 });
    
    console.log(`✅ Nova biblioteca criada: ${name}`);
    
    // SCRAPING IMEDIATO da nova biblioteca
    try {
      console.log(`🔍 Iniciando scraping imediato para: ${name}`);
      const scrapingResult = await getCountFromUrl(url);
      
      if (scrapingResult && scrapingResult.count !== null) {
        // Atualizar biblioteca com resultado do scraping
        newLibrary.lastActiveAds = scrapingResult.count;
        newLibrary.lastUpdate = new Date().toISOString();
        newLibrary.status = 'active';
        
        // Adicionar ao histórico
        if (!newLibrary.history) {
          newLibrary.history = [];
        }
        
        const today = new Date().toISOString().split('T')[0];
        newLibrary.history.push({
          date: today,
          count: scrapingResult.count,
          timestamp: new Date().toISOString()
        });
        
        // Guardar atualizações
        await fs.writeJson(librariesFile, libraries, { spaces: 2 });
        
        console.log(`✅ Scraping imediato concluído: ${name} - ${scrapingResult.count} anúncios`);
      } else {
        console.log(`⚠️ Scraping imediato falhou para: ${name}`);
      }
    } catch (scrapingError) {
      console.error(`❌ Erro no scraping imediato para ${name}:`, scrapingError.message);
    }
    
    // ATUALIZAR SCHEDULER com nova URL
    try {
      console.log(`🔄 Atualizando scheduler com nova biblioteca...`);
      
      // Parar scheduler atual
      stopScheduler();
      
      // Recarregar bibliotecas e extrair URLs
      const updatedLibraries = await fs.readJson(librariesFile);
      const updatedUrls = updatedLibraries.map(lib => lib.url).filter(url => url);
      
      // Reiniciar scheduler com URLs atualizadas
      startScheduler({ 
        cronExpr: '*/5 * * * *', // A cada 5 minutos
        pageIds: PAGE_IDS, 
        urls: updatedUrls, 
        country: DEFAULT_COUNTRY 
      });
      
      console.log(`✅ Scheduler atualizado: ${updatedUrls.length} bibliotecas monitorizadas`);
    } catch (schedulerError) {
      console.error(`❌ Erro ao atualizar scheduler:`, schedulerError.message);
    }
    
    res.json({
      success: true,
      library: newLibrary,
      message: 'Biblioteca criada com sucesso e scraping iniciado',
      scrapingResult: newLibrary.lastActiveAds
    });
    
  } catch (error) {
    console.error('Erro ao criar biblioteca:', error);
    res.status(500).json({ 
      error: 'Erro ao criar biblioteca',
      message: error.message 
    });
  }
});

app.delete('/api/libraries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Carregar bibliotecas existentes
    const librariesFile = path.join(__dirname, 'data', 'libraries.json');
    let libraries = [];
    
    if (await fs.pathExists(librariesFile)) {
      libraries = await fs.readJson(librariesFile);
    }
    
    // Encontrar e remover biblioteca
    const libraryIndex = libraries.findIndex(lib => lib.id === id);
    
    if (libraryIndex === -1) {
      return res.status(404).json({ 
        error: 'Biblioteca não encontrada' 
      });
    }
    
    const removedLibrary = libraries.splice(libraryIndex, 1)[0];
    
    // Guardar lista atualizada
    await fs.writeJson(librariesFile, libraries, { spaces: 2 });
    
    console.log(`✅ Biblioteca removida: ${removedLibrary.name}`);
    
    res.json({
      success: true,
      message: 'Biblioteca removida com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao remover biblioteca:', error);
    res.status(500).json({ 
      error: 'Erro ao remover biblioteca',
      message: error.message 
    });
  }
});

// Rotas para monitoramento
app.post('/api/monitor/single', async (req, res) => {
  try {
    const { libraryId } = req.body;
    
    if (!libraryId) {
      return res.status(400).json({ error: 'ID da biblioteca é obrigatório' });
    }
    
    // Carregar bibliotecas existentes
    const librariesFile = path.join(__dirname, 'data', 'libraries.json');
    let libraries = [];
    
    if (await fs.pathExists(librariesFile)) {
      libraries = await fs.readJson(librariesFile);
    }
    
    // Encontrar biblioteca
    const library = libraries.find(lib => lib.id === libraryId);
    
    if (!library) {
      return res.status(404).json({ error: 'Biblioteca não encontrada' });
    }
    
    console.log(`🚀 Verificando biblioteca: ${library.name}`);
    
    // Executar verificação
    const results = await runBatch({ urls: [library.url], country: DEFAULT_COUNTRY });
    
    if (results && results.length > 0) {
      const result = results[0];
      if (!result.error) {
        // Atualizar biblioteca
        const libraryIndex = libraries.findIndex(lib => lib.id === libraryId);
        libraries[libraryIndex].lastActiveAds = result.count;
        libraries[libraryIndex].lastUpdate = new Date().toISOString();
        libraries[libraryIndex].status = 'active';
        
        // Guardar atualizações
        await fs.writeJson(librariesFile, libraries, { spaces: 2 });
        
        console.log(`✅ Verificação concluída: ${result.count} anúncios ativos`);
        
        res.json({
          success: true,
          activeAds: result.count,
          message: 'Biblioteca verificada com sucesso'
        });
      } else {
        res.status(500).json({ 
          error: 'Erro na verificação',
          message: result.error 
        });
      }
    } else {
      res.status(500).json({ 
        error: 'Nenhum resultado obtido' 
      });
    }
    
  } catch (error) {
    console.error('Erro ao verificar biblioteca:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

app.post('/api/monitor/daily', async (req, res) => {
  try {
    console.log('🚀 Executando monitoramento diário...');
    
    // Carregar bibliotecas existentes
    const librariesFile = path.join(__dirname, 'data', 'libraries.json');
    let libraries = [];
    
    if (await fs.pathExists(librariesFile)) {
      libraries = await fs.readJson(librariesFile);
    }
    
    if (libraries.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma biblioteca para verificar',
        checked: 0
      });
    }
    
    // Executar verificação em lote
    const urls = libraries.map(lib => lib.url);
    const results = await runBatch({ urls, country: DEFAULT_COUNTRY });
    
    if (results && results.length > 0) {
      // Atualizar bibliotecas com resultados
      for (let i = 0; i < libraries.length && i < results.length; i++) {
        const result = results[i];
        if (!result.error) {
          libraries[i].lastActiveAds = result.count;
          libraries[i].lastUpdate = new Date().toISOString();
          libraries[i].status = 'active';
        } else {
          libraries[i].status = 'error';
        }
      }
      
      // Guardar atualizações
      await fs.writeJson(librariesFile, libraries, { spaces: 2 });
      
      console.log(`✅ Monitoramento diário concluído: ${results.length} bibliotecas verificadas`);
      
      res.json({
        success: true,
        message: 'Monitoramento diário concluído',
        checked: results.length
      });
    } else {
      res.status(500).json({ 
        error: 'Nenhum resultado obtido' 
      });
    }
    
  } catch (error) {
    console.error('Erro no monitoramento diário:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// Rotas para pastas
app.get('/api/folders', async (req, res) => {
  try {
    const foldersFile = path.join(__dirname, 'data', 'folders.json');
    let folders = [];
    
    if (await fs.pathExists(foldersFile)) {
      folders = await fs.readJson(foldersFile);
    }
    
    res.json(folders);
  } catch (error) {
    console.error('Erro ao carregar pastas:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar pastas',
      message: error.message 
    });
  }
});

app.post('/api/folders', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nome da pasta é obrigatório' });
    }
    
    // Carregar pastas existentes
    const foldersFile = path.join(__dirname, 'data', 'folders.json');
    let folders = [];
    
    if (await fs.pathExists(foldersFile)) {
      folders = await fs.readJson(foldersFile);
    }
    
    // Criar nova pasta
    const newFolder = {
      id: Date.now().toString(),
      name,
      description: description || '',
      count: 0,
      createdAt: new Date().toISOString(),
      order: folders.length
    };
    
    // Adicionar à lista
    folders.push(newFolder);
    
    // Guardar no ficheiro
    await fs.ensureDir(path.dirname(foldersFile));
    await fs.writeJson(foldersFile, folders, { spaces: 2 });
    
    console.log(`✅ Nova pasta criada: ${name}`);
    
    res.json({
      success: true,
      folder: newFolder,
      message: 'Pasta criada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    res.status(500).json({ 
      error: 'Erro ao criar pasta',
      message: error.message 
    });
  }
});

app.put('/api/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nome da pasta é obrigatório' });
    }
    
    // Carregar pastas existentes
    const foldersFile = path.join(__dirname, 'data', 'folders.json');
    let folders = [];
    
    if (await fs.pathExists(foldersFile)) {
      folders = await fs.readJson(foldersFile);
    }
    
    // Encontrar e atualizar pasta
    const folderIndex = folders.findIndex(folder => folder.id === id);
    
    if (folderIndex === -1) {
      return res.status(404).json({ 
        error: 'Pasta não encontrada' 
      });
    }
    
    folders[folderIndex] = { 
      ...folders[folderIndex], 
      name, 
      description: description || '',
      updatedAt: new Date().toISOString()
    };
    
    // Guardar atualizações
    await fs.writeJson(foldersFile, folders, { spaces: 2 });
    
    console.log(`✅ Pasta atualizada: ${name}`);
    
    res.json({
      success: true,
      folder: folders[folderIndex],
      message: 'Pasta atualizada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar pasta:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar pasta',
      message: error.message 
    });
  }
});

app.delete('/api/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Carregar pastas existentes
    const foldersFile = path.join(__dirname, 'data', 'folders.json');
    let folders = [];
    
    if (await fs.pathExists(foldersFile)) {
      folders = await fs.readJson(foldersFile);
    }
    
    // Encontrar e remover pasta
    const folderIndex = folders.findIndex(folder => folder.id === id);
    
    if (folderIndex === -1) {
      return res.status(404).json({ 
        error: 'Pasta não encontrada' 
      });
    }
    
    const removedFolder = folders.splice(folderIndex, 1)[0];
    
    // Guardar lista atualizada
    await fs.writeJson(foldersFile, folders, { spaces: 2 });
    
    console.log(`✅ Pasta removida: ${removedFolder.name}`);
    
    res.json({
      success: true,
      message: 'Pasta removida com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao remover pasta:', error);
    res.status(500).json({ 
      error: 'Erro ao remover pasta',
      message: error.message 
    });
  }
});

app.post('/api/folders/reorder', async (req, res) => {
  try {
    const { folderIds } = req.body;
    
    if (!folderIds || !Array.isArray(folderIds)) {
      return res.status(400).json({ error: 'Lista de IDs de pastas é obrigatória' });
    }
    
    // Carregar pastas existentes
    const foldersFile = path.join(__dirname, 'data', 'folders.json');
    let folders = [];
    
    if (await fs.pathExists(foldersFile)) {
      folders = await fs.readJson(foldersFile);
    }
    
    // Reordenar pastas
    const reorderedFolders = [];
    for (const folderId of folderIds) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        folder.order = reorderedFolders.length;
        reorderedFolders.push(folder);
      }
    }
    
    // Guardar nova ordem
    await fs.writeJson(foldersFile, reorderedFolders, { spaces: 2 });
    
    console.log(`✅ Pastas reordenadas: ${reorderedFolders.length} pastas`);
    
    res.json({
      success: true,
      folders: reorderedFolders,
      message: 'Pastas reordenadas com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao reordenar pastas:', error);
    res.status(500).json({ 
      error: 'Erro ao reordenar pastas',
      message: error.message 
    });
  }
});

// Rotas existentes
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

// Inicialização do scheduler automático (sempre ativo)
console.log('🚀 Iniciando scheduler automático...');

// Carregar bibliotecas para o scheduler
const librariesFile = path.join(__dirname, 'data', 'libraries.json');
let libraries = [];
if (fs.pathExistsSync(librariesFile)) {
  try {
    libraries = fs.readJsonSync(librariesFile);
    console.log(`📚 ${libraries.length} bibliotecas carregadas para monitoramento`);
  } catch (error) {
    console.log('⚠️ Erro ao carregar bibliotecas:', error.message);
  }
}

// Extrair URLs das bibliotecas
const libraryUrls = libraries.map(lib => lib.url).filter(url => url);

// Rota de teste para scraping manual (sem autenticação para debug)
app.post('/api/test-scraping', async (req, res) => {
  try {
    console.log('🧪 Teste de scraping manual iniciado...');
    
    if (libraryUrls.length === 0) {
      return res.json({ error: 'Nenhuma URL para testar' });
    }
    
    // Testar apenas a primeira URL
    const testUrl = libraryUrls[0];
    console.log(`🧪 Testando URL: ${testUrl}`);
    
    const result = await getCountFromUrl(testUrl);
    console.log('🧪 Resultado do teste:', result);
    
    res.json({
      success: true,
      url: testUrl,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de scraping:', error);
    res.status(500).json({ 
      error: 'Erro no teste de scraping',
      message: error.message 
    });
  }
});



startScheduler({ 
  cronExpr: '*/5 * * * *', // A cada 5 minutos
  pageIds: PAGE_IDS, 
  urls: libraryUrls, 
  country: DEFAULT_COUNTRY 
});

console.log('✅ Scheduler automático iniciado');
console.log('🔄 Verificação automática a cada 5 minutos');
console.log(`📊 Monitorando ${libraryUrls.length} bibliotecas`);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponível em http://localhost:${PORT}`);
  console.log(`⏰ Scheduler: ${process.env.CRON_ENABLED === 'true' ? 'HABILITADO' : 'DESABILITADO'}`);
  if (process.env.CRON_ENABLED === 'true') {
    console.log(`🔄 Cron: ${process.env.CRON_SCHEDULE || '*/15 * * * *'}`);
  }
});
