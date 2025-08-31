#!/bin/bash

echo "🚀 Construindo Atlas Ecom para Mac..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor instala Node.js primeiro."
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não está instalado. Por favor instala npm primeiro."
    exit 1
fi

echo "✅ Node.js e npm encontrados"

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Instalar Playwright
echo "🎭 Instalando Playwright..."
npx playwright install --with-deps

# Construir a app
echo "🔨 Construindo app para Mac..."
npm run build:mac

echo "✅ App construída com sucesso!"
echo "📱 A app está disponível na pasta 'dist'"
echo "🎯 Podes instalar a app arrastando o .dmg para a pasta Applications"
