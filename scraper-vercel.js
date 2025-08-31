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
            'Cache-Control': 'max-age=0',
            'Referer': 'https://www.facebook.com/',
            'Origin': 'https://www.facebook.com',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-User': '?1'
        };
        
        // Fazer request para o Facebook com timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            redirect: 'follow',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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

// Método alternativo de scraping com proxy
async function scrapeWithFallback(url) {
    try {
        console.log(`🔄 Tentando método alternativo com proxy para: ${url}`);
        
        // Usar um proxy público gratuito (pode não funcionar sempre)
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8'
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
            source: 'vercel-proxy-scraping',
            html: html.substring(0, 500)
        };
        
    } catch (error) {
        console.error(`❌ Erro no método alternativo: ${error.message}`);
        
        // Último recurso: tentar com método de proxy alternativo
        return await scrapeWithAlternativeProxy(url);
    }
}

// Método de proxy alternativo
async function scrapeWithAlternativeProxy(url) {
    try {
        console.log(`🔄 Tentando proxy alternativo para: ${url}`);
        
        // Usar outro serviço de proxy
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
                'Origin': 'https://www.facebook.com'
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
            source: 'vercel-alternative-proxy',
            html: html.substring(0, 500)
        };
        
    } catch (error) {
        console.error(`❌ Erro no proxy alternativo: ${error.message}`);
        return {
            success: false,
            error: error.message,
            source: 'vercel-proxy-error'
        };
    }
}

// Função para extrair número de resultados do HTML
function extractResultCount(html) {
    try {
        console.log('🔍 Analisando HTML para extrair contagem...');
        
        // Padrões específicos do Facebook Ads Library (baseados na imagem real)
        const patterns = [
            // Padrão principal: "~3 resultados" (exatamente como na imagem)
            /~(\d+)\s+resultados?/i,
            // Padrão alternativo: "3 resultados" (sem ~)
            /(\d+)\s+resultados?/i,
            // Padrão em inglês: "~3 results"
            /~(\d+)\s+results?/i,
            // Padrão em inglês: "3 results"
            /(\d+)\s+results?/i,
            // Padrão com contexto: "resultados: ~3"
            /resultados?\s*:\s*~?(\d+)/i,
            // Padrão com contexto: "results: ~3"
            /results?\s*:\s*~?(\d+)/i
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
        
        // Procurar por números em contexto mais amplo
        const contextPatterns = [
            // "resultados: ~610" ou "results: ~610"
            /(?:resultados?|results?)\s*[~:]\s*(\d+)/i,
            // "610 anúncios" ou "610 ads"
            /(\d+)\s+(?:anúncios?|ads?)/i,
            // "encontrados 610" ou "found 610"
            /(?:encontrados?|found)\s+(\d+)/i
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
        
        // Debug: mostrar parte do HTML para análise
        console.log('🔍 HTML analisado (primeiros 1000 chars):', html.substring(0, 1000));
        
        // Procurar por qualquer número que possa ser um contador
        const numberPatterns = [
            /(\d{2,4})\s*(?:resultados?|results?|anúncios?|ads?)/i,
            /(?:resultados?|results?|anúncios?|ads?)\s*(\d{2,4})/i
        ];
        
        for (const pattern of numberPatterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                const count = parseInt(match[1]);
                if (!isNaN(count) && count > 10) { // Números maiores que 10 são mais prováveis de serem contadores
                    console.log(`✅ Padrão de número encontrado: "${match[0]}" -> ${count}`);
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
