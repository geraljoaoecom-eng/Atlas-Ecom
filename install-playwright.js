// Script para instalar Playwright no Vercel
import { execSync } from 'child_process';

console.log('🚀 Instalando Playwright no Vercel...');

try {
    // Instalar browsers do Playwright
    execSync('npx playwright install --with-deps chromium', { stdio: 'inherit' });
    console.log('✅ Playwright instalado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao instalar Playwright:', error.message);
    process.exit(1);
}
