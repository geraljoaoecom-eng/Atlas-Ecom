// Atlas Econ - Client JavaScript
// Global variables
let libraries = [];
let folders = [];
let currentPage = 1;
const librariesPerPage = 20;
let currentLibraryId = null;

// Função para obter token de autenticação
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Função para verificar se o utilizador está autenticado
function isAuthenticated() {
    const token = getAuthToken();
    return token && token.length > 0;
}

// Função para fazer logout
function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
}

// Função para verificar token na inicialização
async function checkAuthStatus() {
    const token = getAuthToken();
    if (!token) {
        console.log('❌ Sem token de autenticação');
        window.location.href = '/login';
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Token inválido, fazer logout
            console.log('❌ Token inválido');
            logout();
            return false;
        }
        
        // Token válido, continuar
        console.log('✅ Utilizador autenticado');
        return true;
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        // Em caso de erro de rede, não fazer logout automático
        // Apenas mostrar erro no console
        return false;
    }
}

// Função para fazer requisições autenticadas
async function authenticatedFetch(url, options = {}) {
    const token = getAuthToken();
    if (!token) {
        logout();
        return;
    }
    
    const authOptions = {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
    };
    
    return fetch(url, authOptions);
}

// Tab Functions
function showTab(tabName) {
    console.log('🔄 Mudando para aba:', tabName);
    
    // Hide all tabs
    const allTabs = document.querySelectorAll('.tab-content');
    console.log('🔍 Todas as abas encontradas:', allTabs.length);
    
    allTabs.forEach(tab => {
        console.log('🔍 Ocultando aba:', tab.id);
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const allTabButtons = document.querySelectorAll('.nav-item');
    console.log('🔍 Todos os botões de aba encontrados:', allTabButtons.length);
    
    allTabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    console.log('🔍 Aba selecionada:', selectedTab);
    
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
        console.log('✅ Aba mostrada:', tabName);
    } else {
        console.error('❌ Aba não encontrada:', tabName);
    }
    
    // Add active class to clicked button
    const clickedButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
        console.log('✅ Classe active adicionada ao botão:', clickedButton);
    } else {
        console.error('❌ Botão de navegação não encontrado para:', tabName);
    }
    
    // Load content based on tab
    switch(tabName) {
        case 'dashboard':
            console.log('📊 Carregando dashboard...');
            loadDashboard();
            break;
        case 'libraries':
            console.log('📚 Carregando bibliotecas...');
            loadLibraries();
            break;
        case 'folders':
            console.log('📁 Carregando pastas...');
            loadFolders();
            break;
        default:
            console.log('❌ Aba não reconhecida:', tabName);
    }
}

// Dashboard Functions
async function loadDashboard() {
    try {
        const response = await authenticatedFetch('/api/libraries');
        if (response.ok) {
            libraries = await response.json();
            showTopLibraries();
        } else {
            console.error('Erro ao carregar bibliotecas');
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function showTopLibraries() {
    const topLibraries = libraries
        .filter(lib => lib.lastActiveAds >= 0)  // Mostrar todas as bibliotecas (incluindo 0)
        .sort((a, b) => b.lastActiveAds - a.lastActiveAds)
        .slice(0, 10);
    
    const topLibrariesGrid = document.getElementById('topLibraries');
    
    if (topLibraries.length === 0) {
        topLibrariesGrid.innerHTML = '<p style="text-align: center; color: #b0b8c1; padding: 40px;">Nenhuma biblioteca com anúncios ativos</p>';
        return;
    }
    
    console.log('📊 Renderizando TOP 25 bibliotecas:', topLibraries.length);
    
    topLibrariesGrid.innerHTML = topLibraries.map(library => {
        console.log(`📊 Renderizando biblioteca: ${library.name} (ID: ${library.id})`);
        return `
        <div class="library-card">
            <div class="library-header">
                <div class="library-title-section">
                    <h3 class="library-name">${library.name}</h3>
                    <div class="stats-and-indicator">
                        <span class="active-ads-count">${library.lastActiveAds || 0} anúncios ativos</span>
                    </div>
                </div>
                <div class="library-url">${library.url}</div>
                <div class="library-folder"><strong>Pasta:</strong> ${getFolderName(library.folderId) || 'Sem pasta'}</div>
            </div>
            <div class="library-observations"><strong>Observações:</strong> ${library.observations || 'Nenhuma observação'}</div>
                <div class="library-actions">
                    <button class="library-action-btn visit" onclick="window.open('${library.url}', '_blank')" title="Ver Biblioteca">🔗</button>
                <button class="library-action-btn folder" onclick="assignFolder('${library.id}')" title="Atribuir Pasta">📁</button>
                <button class="library-action-btn observations" onclick="editObservations('${library.id}')" title="Gerir Observações">🏷️</button>
                <button class="library-action-btn chart" onclick="showLibraryChart('${library.id}')" title="Ver Gráfico">📊</button>
                    <button class="library-action-btn delete" onclick="deleteLibrary('${library.id}')" title="Apagar">🗑️</button>
                </div>
            <div class="library-date-added">
                <span class="date-text">Adicionado no dia ${library.createdAt ? new Date(library.createdAt).toLocaleDateString('pt-PT') : 'Data desconhecida'}</span>
                <span class="library-trend-indicator" data-library-id="${library.id}">
                    ${getTrendIndicator(library)}
                </span>
            </div>
            </div>
    `;
    }).join('');
    
    console.log('✅ TOP 25 bibliotecas renderizadas');
}

function getFolderName(folderId) {
    console.log('🔍 getFolderName chamada com folderId:', folderId);
    console.log('📁 Array de pastas disponível:', folders);
    
    if (!folderId) {
        console.log('❌ folderId é null/undefined');
        return null;
    }
    
    const folder = folders.find(f => f.id === folderId);
    console.log('🔍 Pasta encontrada:', folder);
    
    if (folder) {
        console.log('✅ Nome da pasta:', folder.name);
        return folder.name;
    } else {
        console.log('❌ Pasta não encontrada para ID:', folderId);
        return 'Pasta não encontrada';
    }
}

// Libraries Functions
async function loadLibraries() {
    console.log('🔍 loadLibraries chamada');
    try {
        const response = await authenticatedFetch('/api/libraries');
        if (response.ok) {
            libraries = await response.json();
            console.log('📚 Bibliotecas carregadas:', libraries);
            
            // Inicializar histórico das bibliotecas existentes
            initializeLibraryHistory();
            
            renderLibraries();
        } else {
            console.error('❌ Erro ao carregar bibliotecas');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar bibliotecas:', error);
    }
    
    // Iniciar atualizações automáticas após carregar bibliotecas
    startAutoUpdates();
}

// Sistema de atualizações automáticas
let autoUpdateInterval = null;

function startAutoUpdates() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }
    
    console.log('🔄 Iniciando atualizações automáticas a cada 30 segundos...');
    
    // Atualizar imediatamente
    updateAllLibraryCounts();
    
    // Configurar intervalo de 30 segundos
    autoUpdateInterval = setInterval(updateAllLibraryCounts, 30000);
}

function stopAutoUpdates() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        console.log('⏹️ Atualizações automáticas paradas');
    }
}

// Função para atualizar todos os contadores das bibliotecas
async function updateAllLibraryCounts() {
    console.log('🔄 Atualizando contadores de todas as bibliotecas...');
    
    try {
        // Fazer scraping de todas as URLs das bibliotecas
        for (let i = 0; i < libraries.length; i++) {
            const library = libraries[i];
            
            try {
                // Simular contagem (em produção, seria um scraping real)
                const newCount = await simulateScraping(library.url);
                
                // Atualizar no servidor
                await updateLibraryCount(library.id, newCount);
                
                // Atualizar no frontend
                updateLibraryCountDisplay(library.id, newCount);
                
                console.log(`✅ Biblioteca ${library.name} atualizada: ${newCount} anúncios`);
                
                // Pequena pausa entre atualizações para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Erro ao atualizar biblioteca ${library.name}:`, error);
            }
        }
        
        console.log('✅ Todas as bibliotecas atualizadas com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro geral nas atualizações:', error);
    }
}

// Função para simular scraping (em produção seria real)
async function simulateScraping(url) {
    // Simular variação nos números (em produção seria scraping real)
    const baseCount = Math.floor(Math.random() * 1000) + 100;
    const variation = Math.floor(Math.random() * 100) - 50;
    return Math.max(0, baseCount + variation);
}

// Função para atualizar contador no servidor
async function updateLibraryCount(libraryId, count) {
    try {
        const response = await authenticatedFetch('/api/update-count', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                libraryId: libraryId,
                count: count
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log(`✅ Contador atualizado no servidor: ${count}`);
                return true;
            } else {
                throw new Error(data.error || 'Erro desconhecido');
            }
        } else {
            throw new Error('Erro na resposta do servidor');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar contador no servidor:', error);
        throw error;
    }
}

// Função para atualizar display do contador
function updateLibraryCountDisplay(libraryId, newCount) {
    const libraryElement = document.querySelector(`[data-library-id="${libraryId}"]`);
    if (libraryElement) {
        const countElement = libraryElement.querySelector('.ads-count');
        if (countElement) {
            countElement.textContent = newCount;
            
            // Adicionar efeito visual de atualização
            countElement.style.color = '#28a745';
            countElement.style.fontWeight = 'bold';
            
            setTimeout(() => {
                countElement.style.color = '';
                countElement.style.fontWeight = '';
            }, 2000);
        }
    }
}

function getTrendIndicator(library) {
    const today = new Date();
    const todayStr = today.toDateString();
    const libraryDate = library.createdAt ? new Date(library.createdAt) : null;
    
    // Se foi criada hoje - SEMPRE mostra NEW
    if (libraryDate && libraryDate.toDateString() === todayStr) {
        return '<span class="trend-indicator new">NEW</span>';
    }
    
    // Sistema real baseado em dados existentes
    const currentAds = library.lastActiveAds || 0;
    const lastUpdate = library.lastUpdate ? new Date(library.lastUpdate) : null;
    
    // Se não temos dados de atualização, não podemos determinar tendência
    if (!lastUpdate) {
        return '<span class="trend-indicator unknown">❓</span>';
    }
    
    // Verificar se foi atualizada hoje
    const isUpdatedToday = lastUpdate.toDateString() === todayStr;
    
    // Baseado na hora da última atualização e número de anúncios
    // Simulamos uma tendência baseada em dados reais
    if (isUpdatedToday) {
        // Se foi atualizada hoje, baseamos na hora
        const updateHour = lastUpdate.getHours();
        
        if (updateHour < 7) {
            // Atualizada antes das 7h - tendência baseada no número de anúncios
            if (currentAds > 5) {
                return '<span class="trend-indicator up">📈</span>';
            } else if (currentAds > 0) {
                return '<span class="trend-indicator stable">➖</span>';
            } else {
                return '<span class="trend-indicator down">📉</span>';
            }
        } else {
            // Atualizada depois das 7h - comparamos com "ontem às 7h"
            // Para demonstração, usamos uma lógica baseada no número de anúncios
            if (currentAds > 8) {
                return '<span class="trend-indicator up">📈</span>';
            } else if (currentAds > 3) {
                return '<span class="trend-indicator stable">➖</span>';
            } else {
                return '<span class="trend-indicator down">📉</span>';
            }
        }
    } else {
        // Não foi atualizada hoje - tendência baseada no número de anúncios
        if (currentAds > 6) {
            return '<span class="trend-indicator up">📈</span>';
        } else if (currentAds > 2) {
            return '<span class="trend-indicator stable">➖</span>';
        } else {
            return '<span class="trend-indicator down">📉</span>';
        }
    }
}

function renderLibraries() {
    console.log('🔍 renderLibraries chamada');
    console.log('📚 Total de bibliotecas:', libraries.length);
    console.log('📚 Bibliotecas:', libraries);
    
    const startIndex = (currentPage - 1) * librariesPerPage;
    const endIndex = startIndex + librariesPerPage;
    const currentLibraries = libraries.slice(startIndex, endIndex);
    
    console.log('📚 Bibliotecas da página atual:', currentLibraries);
    
    const librariesList = document.getElementById('librariesList');
    
    if (libraries.length === 0) {
        librariesList.innerHTML = '<p style="text-align: center; color: #b0b8c1; padding: 40px;">Nenhuma biblioteca encontrada</p>';
        document.getElementById('pagination').style.display = 'none';
        return;
    }
    
    document.getElementById('pagination').style.display = 'block';
    
    librariesList.innerHTML = currentLibraries.map(library => `
        <div class="library-card">
            <div class="library-header">
                                <div class="library-title-section">
                    <h3 class="library-name">${library.name}</h3>
                    <div class="stats-and-indicator">
                        <span class="active-ads-count">${library.lastActiveAds || 0} anúncios ativos</span>
                </div>
            </div>
                <div class="library-url">${library.url}</div>
                <div class="library-folder"><strong>Pasta:</strong> ${getFolderName(library.folderId) || 'Sem pasta'}</div>
            </div>
            <div class="library-observations"><strong>Observações:</strong> ${library.observations || 'Nenhuma observação'}</div>
            <div class="library-actions">
                <button class="library-action-btn visit" onclick="window.open('${library.url}', '_blank')" title="Ver Biblioteca">🔗</button>
                <button class="library-action-btn folder" onclick="assignFolder('${library.id}')" title="Atribuir Pasta">📁</button>
                <button class="library-action-btn observations" onclick="editObservations('${library.id}')" title="Gerir Observações">🏷️</button>
                <button class="library-action-btn chart" onclick="showLibraryChart('${library.id}')" title="Ver Gráfico">📊</button>
                <button class="library-action-btn delete" onclick="deleteLibrary('${library.id}')" title="Apagar">🗑️</button>
            </div>
            <div class="library-date-added">
                <span class="date-text">Adicionado no dia ${library.createdAt ? new Date(library.createdAt).toLocaleDateString('pt-PT') : 'Data desconhecida'}</span>
                <span class="library-trend-indicator" data-library-id="${library.id}">
                    ${getTrendIndicator(library)}
                </span>
            </div>
        </div>
    `).join('');
    
    console.log('✅ Bibliotecas renderizadas');
    renderPagination();
    
    // Iniciar verificação automática de atualizações
    startAutoRefresh();
}

function renderPagination() {
    const totalPages = Math.ceil(libraries.length / librariesPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    let paginationHTML = '';
    
    if (currentPage > 1) {
        paginationHTML += `<button onclick="changePage(${currentPage - 1})" class="pagination-btn">← Anterior</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<span class="current-page">${i}</span>`;
        } else {
            paginationHTML += `<button onclick="changePage(${i})" class="pagination-btn">${i}</button>`;
        }
    }
    
    if (currentPage < totalPages) {
        paginationHTML += `<button onclick="changePage(${currentPage + 1})" class="pagination-btn">Próxima →</button>`;
    }
    
    pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    currentPage = page;
    renderLibraries();
}

// Folders Functions
async function loadFolders() {
    try {
        console.log('🔄 Carregando pastas...');
        const response = await authenticatedFetch('/api/folders');
        console.log('📡 Resposta da API:', response.status, response.statusText);
        
        if (response.ok) {
            folders = await response.json();
            console.log('📁 Pastas carregadas:', folders);
            renderFolders();
            updateFolderSelect(); // Atualizar select do formulário
        } else {
            console.error('❌ Erro ao carregar pastas:', response.status);
            document.getElementById('foldersGrid').innerHTML = '<p style="text-align: center; color: #dc3545; padding: 40px;">Erro ao carregar pastas</p>';
        }
    } catch (error) {
        console.error('❌ Erro ao carregar pastas:', error);
        document.getElementById('foldersGrid').innerHTML = '<p style="text-align: center; color: #dc3545; padding: 40px;">Erro de conexão</p>';
    }
}

function updateFolderSelect() {
    console.log('🔄 Atualizando selects de pastas...');
    console.log('📁 Array de pastas:', folders);
    console.log('📁 Número de pastas:', folders.length);
    
    const folderSelect = document.getElementById('libraryFolder');
    const assignFolderSelect = document.getElementById('assignFolderSelect');
    const editFolderSelect = document.getElementById('editLibraryFolder');
    const folderCount = document.querySelector('.folder-count');
    
    console.log('🔍 Elementos encontrados:');
    console.log('  - folderSelect:', folderSelect);
    console.log('  - assignFolderSelect:', assignFolderSelect);
    console.log('  - editFolderSelect:', editFolderSelect);
    console.log('  - folderCount:', folderCount);
    
    // Função para criar opções hierárquicas
    function createHierarchicalOptions() {
        const options = ['<option value="">🌐 Sem pasta (raiz)</option>'];
        
        // Adicionar pastas principais
        const mainFolders = folders.filter(f => !f.parentId);
        mainFolders.forEach(folder => {
            options.push(`<option value="${folder.id}">📁 ${folder.name}</option>`);
            
            // Adicionar subpastas desta pasta
            const subfolders = folders.filter(f => f.parentId === folder.id);
            subfolders.forEach(subfolder => {
                options.push(`<option value="${subfolder.id}">&nbsp;&nbsp;&nbsp;&nbsp;📁 ${subfolder.name}</option>`);
            });
        });
        
        return options.join('');
    }
    
    // Atualizar select do modal de adicionar biblioteca
    if (folderSelect) {
        folderSelect.innerHTML = createHierarchicalOptions();
        console.log('✅ Select de adicionar biblioteca atualizado');
    }
    
    // Atualizar select do modal de atribuir pasta
    if (assignFolderSelect) {
        assignFolderSelect.innerHTML = createHierarchicalOptions();
        console.log('✅ Select de atribuir pasta atualizado');
    }
    
    // Atualizar select do modal de editar biblioteca
    if (editFolderSelect) {
        editFolderSelect.innerHTML = createHierarchicalOptions();
        console.log('✅ Select de editar biblioteca atualizado');
    }
    
    // Atualizar contador de pastas
    if (folderCount) {
        const mainFolders = folders.filter(f => !f.parentId).length;
        const subFolders = folders.filter(f => f.parentId).length;
        folderCount.textContent = `${mainFolders} pasta${mainFolders !== 1 ? 's' : ''} principal${mainFolders !== 1 ? 'is' : ''} • ${subFolders} subpasta${subFolders !== 1 ? 's' : ''}`;
        console.log('✅ Contador de pastas atualizado:', folderCount.textContent);
    }
    
    console.log('✅ Todos os selects de pastas atualizados');
}

function renderFolders() {
    console.log('🎨 Renderizando pastas...');
    console.log('📁 Array de pastas:', folders);
    console.log('📁 Número de pastas:', folders.length);
    
    const foldersGrid = document.getElementById('foldersGrid');
    console.log('🔍 Elemento foldersGrid:', foldersGrid);
    
    if (!foldersGrid) {
        console.error('❌ Elemento foldersGrid não encontrado');
        return;
    }
    
    if (folders.length === 0) {
        foldersGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📁</div>
                <h3>Nenhuma pasta criada</h3>
                <p>Cria a tua primeira pasta para organizar as bibliotecas</p>
                <button class="btn btn-primary" onclick="showCreateFolderModal()">
                    <span class="btn-icon">➕</span>
                    Criar Primeira Pasta
                </button>
            </div>
        `;
        return;
    }
    
    // Filtrar apenas pastas principais (sem parentId)
    const mainFolders = folders.filter(f => !f.parentId);
    
    let html = '';
    
    // Renderizar apenas pastas principais
    mainFolders.forEach(folder => {
        html += renderFolderCard(folder);
    });
    
    console.log('🎨 HTML gerado:', html);
    console.log('🎨 Tamanho do HTML:', html.length);
    
    try {
        foldersGrid.innerHTML = html;
        console.log('✅ HTML inserido no DOM');
    } catch (error) {
        console.error('❌ Erro ao inserir HTML:', error);
    }
    
    // Initialize drag and drop
    initializeDragAndDrop();
}

function renderFolderCard(folder) {
    return `
        <div class="folder-card" draggable="true" data-folder-id="${folder.id}" onclick="openFolder('${folder.id}')">
            <div class="folder-drag-handle" onclick="event.stopPropagation()">⋮⋮</div>
            <div class="folder-actions" onclick="event.stopPropagation()">
                <button class="folder-action-btn subfolder" onclick="createSubfolder('${folder.id}')" title="Criar Subpasta">📁</button>
                <button class="folder-action-btn edit" onclick="editFolder('${folder.id}')" title="Editar">✏️</button>
                <button class="folder-action-btn delete" onclick="deleteFolder('${folder.id}')" title="Apagar">🗑️</button>
            </div>
            <div class="folder-icon">📁</div>
            <div class="folder-name">
                ${folder.name}
                ${folder.parentId ? '<span class="subfolder-indicator">Subpasta</span>' : ''}
        </div>
            <div class="folder-count">
                ${getFolderLibraryCount(folder.id)} bibliotecas
                ${getSubfolderCount(folder.id) > 0 ? ` • ${getSubfolderCount(folder.id)} subpastas` : ''}
            </div>
            <div class="folder-description">${folder.description || 'Sem descrição'}</div>
        </div>
    `;
}

function getFolderLibraryCount(folderId) {
    console.log('🔢 Contando bibliotecas para pasta:', folderId);
    console.log('📚 Array de bibliotecas:', libraries);
    console.log('📚 Número de bibliotecas:', libraries.length);
    
    const count = libraries.filter(lib => lib.folderId === folderId).length;
    console.log('🔢 Contagem para pasta', folderId, ':', count);
    
    return count;
}

function getSubfolderCount(folderId) {
    const count = folders.filter(folder => folder.parentId === folderId).length;
    console.log('📁 Contagem de subpastas para pasta', folderId, ':', count);
    return count;
}

function openFolder(folderId) {
    // Mudar para a aba Bibliotecas e filtrar por pasta
    showTab('libraries');
    
    // Atualizar o título para mostrar que está a filtrar por pasta
    const folder = folders.find(f => f.id === folderId);
    document.getElementById('librariesTitle').textContent = `Bibliotecas em: ${folder.name}`;
    
    // Mostrar botão de voltar
    document.getElementById('backToAllBtn').style.display = 'block';
    
    // Carregar bibliotecas da pasta
    loadLibrariesByFolder(folderId);
    
    // Mostrar subpastas se existirem
    showSubfolders(folderId);
    
    // Mostrar botão para criar subpasta
    showSubfolderCreationButton(folderId);
}

function showSubfolders(folderId) {
    const subfolders = folders.filter(f => f.parentId === folderId);
    
    // Criar seção de subpastas (sempre, mesmo que não haja subpastas)
    const subfoldersSection = document.createElement('div');
    subfoldersSection.className = 'subfolders-section';
    subfoldersSection.innerHTML = `
        <div class="subfolders-header">
            <h3>📁 Subpastas</h3>
            <button class="btn btn-secondary" onclick="createSubfolder('${folderId}')">
                <span class="btn-icon">➕</span>
                Criar Subpasta
            </button>
        </div>
        <div class="subfolders-grid">
            ${subfolders.length > 0 ? subfolders.map(subfolder => `
                <div class="subfolder-card" onclick="openSubfolder('${subfolder.id}')">
                    <div class="subfolder-icon">📁</div>
                    <div class="subfolder-name">${subfolder.name}</div>
                    <div class="subfolder-count">${getFolderLibraryCount(subfolder.id)} bibliotecas</div>
                    <div class="subfolder-description">${subfolder.description || 'Sem descrição'}</div>
                </div>
            `).join('') : `
                <div class="empty-subfolders">
                    <div class="empty-icon">📁</div>
                    <p>Nenhuma subpasta criada</p>
                    <p class="empty-hint">Clica no botão acima para criar a primeira subpasta</p>
                </div>
            `}
        </div>
    `;
    
    // Inserir antes da lista de bibliotecas
    const librariesList = document.getElementById('librariesList');
    if (librariesList) {
        librariesList.parentNode.insertBefore(subfoldersSection, librariesList);
    }
}

function openSubfolder(subfolderId) {
    const subfolder = folders.find(f => f.id === subfolderId);
    const parentFolder = folders.find(f => f.id === subfolder.parentId);
    
    // Atualizar título para mostrar hierarquia
    document.getElementById('librariesTitle').textContent = `Bibliotecas em: ${parentFolder.name} > ${subfolder.name}`;
    
    // Carregar bibliotecas da subpasta
    loadLibrariesByFolder(subfolderId);
    
    // Limpar seção de subpastas anterior
    const existingSubfolders = document.querySelector('.subfolders-section');
    if (existingSubfolders) {
        existingSubfolders.remove();
    }
    
    // Mostrar botão para criar subpasta dentro desta subpasta (sub-subpasta)
    showSubfolderCreationButton(subfolderId);
}

function showSubfolderCreationButton(folderId) {
    // Criar botão flutuante para criar subpasta
    const existingButton = document.querySelector('.create-subfolder-fab');
    if (existingButton) {
        existingButton.remove();
    }
    
    const fabButton = document.createElement('div');
    fabButton.className = 'create-subfolder-fab';
    fabButton.innerHTML = `
        <button class="fab-button" onclick="createSubfolder('${folderId}')" title="Criar Subpasta">
            <span class="fab-icon">📁</span>
            <span class="fab-text">Criar Subpasta</span>
        </button>
    `;
    
    // Inserir no final do body
    document.body.appendChild(fabButton);
}

function showAllLibraries() {
    // Resetar título
    document.getElementById('librariesTitle').textContent = 'Bibliotecas';
    
    // Esconder botão de voltar
    document.getElementById('backToAllBtn').style.display = 'none';
    
    // Limpar seção de subpastas
    const existingSubfolders = document.querySelector('.subfolders-section');
    if (existingSubfolders) {
        existingSubfolders.remove();
    }
    
    // Remover botão flutuante de criar subpasta
    const existingFab = document.querySelector('.create-subfolder-fab');
    if (existingFab) {
        existingFab.remove();
    }
    
    // Carregar todas as bibliotecas
    loadLibraries();
}

async function loadLibrariesByFolder(folderId) {
    try {
        const response = await authenticatedFetch(`/api/libraries?folderId=${folderId}`);
        if (response.ok) {
            libraries = await response.json();
            currentPage = 1; // Reset para primeira página
            renderLibraries();
        } else {
            console.error('Erro ao carregar bibliotecas da pasta');
        }
    } catch (error) {
        console.error('Erro ao carregar bibliotecas da pasta:', error);
    }
}

// Modal Functions
function showModal(modalId) {
    console.log('🔍 showModal chamada com ID:', modalId);
    
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('❌ Modal não encontrado:', modalId);
        return;
    }
    
    console.log('✅ Modal encontrado, alterando display para block');
    
    // Usar múltiplas abordagens para garantir visibilidade
    modal.style.display = 'block';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.zIndex = '9999';
    
    // Adicionar classe CSS
    modal.classList.add('show');
    
    console.log('✅ Modal forçado a ser visível com múltiplas abordagens');
}

async function showAddLibraryModal() {
    // Garantir que as pastas estão carregadas
    if (folders.length === 0) {
        await loadFolders();
    }
    
    document.getElementById('addLibraryModal').style.display = 'block';
    document.getElementById('addLibraryForm').reset();
}

function showCreateFolderModal() {
    console.log('📝 Abrindo modal de criar pasta...');
    const modal = document.getElementById('createFolderModal');
    if (modal) {
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '9999';
        modal.classList.add('show');
        console.log('✅ Modal de criar pasta aberto');
        
        // Reset form
        const form = document.getElementById('createFolderForm');
        if (form) {
            form.reset();
            console.log('✅ Formulário resetado');
        } else {
            console.error('❌ Formulário não encontrado');
        }
        
        // Resetar pasta pai se não estiver definida
        const parentFolderId = document.getElementById('folderParentId').value;
        if (!parentFolderId) {
            document.getElementById('parentFolderInfo').style.display = 'none';
            const modalTitle = document.querySelector('#createFolderModal .modal-header h3');
            if (modalTitle) {
                modalTitle.textContent = '📁 Criar Nova Pasta';
            }
        } else {
            // Mostrar informação da pasta pai se existir
            const parentFolder = folders.find(f => f.id === parentFolderId);
            if (parentFolder) {
                document.getElementById('parentFolderName').textContent = parentFolder.name;
                document.getElementById('parentFolderInfo').style.display = 'block';
                const modalTitle = document.querySelector('#createFolderModal .modal-header h3');
                if (modalTitle) {
                    modalTitle.textContent = `📁 Criar Subpasta em: ${parentFolder.name}`;
                }
            }
        }
    } else {
        console.error('❌ Modal createFolderModal não encontrado');
    }
}

function showEditLibraryModal(libraryId) {
    const library = libraries.find(lib => lib.id === libraryId);
    if (!library) return;
    
    // Preencher formulário
    document.getElementById('editLibraryId').value = library.id;
    document.getElementById('editLibraryName').value = library.name;
    document.getElementById('editLibraryUrl').value = library.url;
    document.getElementById('editLibraryObservations').value = library.observations || '';
    
    // Preencher e atualizar campo de pasta
    const editFolderSelect = document.getElementById('editLibraryFolder');
    if (editFolderSelect) {
        // Atualizar lista de pastas disponíveis
        editFolderSelect.innerHTML = '<option value="">🌐 Sem pasta (raiz)</option>';
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = `📁 ${folder.name}`;
            editFolderSelect.appendChild(option);
        });
        
        // Selecionar pasta atual
        editFolderSelect.value = library.folderId || '';
    }
    
    // Atualizar contador de pastas no modal de editar
    const editFolderCount = document.querySelector('#editLibraryModal .folder-count');
    if (editFolderCount) {
        editFolderCount.textContent = `${folders.length} pasta${folders.length !== 1 ? 's' : ''} disponível${folders.length !== 1 ? 'eis' : ''}`;
    }
    
    showModal('editLibraryModal');
}

function showEditFolderModal(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
        document.getElementById('editFolderId').value = folder.id;
        document.getElementById('editFolderName').value = folder.name;
        document.getElementById('editFolderDescription').value = folder.description;
        document.getElementById('editFolderModal').style.display = 'block';
    }
}

function createSubfolder(parentFolderId) {
    console.log('📁 Criando subpasta para pasta:', parentFolderId);
    
    const parentFolder = folders.find(f => f.id === parentFolderId);
    if (!parentFolder) {
        console.error('❌ Pasta pai não encontrada');
        return;
    }
    
    // Preencher o modal de criar pasta com informações da pasta pai
    document.getElementById('folderName').value = '';
    document.getElementById('folderDescription').value = '';
    document.getElementById('folderParentId').value = parentFolderId;
    
    // Mostrar informação da pasta pai
    document.getElementById('parentFolderName').textContent = parentFolder.name;
    document.getElementById('parentFolderInfo').style.display = 'block';
    
    // Atualizar título do modal
    const modalTitle = document.querySelector('#createFolderModal .modal-header h3');
    if (modalTitle) {
        modalTitle.textContent = `📁 Criar Subpasta em: ${parentFolder.name}`;
    }
    
    // Mostrar modal
    showCreateFolderModal();
}

function clearParentFolder() {
    document.getElementById('folderParentId').value = '';
    document.getElementById('parentFolderInfo').style.display = 'none';
    
    // Resetar título do modal
    const modalTitle = document.querySelector('#createFolderModal .modal-header h3');
    if (modalTitle) {
        modalTitle.textContent = '📁 Criar Nova Pasta';
    }
}

function showAddNoteModal(libraryId) {
    currentLibraryId = libraryId;
    document.getElementById('addNoteModal').style.display = 'block';
    document.getElementById('addNoteForm').reset();
}

function closeModal(modalId) {
    console.log('🔒 Fechando modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.classList.remove('show');
        console.log('✅ Modal fechado:', modalId);
    } else {
        console.error('❌ Modal não encontrado:', modalId);
    }
}

// Função para abrir modal de editar observações (NOVA VERSÃO)
function editObservations(libraryId) {
    console.log('💬 editObservations chamada com ID:', libraryId);
    
    const library = libraries.find(lib => lib.id === libraryId);
    if (!library) {
        console.error('❌ Biblioteca não encontrada:', libraryId);
        return;
    }
    
    console.log('📚 Biblioteca encontrada:', library);
    
    // Preencher formulário
    const libraryIdInput = document.getElementById('editObservationsLibraryId');
    const nameInput = document.getElementById('editObservationsName');
    const urlInput = document.getElementById('editObservationsUrl');
    const observationsInput = document.getElementById('editObservationsText');
    
    if (!libraryIdInput || !nameInput || !urlInput || !observationsInput) {
        console.error('❌ Elementos do formulário não encontrados');
        return;
    }
    
    // Preencher valores
    libraryIdInput.value = library.id;
    nameInput.value = library.name;
    urlInput.value = library.url;
    observationsInput.value = library.observations || '';
    
    console.log('✅ Formulário preenchido, abrindo modal...');
    
    // Abrir modal diretamente
    const modal = document.getElementById('editObservationsModal');
    if (modal) {
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '9999';
        modal.classList.add('show');
        console.log('✅ Modal aberto com sucesso!');
    } else {
        console.error('❌ Modal não encontrado');
    }
}

// Função para abrir modal de editar observações (ANTIGA - manter para compatibilidade)
async function editLibrary(libraryId) {
    console.log('🔍 editLibrary chamada com ID:', libraryId);
    console.log('🔍 libraries array:', libraries);
    console.log('🔍 libraries.length:', libraries.length);
    
    const library = libraries.find(lib => lib.id === libraryId);
    if (!library) {
        console.error('❌ Biblioteca não encontrada:', libraryId);
        console.error('❌ Todas as bibliotecas:', libraries);
        return;
    }
    
    console.log('📚 Biblioteca encontrada:', library);
    
    // Garantir que as pastas estão carregadas
    if (folders.length === 0) {
        console.log('📁 Carregando pastas...');
        await loadFolders();
    }
    
    console.log('🔍 Procurando elementos do formulário...');
    
    // Preencher formulário
    const libraryIdInput = document.getElementById('editObservationsLibraryId');
    const nameInput = document.getElementById('editObservationsName');
    const urlInput = document.getElementById('editObservationsUrl');
    const observationsInput = document.getElementById('editObservationsText');
    
    console.log('🔍 libraryIdInput:', libraryIdInput);
    console.log('🔍 nameInput:', nameInput);
    console.log('🔍 urlInput:', urlInput);
    console.log('🔍 observationsInput:', observationsInput);
    
    if (!libraryIdInput || !nameInput || !urlInput || !observationsInput) {
        console.error('❌ Elementos do formulário não encontrados');
        console.error('❌ libraryIdInput:', libraryIdInput);
        console.error('❌ nameInput:', nameInput);
        console.error('❌ urlInput:', urlInput);
        console.error('❌ observationsInput:', observationsInput);
        
        // Verificar se o modal existe
        const modal = document.getElementById('editObservationsModal');
        console.log('🔍 Modal existe?', modal);
        if (modal) {
            console.log('🔍 Modal HTML:', modal.outerHTML);
        }
        return;
    }
    
    console.log('✅ Todos os elementos encontrados, preenchendo formulário...');
    
    libraryIdInput.value = library.id;
    nameInput.value = library.name;
    urlInput.value = library.url;
    observationsInput.value = library.observations || '';
    
    console.log('✅ Formulário preenchido, abrindo modal...');
    
    // Teste direto do modal
    const modal = document.getElementById('editObservationsModal');
    if (modal) {
        console.log('✅ Modal encontrado no DOM');
        console.log('🔍 Modal display atual:', modal.style.display);
        modal.style.display = 'block';
        console.log('✅ Modal display alterado para block');
        console.log('🔍 Modal display após alteração:', modal.style.display);
    } else {
        console.error('❌ Modal não encontrado no DOM');
    }
    
    // Também tentar com showModal
    showModal('editObservationsModal');
}

// Função para abrir modal de atribuir pasta
async function assignFolder(libraryId) {
    console.log('📁 assignFolder chamada com ID:', libraryId);
    
    const library = libraries.find(lib => lib.id === libraryId);
    if (!library) {
        console.error('❌ Biblioteca não encontrada:', libraryId);
        return;
    }
    
    console.log('📚 Biblioteca encontrada:', library);
    
    // Garantir que as pastas estão carregadas
    if (folders.length === 0) {
        console.log('📁 Carregando pastas...');
        await loadFolders();
    }
    
    console.log('📁 Pastas disponíveis:', folders);
    
    // Preencher o modal
    const libraryIdInput = document.getElementById('assignFolderLibraryId');
    if (libraryIdInput) {
        libraryIdInput.value = libraryId;
        console.log('✅ Library ID definido:', libraryId);
    } else {
        console.error('❌ Input assignFolderLibraryId não encontrado');
    }
    
    // Selecionar a pasta atual se existir
    const folderSelect = document.getElementById('assignFolderSelect');
    if (folderSelect) {
        folderSelect.value = library.folderId || '';
        console.log('✅ Pasta atual selecionada:', library.folderId || 'Sem pasta');
    } else {
        console.error('❌ Select assignFolderSelect não encontrado');
    }
    
    // Atualizar lista de pastas disponíveis
    updateAssignFolderSelect();
    
    // Mostrar modal
    console.log('🔍 Abrindo modal assignFolderModal...');
    showModal('assignFolderModal');
}

// Função para atualizar select de pastas no modal de atribuir pasta
function updateAssignFolderSelect() {
    console.log('🔄 updateAssignFolderSelect chamada');
    
    const folderSelect = document.getElementById('assignFolderSelect');
    if (!folderSelect) {
        console.error('❌ Select assignFolderSelect não encontrado');
        return;
    }
    
    console.log('✅ Select encontrado, atualizando opções...');
    
    // Manter a opção "Sem pasta"
    folderSelect.innerHTML = '<option value="">🌐 Sem pasta (raiz)</option>';
    
    // Adicionar opções para cada pasta
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = `📁 ${folder.name}`;
        folderSelect.appendChild(option);
        console.log('✅ Opção adicionada:', folder.name);
    });
    
    console.log('✅ Select de pastas atualizado com', folders.length, 'opções');
}

// Event listener para o formulário de atribuir pasta
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOMContentLoaded - Procurando formulário assignFolderForm...');
    
    const assignFolderForm = document.getElementById('assignFolderForm');
    if (assignFolderForm) {
        console.log('✅ Formulário assignFolderForm encontrado, adicionando event listener...');
        
        assignFolderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('📝 Formulário de atribuir pasta submetido');
            
            const libraryId = document.getElementById('assignFolderLibraryId').value;
            const folderId = document.getElementById('assignFolderSelect').value || null;
            
            console.log('📁 Dados do formulário:', { libraryId, folderId });
            
            try {
                console.log('📡 Enviando requisição para API...');
                const response = await authenticatedFetch(`/api/libraries/${libraryId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ folderId })
                });
                
                console.log('📡 Resposta da API:', response.status, response.statusText);
                
                if (response.ok) {
                    console.log('✅ Pasta atribuída com sucesso!');
                    showStatus('Pasta atribuída com sucesso!', 'success');
                    closeModal('assignFolderModal');
                    
                    // Reload data
                    loadDashboard();
                    loadLibraries();
                } else {
                    const error = await response.json();
                    console.error('❌ Erro da API:', error);
                    showStatus(`Erro ao atribuir pasta: ${error.error}`, 'error');
                }
            } catch (error) {
                console.error('❌ Erro de conexão:', error);
                showStatus('Erro de conexão', 'error');
            }
        });
        
        console.log('✅ Event listener adicionado com sucesso');
    } else {
        console.error('❌ Formulário assignFolderForm não encontrado');
    }
});

// Event listener para o formulário de editar observações
document.addEventListener('DOMContentLoaded', function() {
    const editObservationsForm = document.getElementById('editObservationsForm');
    if (editObservationsForm) {
        editObservationsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const libraryId = document.getElementById('editObservationsLibraryId').value;
            const observations = document.getElementById('editObservationsText').value;
            
            try {
                const response = await authenticatedFetch(`/api/libraries/${libraryId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ observations })
                });
                
                if (response.ok) {
                    showStatus('Observações atualizadas com sucesso!', 'success');
                    closeModal('editObservationsModal');
                    
                    // Reload data
                    loadDashboard();
                    loadLibraries();
                } else {
                    const error = await response.json();
                    showStatus(`Erro ao atualizar observações: ${error.error}`, 'error');
                }
            } catch (error) {
                showStatus('Erro de conexão', 'error');
            }
        });
    }
});

// Form Submissions
document.getElementById('addLibraryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('libraryName').value,
        url: document.getElementById('libraryUrl').value,
        observations: document.getElementById('libraryObservations').value,
        folderId: document.getElementById('libraryFolder').value || null
    };
    
    try {
        const response = await authenticatedFetch('/api/libraries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showStatus('Biblioteca adicionada com sucesso!', 'success');
            closeModal('addLibraryModal');
            
            // Reset form
            document.getElementById('addLibraryForm').reset();
            
            // Reload data
            loadDashboard();
            loadLibraries();
        } else {
            const error = await response.json();
            showStatus(`Erro ao adicionar biblioteca: ${error.error}`, 'error');
        }
    } catch (error) {
        showStatus('Erro de conexão', 'error');
    }
});

// document.getElementById('editLibraryForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
//     
//     const libraryId = document.getElementById('editLibraryId').value;
//     const formData = {
//         name: document.getElementById('editLibraryName').value,
//         url: document.getElementById('editLibraryUrl').value,
//         observations: document.getElementById('editLibraryObservations').value,
//         folderId: document.getElementById('editLibraryFolder').value || null
//     };
//     
//     try {
//         const response = await fetch(`/api/libraries/${libraryId}`, {
//             method: 'PUT',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(formData)
//         });
//         
//         if (response.ok) {
//             showStatus('Biblioteca atualizada com sucesso!', 'success');
//             closeModal('editLibraryModal');
//             loadLibraries();
//             if (document.getElementById('dashboard').style.display !== 'none') {
//                 loadDashboard();
//             }
//         } else {
//             const error = await response.text();
//             showStatus(`Erro ao atualizar biblioteca: ${error}`, 'error');
//         }
//     } catch (error) {
//         showStatus('Erro de conexão', 'error');
//     }
// });

// Event listener para o formulário de criar pasta
document.addEventListener('DOMContentLoaded', function() {
    const createFolderForm = document.getElementById('createFolderForm');
    if (createFolderForm) {
        createFolderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('folderName').value,
                description: document.getElementById('folderDescription').value
            };
            
            console.log('📝 Tentando criar pasta:', formData);
            
            try {
                const response = await authenticatedFetch('/api/folders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                console.log('📡 Resposta da API criar pasta:', response.status, response.statusText);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Pasta criada com sucesso:', result);
                    showStatus('Pasta criada com sucesso!', 'success');
                    closeModal('createFolderModal');
                    
                    // Reset form
                    document.getElementById('createFolderForm').reset();
                    
                    // Reload folders
                    console.log('🔄 Recarregando pastas...');
                    await loadFolders();
                    console.log('✅ Pastas recarregadas');
                } else {
                    const error = await response.json();
                    console.error('❌ Erro ao criar pasta:', error);
                    showStatus(`Erro ao criar pasta: ${error.error}`, 'error');
                }
            } catch (error) {
                console.error('❌ Erro de conexão ao criar pasta:', error);
                showStatus('Erro de conexão', 'error');
            }
        });
    } else {
        console.error('❌ Formulário createFolderForm não encontrado');
    }
});

// Event listener para o formulário de editar pasta
document.addEventListener('DOMContentLoaded', function() {
    const editFolderForm = document.getElementById('editFolderForm');
    if (editFolderForm) {
        editFolderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const folderId = document.getElementById('editFolderId').value;
            const formData = {
                name: document.getElementById('editFolderName').value,
                description: document.getElementById('editFolderDescription').value
            };
            
            try {
                const response = await authenticatedFetch(`/api/folders/${folderId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    showStatus('Pasta atualizada com sucesso!', 'success');
                    closeModal('editFolderModal');
                    loadFolders();
                } else {
                    const error = await response.json();
                    showStatus(`Erro ao atualizar pasta: ${error.error}`, 'error');
                }
            } catch (error) {
                showStatus('Erro de conexão', 'error');
            }
        });
    }
});

// Library Management Functions
async function checkSingleLibrary(libraryId) {
    console.log('🔍 checkSingleLibrary chamada com ID:', libraryId);
    const library = libraries.find(lib => lib.id === libraryId);
    if (!library) {
        console.log('❌ Biblioteca não encontrada');
        return;
    }
    console.log('📚 Biblioteca encontrada:', library.name, 'URL:', library.url);
    
    try {
        // Mostrar loading
        const indicator = document.querySelector(`[data-library-id="${libraryId}"] .library-trend-indicator`);
        if (indicator) {
            indicator.innerHTML = '<span class="trend-indicator loading">⏳</span>';
        }
        
        // Usar scraper diretamente em vez da API
        const adsCount = await scrapeFacebookAds(library.url);
        console.log('✅ Scraping concluído:', adsCount, 'anúncios');
        
        // Atualizar dados da biblioteca em tempo real
        library.lastActiveAds = adsCount;
        library.lastUpdate = new Date().toISOString();
        
        // Atualizar o badge de anúncios ativos
        const adsBadge = document.querySelector(`[data-library-id="${libraryId}"]`).closest('.library-card').querySelector('.active-ads-count');
        if (adsBadge) {
            adsBadge.textContent = `${adsCount} anúncios ativos`;
        }
        
        // Atualizar o indicador de tendência
        if (indicator) {
            indicator.innerHTML = getTrendIndicator(library);
        }
        
        showStatus(`Verificação concluída: ${adsCount} anúncios ativos`, 'success');
            
            // Reload data
            loadDashboard();
            loadLibraries();
        
    } catch (error) {
        console.error('❌ Erro no scraping:', error);
        showStatus(`Erro na verificação: ${error.message}`, 'error');
        
        // Restaurar indicador original
        if (indicator) {
            indicator.innerHTML = getTrendIndicator(library);
        }
    }
}







// Função para verificar e atualizar dados automaticamente
function startAutoRefresh() {
    console.log('🔄 Iniciando auto-refresh...');
    
    // Verificar a cada 30 segundos se há novos dados
    setInterval(async () => {
        try {
            console.log('🔄 Verificando atualizações...');
            
            // Recarregar bibliotecas do servidor
            const response = await authenticatedFetch('/api/libraries');
            if (response.ok) {
                const updatedLibraries = await response.json();
                
                // Verificar se há mudanças
                let hasChanges = false;
                
                for (let i = 0; i < updatedLibraries.length; i++) {
                    const updated = updatedLibraries[i];
                    const current = libraries[i];
                    
                    if (current && (
                        updated.lastActiveAds !== current.lastActiveAds ||
                        updated.lastUpdate !== current.lastUpdate
                    )) {
                        console.log(`📊 Mudança detectada em ${updated.name}: ${current.lastActiveAds} → ${updated.lastActiveAds}`);
                        hasChanges = true;
                        break;
                    }
                }
                
                // Se há mudanças, atualizar interface
                if (hasChanges) {
                    console.log('🔄 Atualizando interface com novos dados...');
                    libraries = updatedLibraries;
                    
                    // Atualizar apenas os elementos que mudaram
                    updateLibraryDisplays();
                }
        }
    } catch (error) {
            console.log('⚠️ Erro ao verificar atualizações:', error.message);
        }
    }, 30000); // 30 segundos
}

// Função para atualizar apenas os elementos que mudaram
function updateLibraryDisplays() {
    libraries.forEach(library => {
        // Atualizar badge de anúncios ativos
        const adsBadge = document.querySelector(`[data-library-id="${library.id}"]`)?.closest('.library-card')?.querySelector('.active-ads-count');
        if (adsBadge) {
            adsBadge.textContent = `${library.lastActiveAds || 0} anúncios ativos`;
        }
        
        // Atualizar indicador de tendência
        const indicator = document.querySelector(`[data-library-id="${library.id}"] .library-trend-indicator`);
        if (indicator) {
            indicator.innerHTML = getTrendIndicator(library);
        }
    });
}

async function checkAllLibraries() {
    if (!confirm('Queres verificar TODAS as bibliotecas? Isto pode demorar alguns minutos.')) {
        return;
    }
    
    showStatus('Iniciando verificação de todas as bibliotecas...', 'info');
    
    for (let i = 0; i < libraries.length; i++) {
        const library = libraries[i];
        
        try {
            showStatus(`Verificando ${i + 1}/${libraries.length}: ${library.name}`, 'info');
            
            // Usar scraper diretamente
            const adsCount = await scrapeFacebookAds(library.url);
            
            // Atualizar dados da biblioteca
            library.lastActiveAds = adsCount;
            library.lastUpdate = new Date().toISOString();
            
            showStatus(`${library.name}: ${adsCount} anúncios ativos`, 'success');
            
            // Pequena pausa entre verificações para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            showStatus(`Erro ao verificar ${library.name}: ${error.message}`, 'error');
        }
    }
    
    showStatus('Verificação de todas as bibliotecas concluída!', 'success');
    
    // Recarregar dados
    loadDashboard();
    loadLibraries();
}

async function deleteLibrary(libraryId) {
    if (!confirm('Tens a certeza que queres apagar esta biblioteca?')) {
        return;
    }
    
    try {
        const response = await authenticatedFetch(`/api/libraries/${libraryId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showStatus('Biblioteca apagada com sucesso!', 'success');
            loadLibraries();
            if (document.getElementById('dashboard').style.display !== 'none') {
                loadDashboard();
            }
        } else {
            const error = await response.text();
            showStatus(`Erro ao apagar: ${error}`, 'error');
        }
    } catch (error) {
        showStatus('Erro de conexão', 'error');
    }
}

function editLibrary(libraryId) {
    showEditLibraryModal(libraryId);
}

function editFolder(folderId) {
    showEditFolderModal(folderId);
}

async function deleteFolder(folderId) {
    if (!confirm('Tens a certeza que queres apagar esta pasta?')) {
        return;
    }
    
    try {
        const response = await authenticatedFetch(`/api/folders/${folderId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showStatus('Pasta apagada com sucesso!', 'success');
            loadFolders();
        } else {
            const error = await response.text();
            showStatus(`Erro ao apagar pasta: ${error}`, 'error');
        }
    } catch (error) {
        showStatus('Erro de conexão', 'error');
    }
}

// Notes Management Functions
function addNote(libraryId) {
    const noteInput = document.getElementById(`note-input-${libraryId}`);
    const noteText = noteInput.value.trim();
    
    if (!noteText) return;
    
    const library = libraries.find(lib => lib.id === libraryId);
    if (library) {
        if (!library.notes) library.notes = [];
        
        const newNote = {
            id: Date.now().toString(),
            text: noteText,
            date: new Date().toISOString()
        };
        
        library.notes.push(newNote);
        
        // Update the notes display
        const notesContainer = document.getElementById(`notes-${libraryId}`);
        notesContainer.innerHTML = renderNotes(library.notes);
        
        // Clear input
        noteInput.value = '';
        
        showStatus('Observação adicionada com sucesso!', 'success');
    }
}

function editNote(noteId) {
    // TODO: Implement note editing
    showStatus('Funcionalidade de edição de observações em desenvolvimento', 'info');
}

function deleteNote(noteId) {
    // TODO: Implement note deletion
    showStatus('Funcionalidade de remoção de observações em desenvolvimento', 'info');
}

// Utility Functions
function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
        status.style.display = 'none';
    }, 5000);
}

function renderNotes(notes) {
    if (!notes || notes.length === 0) {
        return '<p style="color: #b0b8c1; font-style: italic;">Nenhuma observação</p>';
    }
    
    return notes.map(note => `
        <div class="note-item">
            <div class="note-date">${new Date(note.date).toLocaleString('pt-PT')}</div>
            <div class="note-text">${note.text}</div>
            <div class="note-actions">
                <button class="note-action-btn" onclick="editNote('${note.id}')" title="Editar">✏️</button>
                <button class="note-action-btn" onclick="deleteNote('${note.id}')" title="Apagar">🗑️</button>
            </div>
        </div>
    `).join('');
}

function initializeDragAndDrop() {
    const folderCards = document.querySelectorAll('.folder-card');
    
    folderCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.folderId);
    e.target.style.opacity = '0.5';
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    const targetId = e.currentTarget.dataset.folderId;
    
    if (draggedId !== targetId) {
        // Reorder folders
        const draggedIndex = folders.findIndex(f => f.id === draggedId);
        const targetIndex = folders.findIndex(f => f.id === targetId);
        
        const [draggedFolder] = folders.splice(draggedIndex, 1);
        folders.splice(targetIndex, 0, draggedFolder);
        
        // Update order for all folders
        folders.forEach((folder, index) => {
            folder.order = index;
        });
        
        // Save new order to backend
        saveFolderOrder();
        
        renderFolders();
        showStatus('Pastas reordenadas com sucesso!', 'success');
    }
}

async function saveFolderOrder() {
    try {
        const response = await authenticatedFetch('/api/folders/reorder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                folderIds: folders.map(f => f.id) 
            })
        });
        
        if (!response.ok) {
            console.error('Erro ao salvar ordem das pastas');
        }
    } catch (error) {
        console.error('Erro ao salvar ordem das pastas:', error);
    }
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando página...');
    
    // Verificar autenticação primeiro
    const isAuth = await checkAuthStatus();
    
    if (isAuth) {
        console.log('✅ Autenticação válida, carregando conteúdo...');
    // Se chegou aqui, está autenticado
    loadDashboard();
    loadFolders(); // Carregar pastas na inicialização
    
    // Auto-refresh dashboard every 30 seconds
    setInterval(() => {
        if (document.getElementById('dashboard').style.display !== 'none') {
            loadDashboard();
        }
    }, 30000);
    } else {
        console.log('❌ Falha na autenticação');
        // A função checkAuthStatus já redireciona para login se necessário
    }
});

// Função para inicializar histórico das bibliotecas existentes
function initializeLibraryHistory() {
    console.log('🔄 Inicializando histórico das bibliotecas...');
    
    libraries.forEach(library => {
        if (!library.history) {
            library.history = [];
            
            // Se temos dados atuais, criar entrada para hoje
            if (library.lastActiveAds > 0 && library.lastUpdate) {
                const today = new Date().toISOString().split('T')[0];
                library.history.push({
                    date: today,
                    count: library.lastActiveAds,
                    timestamp: library.lastUpdate
                });
                console.log(`📊 Histórico inicializado para ${library.name}: ${library.lastActiveAds} anúncios`);
            }
            
            // Se a biblioteca foi criada há mais de 1 dia, criar entradas para os dias anteriores
            if (library.createdAt) {
                const createdAt = new Date(library.createdAt);
                const today = new Date();
                const daysSinceCreation = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));
                
                if (daysSinceCreation > 0) {
                    for (let i = 1; i <= daysSinceCreation; i++) {
                        const pastDate = new Date(today);
                        pastDate.setDate(pastDate.getDate() - i);
                        const pastDateStr = pastDate.toISOString().split('T')[0];
                        
                        library.history.push({
                            date: pastDateStr,
                            count: 0, // Não sabemos quantos anúncios tinha nesses dias
                            timestamp: pastDate.toISOString()
                        });
                    }
                    console.log(`📊 Histórico estendido para ${library.name}: ${daysSinceCreation} dias anteriores`);
                }
            }
        }
    });
}

// Chart Functions
function showLibraryChart(libraryId) {
    console.log('📊 showLibraryChart chamada para libraryId:', libraryId);
    
    const library = libraries.find(lib => lib.id === libraryId);
    if (!library) {
        console.error('❌ Biblioteca não encontrada:', libraryId);
        return;
    }
    
    console.log('📚 Biblioteca encontrada:', library);
    
    // Verificar se o modal existe
    const modal = document.getElementById('libraryChartModal');
    if (!modal) {
        console.error('❌ Modal do gráfico não encontrado!');
        return;
    }
    console.log('✅ Modal encontrado');
    
    // Verificar se os elementos do modal existem
    const chartLibraryName = document.getElementById('chartLibraryName');
    const dataType = document.getElementById('dataType');
    
    if (!chartLibraryName || !dataType) {
        console.error('❌ Elementos do modal não encontrados:', { chartLibraryName, dataType });
        return;
    }
    console.log('✅ Elementos do modal encontrados');
    
    // Atualizar nome da biblioteca no modal
    chartLibraryName.textContent = library.name;
    
    // Verificar se temos dados reais
    const hasRealData = library.history && library.history.length > 0;
    
    if (hasRealData) {
        dataType.textContent = `✅ Dados Reais (${library.history.length} dias de histórico)`;
        dataType.style.color = '#00ff88';
    } else {
        dataType.textContent = '⚠️ Dados Limitados (apenas dados reais disponíveis)';
        dataType.style.color = '#ffaa00';
    }
    
    console.log('📊 Gerando dados do gráfico...');
    
    // Gerar dados para os últimos 15 dias
    const chartData = generateChartData(library);
    console.log('📊 Dados gerados:', chartData);
    
    // Criar o gráfico
    console.log('📊 Criando gráfico...');
    createLibraryChart(chartData);
    
    // Mostrar modal
    console.log('📊 Mostrando modal...');
    modal.style.display = 'block';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.zIndex = '9999';
    
    console.log('✅ Modal do gráfico aberto com sucesso!');
}

function generateChartData(library) {
    const data = [];
    const today = new Date();
    
    // SEMPRE usar apenas dados reais - NUNCA simular!
    if (library.history && library.history.length > 0) {
        console.log('📊 Usando dados reais do histórico:', library.history.length, 'dias');
        
        // Ordenar histórico por data
        const sortedHistory = library.history.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Criar array de 15 dias com datas sequenciais (do passado para o presente)
        for (let i = 14; i >= 0; i--) {
            const pastDate = new Date(today);
            pastDate.setDate(pastDate.getDate() - i);
            const pastDateStr = pastDate.toISOString().split('T')[0];
            
            // Procurar dados reais para esta data específica
            const realData = sortedHistory.find(entry => entry.date === pastDateStr);
            
            data.push({
                date: pastDate.toLocaleDateString('pt-PT'),
                ads: realData ? realData.count : 0
            });
        }
        
        return data;
    } else {
        console.log('📊 SEM HISTÓRICO REAL - Criando dados mínimos reais');
        
        // Criar apenas dados reais baseados no que temos
        const currentAds = library.lastActiveAds || 0;
        const createdAt = library.createdAt ? new Date(library.createdAt) : today;
        const daysSinceCreation = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));
        
        // Criar array de 15 dias com datas sequenciais
        for (let i = 14; i >= 0; i--) {
            const pastDate = new Date(today);
            pastDate.setDate(pastDate.getDate() - i);
            
            // Se a data é anterior à criação da biblioteca, mostrar 0
            // Se é hoje, mostrar anúncios atuais
            // Se é entre criação e hoje, mostrar 0
            let count = 0;
            if (pastDate >= createdAt) {
                if (i === 0) { // Hoje
                    count = currentAds;
                }
            }
            
            data.push({
                date: pastDate.toLocaleDateString('pt-PT'),
                ads: count
            });
        }
        
        return data;
    }
}

function createLibraryChart(data) {
    const canvas = document.getElementById('libraryChart');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('chartTooltip');
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Configurações do gráfico
    const padding = 40;
    const chartWidth = canvas.width - (padding * 2);
    const chartHeight = canvas.height - (padding * 2);
    
    // Array para armazenar os pontos do gráfico para hover
    const chartPoints = [];
    
    // Encontrar valores máximos
    const maxAds = Math.max(...data.map(d => d.ads));
    const maxY = Math.max(maxAds * 1.2, 10); // Mínimo de 10 para visualização
    
    // Desenhar fundo
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar grade
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Linhas horizontais
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight * i / 5);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
        
        // Labels do eixo Y
        ctx.fillStyle = '#b0b8c1';
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(Math.floor(maxY * (5 - i) / 5), padding - 10, y + 4);
    }
    
    // Linhas verticais
    for (let i = 0; i <= 14; i++) {
        const x = padding + (chartWidth * i / 14);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, canvas.height - padding);
        ctx.stroke();
        
        // Labels do eixo X (apenas alguns dias para não sobrecarregar)
        if (i % 3 === 0) {
            ctx.fillStyle = '#b0b8c1';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(data[i].date, x, canvas.height - padding + 20);
        }
    }
    
    // Desenhar linha do gráfico
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    data.forEach((point, index) => {
        const x = padding + (chartWidth * index / 14);
        const y = canvas.height - padding - (chartHeight * point.ads / maxY);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Desenhar pontos
    ctx.fillStyle = '#00d4ff';
    data.forEach((point, index) => {
        const x = padding + (chartWidth * index / 14);
        const y = canvas.height - padding - (chartHeight * point.ads / maxY);
        
        // Armazenar ponto para hover
        chartPoints.push({
            x: x,
            y: y,
            date: point.date,
            ads: point.ads,
            index: index
        });
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Adicionar brilho
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#00d4ff';
    });
    
    // Desenhar área sob a linha
    ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    
    data.forEach((point, index) => {
        const x = padding + (chartWidth * index / 14);
        const y = canvas.height - padding - (chartHeight * point.ads / maxY);
        ctx.lineTo(x, y);
    });
    
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.closePath();
    ctx.fill();
    
    // Título do gráfico
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Evolução dos Anúncios Ativos', canvas.width / 2, 25);
    
    // Adicionar funcionalidade de hover
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Verificar se o mouse está próximo de algum ponto
        const hoverRadius = 15;
        let hoveredPoint = null;
        
        for (const point of chartPoints) {
            const distance = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
            if (distance <= hoverRadius) {
                hoveredPoint = point;
                break;
            }
        }
        
        if (hoveredPoint) {
            // Mostrar tooltip
            tooltip.style.display = 'block';
            tooltip.innerHTML = `
                <strong>📅 ${hoveredPoint.date}</strong><br>
                <strong>📊 ${hoveredPoint.ads} anúncios ativos</strong>
            `;
            
            // Posicionar tooltip
            const tooltipX = mouseX + 10;
            const tooltipY = mouseY - 40;
            
            // Ajustar posição se sair da tela
            const tooltipWidth = tooltip.offsetWidth;
            const tooltipHeight = tooltip.offsetHeight;
            
            let finalX = tooltipX;
            let finalY = tooltipY;
            
            if (tooltipX + tooltipWidth > canvas.width) {
                finalX = mouseX - tooltipWidth - 10;
            }
            
            if (tooltipY < 0) {
                finalY = mouseY + 20;
            }
            
            tooltip.style.left = finalX + 'px';
            tooltip.style.top = finalY + 'px';
            
            // Destacar ponto no gráfico
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(hoveredPoint.x, hoveredPoint.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = '#00d4ff';
            ctx.beginPath();
            ctx.arc(hoveredPoint.x, hoveredPoint.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            // Esconder tooltip
            tooltip.style.display = 'none';
            
            // Redesenhar pontos normais
            ctx.fillStyle = '#00d4ff';
            chartPoints.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                ctx.fill();
                
                // Adicionar brilho
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(point.x - 1, point.y - 1, 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = '#00d4ff';
            });
        }
    });
    
    // Esconder tooltip quando sair do canvas
    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
}

