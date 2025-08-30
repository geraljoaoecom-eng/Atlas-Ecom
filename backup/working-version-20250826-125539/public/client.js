// Configurações
const AUTO_REFRESH_SECONDS = 30; // Será sobrescrito pelo .env
let refreshInterval = null;

// Elementos DOM
const elements = {
    country: document.getElementById('country'),
    cron: document.getElementById('cron'),
    pageIds: document.getElementById('pageIds'),
    urls: document.getElementById('urls'),
    schedulerStatus: document.getElementById('schedulerStatus'),
    lastRun: document.getElementById('lastRun'),
    lastRows: document.getElementById('lastRows'),
    lastError: document.getElementById('lastError'),
    alert: document.getElementById('alert'),
    loading: document.getElementById('loading'),
    historyTable: document.getElementById('historyTable')
};

// Funções utilitárias
function showAlert(message, type = 'success') {
    elements.alert.textContent = message;
    elements.alert.className = `alert alert-${type}`;
    elements.alert.style.display = 'block';
    
    setTimeout(() => {
        elements.alert.style.display = 'none';
    }, 5000);
}

function showLoading(show = true) {
    elements.loading.style.display = show ? 'block' : 'none';
}

function formatDate(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('pt-PT');
}

function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('pt-PT');
}

// Funções de API
async function fetchJson(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}

async function countNow() {
    try {
        showLoading(true);
        
        const pageIds = elements.pageIds.value
            .split('\n')
            .map(id => id.trim())
            .filter(id => id.length > 0);
            
        const urls = elements.urls.value
            .split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0);
            
        const country = elements.country.value;
        
        if (pageIds.length === 0 && urls.length === 0) {
            showAlert('Deve fornecer pelo menos um Page ID ou URL', 'error');
            return;
        }
        
        const response = await fetchJson('/api/monitor', {
            method: 'POST',
            body: JSON.stringify({ pageIds, urls, country })
        });
        
        if (response.success) {
            showAlert(`✅ Contagem concluída! ${response.results.length} resultados processados.`);
            await loadHistory();
            await loadSchedulerStatus();
        } else {
            showAlert('❌ Erro na contagem', 'error');
        }
        
    } catch (error) {
        showAlert(`❌ Erro: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function startScheduler() {
    try {
        showLoading(true);
        
        const pageIds = elements.pageIds.value
            .split('\n')
            .map(id => id.trim())
            .filter(id => id.length > 0);
            
        const urls = elements.urls.value
            .split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0);
            
        const country = elements.country.value;
        const cron = elements.cron.value;
        
        if (pageIds.length === 0 && urls.length === 0) {
            showAlert('Deve fornecer pelo menos um Page ID ou URL', 'error');
            return;
        }
        
        const response = await fetchJson('/api/scheduler/start', {
            method: 'POST',
            body: JSON.stringify({ pageIds, urls, country, cron })
        });
        
        if (response.success) {
            showAlert('✅ Scheduler iniciado com sucesso!');
            await loadSchedulerStatus();
        } else {
            showAlert('❌ Erro ao iniciar scheduler', 'error');
        }
        
    } catch (error) {
        showAlert(`❌ Erro: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function stopScheduler() {
    try {
        showLoading(true);
        
        const response = await fetchJson('/api/scheduler/stop', {
            method: 'POST'
        });
        
        if (response.success) {
            showAlert('✅ Scheduler parado com sucesso!');
            await loadSchedulerStatus();
        } else {
            showAlert('❌ Erro ao parar scheduler', 'error');
        }
        
    } catch (error) {
        showAlert(`❌ Erro: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Funções de carregamento de dados
async function loadHistory() {
    try {
        const history = await fetchJson('/api/data');
        renderHistoryTable(history);
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        elements.historyTable.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #dc3545;">
                    Erro ao carregar histórico: ${error.message}
                </td>
            </tr>
        `;
    }
}

async function loadSchedulerStatus() {
    try {
        const status = await fetchJson('/api/scheduler/status');
        updateSchedulerStatus(status);
    } catch (error) {
        console.error('Erro ao carregar status do scheduler:', error);
    }
}

// Funções de renderização
function renderHistoryTable(history) {
    if (!history || history.length === 0) {
        elements.historyTable.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #6c757d;">
                    Nenhum histórico encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    // Mostrar apenas os últimos 100 registros
    const recentHistory = history.slice(-100).reverse();
    
    const rows = recentHistory.map(item => {
        const date = formatDate(item.ts);
        const type = item.type === 'page' ? 'Page ID' : 'URL';
        const identifier = item.type === 'page' ? item.pageId : (item.url || 'N/A');
        const country = item.country || 'N/A';
        const count = formatNumber(item.count);
        const source = item.source || 'N/A';
        
        return `
            <tr>
                <td>${date}</td>
                <td>${type}</td>
                <td style="word-break: break-all;">${identifier}</td>
                <td>${country}</td>
                <td><strong>${count}</strong></td>
                <td>${source}</td>
            </tr>
        `;
    }).join('');
    
    elements.historyTable.innerHTML = rows;
}

function updateSchedulerStatus(status) {
    // Status do scheduler
    elements.schedulerStatus.textContent = status.enabled ? 'Habilitado' : 'Desabilitado';
    elements.schedulerStatus.className = `status-badge ${status.enabled ? 'enabled' : 'disabled'}`;
    
    // Última execução
    if (status.lastRun) {
        elements.lastRun.textContent = formatDate(status.lastRun.ts);
        elements.lastRows.textContent = status.lastRun.rows || 0;
        elements.lastError.textContent = status.lastRun.error || 'N/A';
    } else {
        elements.lastRun.textContent = 'N/A';
        elements.lastRows.textContent = '0';
        elements.lastError.textContent = 'N/A';
    }
}

// Função de auto-refresh
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(async () => {
        await loadHistory();
        await loadSchedulerStatus();
    }, AUTO_REFRESH_SECONDS * 1000);
    
    console.log(`🔄 Auto-refresh ativado a cada ${AUTO_REFRESH_SECONDS} segundos`);
}

// Inicialização
async function initialize() {
    try {
        console.log('🚀 Inicializando Spy Ecom 3...');
        
        // Carregar dados iniciais
        await loadHistory();
        await loadSchedulerStatus();
        
        // Iniciar auto-refresh
        startAutoRefresh();
        
        console.log('✅ Spy Ecom 3 inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showAlert(`❌ Erro na inicialização: ${error.message}`, 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', initialize);

// Expor funções globalmente para os botões HTML
window.countNow = countNow;
window.startScheduler = startScheduler;
window.stopScheduler = stopScheduler;
