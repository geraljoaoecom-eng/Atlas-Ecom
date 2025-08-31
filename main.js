const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

// Manter referência global da janela
let mainWindow;

function createWindow() {
  // Criar janela do browser
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false
  });

  // Carregar o arquivo HTML principal
  mainWindow.loadFile('public/index.html');

  // Mostrar a janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Verificar se o Playwright está instalado
    checkPlaywrightInstallation();
  });

  // Abrir DevTools em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Limpar quando a janela for fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Verificar instalação do Playwright
async function checkPlaywrightInstallation() {
  try {
    const playwrightPath = path.join(__dirname, 'node_modules', 'playwright');
    if (!fs.pathExistsSync(playwrightPath)) {
      console.log('🔍 Playwright não encontrado, instalando...');
      await installPlaywright();
    } else {
      console.log('✅ Playwright já está instalado');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar Playwright:', error);
  }
}

// Instalar Playwright
async function installPlaywright() {
  try {
    console.log('🚀 Instalando Playwright...');
    
    // Mostrar progresso na interface
    mainWindow.webContents.send('playwright-status', {
      status: 'installing',
      message: 'Instalando Playwright...'
    });
    
    // Instalar Playwright
    execSync('npx playwright install --with-deps', { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    console.log('✅ Playwright instalado com sucesso!');
    
    // Notificar interface
    mainWindow.webContents.send('playwright-status', {
      status: 'installed',
      message: 'Playwright instalado com sucesso!'
    });
    
  } catch (error) {
    console.error('❌ Erro ao instalar Playwright:', error);
    
    // Notificar erro na interface
    mainWindow.webContents.send('playwright-status', {
      status: 'error',
      message: 'Erro ao instalar Playwright: ' + error.message
    });
  }
}

// Criar menu da aplicação
function createMenu() {
  const template = [
    {
      label: 'Atlas Ecom',
      submenu: [
        {
          label: 'Sobre Atlas Ecom',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Preferências...',
          accelerator: 'Cmd+,',
          click: () => {
            // Abrir preferências
          }
        },
        { type: 'separator' },
        {
          label: 'Serviços',
          role: 'services',
          submenu: []
        },
        { type: 'separator' },
        {
          label: 'Ocultar Atlas Ecom',
          accelerator: 'Cmd+H',
          role: 'hide'
        },
        {
          label: 'Ocultar Outros',
          accelerator: 'Cmd+Alt+H',
          role: 'hideothers'
        },
        {
          label: 'Mostrar Tudo',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'Cmd+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', accelerator: 'Cmd+Z', role: 'undo' },
        { label: 'Refazer', accelerator: 'Shift+Cmd+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', accelerator: 'Cmd+X', role: 'cut' },
        { label: 'Copiar', accelerator: 'Cmd+C', role: 'copy' },
        { label: 'Colar', accelerator: 'Cmd+V', role: 'paste' },
        { label: 'Selecionar Tudo', accelerator: 'Cmd+A', role: 'selectall' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recarregar', accelerator: 'Cmd+R', role: 'reload' },
        { label: 'Forçar Recarregar', accelerator: 'Cmd+Shift+R', role: 'forceReload' },
        { label: 'Ferramentas de Desenvolvedor', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Zoom Real', accelerator: 'Cmd+0', role: 'resetZoom' },
        { label: 'Aumentar Zoom', accelerator: 'Cmd+Plus', role: 'zoomIn' },
        { label: 'Diminuir Zoom', accelerator: 'Cmd+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Alternar Barra de Ferramentas', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Janela',
      submenu: [
        { label: 'Minimizar', accelerator: 'Cmd+M', role: 'minimize' },
        { label: 'Fechar', accelerator: 'Cmd+W', role: 'close' },
        { type: 'separator' },
        { label: 'Trazer Todos para Frente', role: 'front' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Documentação',
          click: () => {
            require('electron').shell.openExternal('https://github.com/geraljoaoecom-eng/Atlas-Ecom');
          }
        },
        {
          label: 'Reportar Bug',
          click: () => {
            require('electron').shell.openExternal('https://github.com/geraljoaoecom-eng/Atlas-Ecom/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'Sobre',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sobre Atlas Ecom',
              message: 'Atlas Ecom - Monitor Inteligente de Bibliotecas Facebook Ads',
              detail: 'Versão 1.0.0\n\nMonitor automático de bibliotecas do Facebook Ads Library com scraping em tempo real.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Eventos da aplicação
app.whenReady().then(() => {
  createWindow();
  createMenu();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers para comunicação com o renderer
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

ipcMain.handle('install-playwright', async () => {
  await installPlaywright();
});

// Prevenir múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Alguém tentou executar uma segunda instância, devemos focar nossa janela
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
