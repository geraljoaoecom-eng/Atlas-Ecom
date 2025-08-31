import ScrapingBee from 'scrapingbee';

// Configuração do ScrapingBee
const API_KEY = process.env.SCRAPINGBEE_API_KEY || 'demo'; // Usar 'demo' para testes gratuitos
const client = new ScrapingBee(API_KEY);

// Função para fazer scraping real do Facebook Ads Library
async function scrapeFacebookAdsLibrary(url) {
    try {
        console.log(`🔍 Fazendo scraping real de: ${url}`);
        
        const response = await client.get({
            url: url,
            params: {
                // Configurações para o Facebook
                'premium_proxy': 'true',
                'country_code': 'pt',
                'render_js': 'false',
                'wait': '5000', // Esperar 5 segundos para carregar
                'block_resources': 'false'
            }
        });
        
        if (response.success) {
            const html = response.data.toString();
            console.log(`✅ Scraping bem-sucedido, HTML obtido: ${html.length} caracteres`);
            
            // Extrair número de resultados usando regex
            const resultCount = extractResultCount(html);
            console.log(`📊 Número de resultados extraído: ${resultCount}`);
            
            return {
                success: true,
                count: resultCount,
                source: 'scrapingbee-real',
                html: html.substring(0, 500) // Primeiros 500 chars para debug
            };
        } else {
            console.error(`❌ Erro no ScrapingBee: ${response.message}`);
            return {
                success: false,
                error: response.message,
                source: 'scrapingbee-error'
            };
        }
        
    } catch (error) {
        console.error(`❌ Erro geral no scraping: ${error.message}`);
        return {
            success: false,
            error: error.message,
            source: 'scrapingbee-exception'
        };
    }
}

// Função para extrair número de resultados do HTML
function extractResultCount(html) {
    try {
        // Padrões comuns do Facebook Ads Library
        const patterns = [
            /~?(\d+(?:[.,]\d+)?)\s+(?:resultados|results|résultats)/i,
            /(\d+(?:[.,]\d+)?)\s+(?:resultados|results|résultats)/i,
            /resultados?\s*[~:]\s*(\d+(?:[.,]\d+)?)/i,
            /results?\s*[~:]\s*(\d+(?:[.,]\d+)?)/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                const count = parseInt(match[1].replace(/[.,]/g, ''));
                if (!isNaN(count) && count > 0) {
                    console.log(`✅ Padrão encontrado: "${match[0]}" -> ${count}`);
                    return count;
                }
            }
        }
        
        // Fallback: procurar por números seguidos de "resultados"
        const fallbackMatch = html.match(/(\d+)\s*resultados?/i);
        if (fallbackMatch) {
            const count = parseInt(fallbackMatch[1]);
            console.log(`✅ Fallback encontrado: ${count} resultados`);
            return count;
        }
        
        console.log('❌ Nenhum padrão de contagem encontrado');
        return null;
        
    } catch (error) {
        console.error(`❌ Erro ao extrair contagem: ${error.message}`);
        return null;
    }
}

// Função para atualizar contador de uma biblioteca específica
async function updateLibraryCountReal(libraryId, url) {
    try {
        console.log(`🔄 Atualizando biblioteca ${libraryId} com dados reais...`);
        
        // Fazer scraping real
        const result = await scrapeFacebookAdsLibrary(url);
        
        if (result.success && result.count !== null) {
            console.log(`✅ Contador real obtido: ${result.count}`);
            return {
                success: true,
                count: result.count,
                source: result.source
            };
        } else {
            console.error(`❌ Falha no scraping: ${result.error}`);
            return {
                success: false,
                error: result.error,
                source: result.source
            };
        }
        
    } catch (error) {
        console.error(`❌ Erro ao atualizar biblioteca ${libraryId}: ${error.message}`);
        return {
            success: false,
            error: error.message,
            source: 'update-error'
        };
    }
}

// Função para atualizar todas as bibliotecas com dados reais
async function updateAllLibrariesReal(libraries) {
    console.log(`🔄 Iniciando atualização real de ${libraries.length} bibliotecas...`);
    
    const results = [];
    
    for (let i = 0; i < libraries.length; i++) {
        const library = libraries[i];
        console.log(`📊 Processando biblioteca ${i + 1}/${libraries.length}: ${library.name}`);
        
        try {
            const result = await updateLibraryCountReal(library.id, library.url);
            results.push({
                libraryId: library.id,
                libraryName: library.name,
                ...result
            });
            
            // Pequena pausa entre requests para não sobrecarregar
            if (i < libraries.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            console.error(`❌ Erro ao processar biblioteca ${library.name}:`, error);
            results.push({
                libraryId: library.id,
                libraryName: library.name,
                success: false,
                error: error.message
            });
        }
    }
    
    console.log(`✅ Atualização completa. ${results.filter(r => r.success).length}/${results.length} bibliotecas atualizadas com sucesso`);
    return results;
}

export { 
    scrapeFacebookAdsLibrary, 
    updateLibraryCountReal, 
    updateAllLibrariesReal,
    extractResultCount 
};
