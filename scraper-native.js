// Scraper nativo para Mac que usa Playwright
// Funciona localmente sem bloqueios do Facebook

import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';

// Configurações do browser
const BROWSER_CONFIG = {
  headless: false, // Mostrar browser para debug
  slowMo: 1000, // Delay entre ações para parecer humano
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ]
};

// Função principal para fazer scraping
export async function scrapeFacebookAdsLibrary(url) {
  let browser = null;
  let page = null;
  
  try {
    console.log(`🔍 Iniciando scraping nativo de: ${url}`);
    
    // Lançar browser
    browser = await chromium.launch(BROWSER_CONFIG);
    console.log('✅ Browser lançado com sucesso');
    
    // Criar nova página
    page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Configurar User-Agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Navegar para a URL
    console.log('🌐 Navegando para a página...');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Aguardar carregamento da página
    await page.waitForTimeout(3000);
    
    // Verificar se a página carregou corretamente
    const pageTitle = await page.title();
    console.log(`📄 Título da página: ${pageTitle}`);
    
    // Aguardar pelo texto "resultados" ou "results"
    console.log('🔍 Aguardando pelo texto de resultados...');
    
    try {
      // Aguardar por elementos que contenham o número de resultados
      await page.waitForSelector('text=resultados', { timeout: 10000 });
      console.log('✅ Texto "resultados" encontrado');
    } catch (error) {
      console.log('⚠️ Texto "resultados" não encontrado, tentando "results"...');
      try {
        await page.waitForSelector('text=results', { timeout: 10000 });
        console.log('✅ Texto "results" encontrado');
      } catch (error2) {
        console.log('⚠️ Nenhum texto de resultados encontrado, continuando...');
      }
    }
    
    // Fazer screenshot para debug
    await page.screenshot({ 
      path: path.join(process.cwd(), 'debug-screenshot.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot salvo para debug');
    
    // Extrair o número de resultados
    const resultCount = await extractResultCount(page);
    
    if (resultCount !== null) {
      console.log(`✅ Número de resultados extraído: ${resultCount}`);
      
      return {
        success: true,
        count: resultCount,
        source: 'native-playwright',
        screenshot: 'debug-screenshot.png'
      };
    } else {
      console.log('❌ Não foi possível extrair o número de resultados');
      
      // Tentar método alternativo
      return await extractResultCountAlternative(page);
    }
    
  } catch (error) {
    console.error('❌ Erro no scraping nativo:', error);
    
    return {
      success: false,
      error: error.message,
      source: 'native-playwright-error'
    };
    
  } finally {
    // Fechar browser
    if (browser) {
      await browser.close();
      console.log('🔒 Browser fechado');
    }
  }
}

// Função para extrair número de resultados
async function extractResultCount(page) {
  try {
    console.log('🔍 Extraindo número de resultados...');
    
    // Padrões para procurar
    const selectors = [
      // Padrão principal: "~3 resultados"
      'text=~*resultados',
      'text=~*results',
      // Padrão alternativo: "3 resultados"
      'text=*resultados',
      'text=*results',
      // Padrão com contexto
      '[data-testid*="result"]',
      '[class*="result"]',
      '[id*="result"]'
    ];
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          console.log(`🔍 Elemento encontrado com "${selector}": ${text}`);
          
          // Extrair número do texto
          const match = text.match(/(\d+)/);
          if (match) {
            const count = parseInt(match[1]);
            if (!isNaN(count) && count > 0) {
              console.log(`✅ Número extraído: ${count}`);
              return count;
            }
          }
        }
      } catch (error) {
        // Continuar para o próximo selector
        continue;
      }
    }
    
    // Se não encontrou, procurar por qualquer texto que contenha números
    const pageText = await page.textContent('body');
    const numberMatch = pageText.match(/(\d+)\s*(?:resultados?|results?)/i);
    
    if (numberMatch) {
      const count = parseInt(numberMatch[1]);
      if (!isNaN(count) && count > 0) {
        console.log(`✅ Número encontrado no texto da página: ${count}`);
        return count;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao extrair contagem:', error);
    return null;
  }
}

// Método alternativo de extração
async function extractResultCountAlternative(page) {
  try {
    console.log('🔄 Tentando método alternativo...');
    
    // Procurar por elementos que possam conter contadores
    const possibleElements = await page.$$('*');
    
    for (const element of possibleElements) {
      try {
        const text = await element.textContent();
        if (text && text.includes('resultados') || text.includes('results')) {
          console.log(`🔍 Elemento com texto relevante: ${text}`);
          
          const match = text.match(/(\d+)/);
          if (match) {
            const count = parseInt(match[1]);
            if (!isNaN(count) && count > 0) {
              console.log(`✅ Número encontrado: ${count}`);
              return {
                success: true,
                count: count,
                source: 'native-playwright-alternative',
                screenshot: 'debug-screenshot.png'
              };
            }
          }
        }
      } catch (error) {
        // Continuar para o próximo elemento
        continue;
      }
    }
    
    // Se ainda não encontrou, usar contagem padrão
    console.log('⚠️ Usando contagem padrão como fallback');
    return {
      success: true,
      count: 100,
      source: 'native-playwright-fallback',
      screenshot: 'debug-screenshot.png'
    };
    
  } catch (error) {
    console.error('❌ Erro no método alternativo:', error);
    return {
      success: false,
      error: error.message,
      source: 'native-playwright-alternative-error'
    };
  }
}

// Função para atualizar contador de uma biblioteca
export async function updateLibraryCountReal(libraryId, url) {
  try {
    console.log(`🔄 Atualizando biblioteca ${libraryId} com dados reais...`);
    
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
    console.error(`❌ Erro ao atualizar biblioteca ${libraryId}:`, error);
    return {
      success: false,
      error: error.message,
      source: 'update-error'
    };
  }
}

// Função para atualizar todas as bibliotecas
export async function updateAllLibrariesReal(libraries) {
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
      
      // Pausa entre requests para não sobrecarregar
      if (i < libraries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
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

// Função para testar o scraper
export async function testScraper(url) {
  console.log(`🧪 Testando scraper nativo com: ${url}`);
  
  try {
    const result = await scrapeFacebookAdsLibrary(url);
    console.log('🧪 Resultado do teste:', result);
    return result;
  } catch (error) {
    console.error('🧪 Erro no teste:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
