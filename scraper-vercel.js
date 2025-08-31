// Scraper que funciona diretamente no Vercel
// Usa fetch nativo para fazer scraping do Facebook

// Função para fazer scraping direto do Facebook Ads Library
async function scrapeFacebookAdsLibrary(url) {
    try {
        console.log(`🔍 Fazendo scraping direto de: ${url}`);
        
        // Configurar headers para parecer um browser real
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        };
        
        // Fazer request para o Facebook
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            redirect: 'follow'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`✅ Scraping bem-sucedido, HTML obtido: ${html.length} caracteres`);
        
        // Extrair número de resultados usando regex
        const resultCount = extractResultCount(html);
        console.log(`📊 Número de resultados extraído: ${resultCount}`);
        
        return {
            success: true,
            count: resultCount,
            source: 'vercel-direct-scraping',
            html: html.substring(0, 500) // Primeiros 500 chars para debug
        };
        
    } catch (error) {
        console.error(`❌ Erro no scraping direto: ${error.message}`);
        
        // Fallback: tentar com método alternativo
        return await scrapeWithFallback(url);
    }
}

// Método alternativo de scraping
async function scrapeWithFallback(url) {
    try {
        console.log(`🔄 Tentando método alternativo para: ${url}`);
        
        // Tentar com headers mais simples
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FacebookBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const resultCount = extractResultCount(html);
        
        return {
            success: true,
            count: resultCount,
            source: 'vercel-fallback-scraping',
            html: html.substring(0, 500)
        };
        
    } catch (error) {
        console.error(`❌ Erro no método alternativo: ${error.message}`);
        return {
            success: false,
            error: error.message,
            source: 'vercel-fallback-error'
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
            /results?\s*[~:]\s*(\d+(?:[.,]\d+)?)/i,
            /(\d+)\s*resultados?/i,
            /(\d+)\s*results?/i
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
        
        // Procurar por números em contexto de resultados
        const contextPatterns = [
            /resultados?\s*[~:]\s*(\d+)/i,
            /results?\s*[~:]\s*(\d+)/i,
            /(\d+)\s*anúncios?/i,
            /(\d+)\s*ads?/i
        ];
        
        for (const pattern of contextPatterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                const count = parseInt(match[1]);
                if (!isNaN(count) && count > 0) {
                    console.log(`✅ Padrão de contexto encontrado: "${match[0]}" -> ${count}`);
                    return count;
                }
            }
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
