# 🚀 Atlas Ecom

**Monitor Inteligente de Bibliotecas Facebook Ads com Playwright**

## 📋 Descrição

O **Atlas Ecom** é uma ferramenta avançada de monitorização e análise de bibliotecas Facebook Ads, desenvolvida com tecnologias modernas para fornecer insights valiosos sobre campanhas publicitárias ativas.

## ✨ Funcionalidades Principais

### 🎯 **Dashboard Inteligente**
- **Estatísticas em Tempo Real**: Total de bibliotecas monitorizadas, anúncios ativos e última atualização
- **Top 10 Bibliotecas**: Ranking das bibliotecas com mais anúncios ativos
- **Cards Visuais**: Interface moderna com cards verticais para cada biblioteca

### 📚 **Gestão de Bibliotecas**
- **Adicionar/Editar/Apagar**: Gestão completa de bibliotecas Facebook Ads
- **Verificação Automática**: Contagem automática de anúncios ativos
- **Observações Múltiplas**: Sistema de notas com histórico temporal
- **Paginação Inteligente**: Navegação por páginas (20 bibliotecas por página)

### 📁 **Sistema de Pastas**
- **Organização Hierárquica**: Criação e gestão de pastas para organizar bibliotecas
- **Drag & Drop**: Reordenação visual das pastas
- **Edição Avançada**: Renomear, editar descrições e apagar pastas

### 🔄 **Monitorização Automática**
- **Verificação Imediata**: Verificação automática ao adicionar nova biblioteca
- **Scheduler Inteligente**: Verificação automática a cada 15 minutos
- **API REST**: Endpoints para integração com outros sistemas

## 🛠️ Tecnologias

- **Backend**: Node.js (>=18) com Express.js
- **Browser Automation**: Playwright (Chromium)
- **Agendamento**: node-cron
- **Interface**: HTML5, CSS3, JavaScript ES6+
- **Persistência**: JSON com fs-extra
- **Identificação**: UUID para elementos únicos

## 🚀 Instalação

### Pré-requisitos
- Node.js >= 18.0.0
- NPM ou Yarn

### Passos de Instalação

1. **Clonar o Repositório**
```bash
git clone <repository-url>
cd atlas-ecom
```

2. **Instalar Dependências**
```bash
npm install
```

3. **Instalar Playwright**
```bash
npm run playwright:install
```

4. **Configurar Variáveis de Ambiente**
```bash
cp .env.example .env
# Editar .env com as configurações necessárias
```

5. **Iniciar a Aplicação**
```bash
npm run dev
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)
```env
PORT=3000
CRON_SCHEDULE=*/15 * * * *
AUTOREFRESH_SECONDS=30
```

### Estrutura de Ficheiros
```
atlas-ecom/
├── data/
│   ├── history.json      # Histórico de verificações
│   └── libraries.json    # Metadados das bibliotecas
├── public/
│   ├── index.html        # Interface principal
│   └── client.js         # Lógica do frontend
├── utils/
│   ├── parse.js          # Parsing de contadores
│   └── url.js            # Validação de URLs
├── scraper.js            # Lógica de scraping
├── scheduler.js          # Agendamento automático
├── index.js              # Servidor Express
└── package.json
```

## 🌐 Interface

### Dashboard
- **Estatísticas Gerais**: Visão rápida do sistema
- **Top Bibliotecas**: Ranking visual das mais ativas
- **Cards Verticais**: Informações detalhadas de cada biblioteca

### Aba Bibliotecas
- **Gestão Completa**: CRUD completo de bibliotecas
- **Paginação**: Navegação por páginas
- **Observações**: Sistema de notas integrado
- **Ações Rápidas**: Verificar, editar, apagar

### Aba Pastas
- **Organização Visual**: Cards para cada pasta
- **Drag & Drop**: Reordenação intuitiva
- **Gestão Avançada**: Editar e apagar pastas

## 🔌 API Endpoints

### Bibliotecas
- `GET /api/libraries` - Listar todas as bibliotecas
- `POST /api/libraries` - Adicionar nova biblioteca
- `PUT /api/libraries/:id` - Atualizar biblioteca
- `DELETE /api/libraries/:id` - Apagar biblioteca

### Monitorização
- `POST /api/monitor/single` - Verificar biblioteca específica
- `POST /api/monitor/daily` - Verificação em lote
- `GET /api/scheduler/status` - Status do scheduler

### Sistema
- `GET /api/ping` - Health check
- `GET /api/data` - Dados do sistema

## 📊 Funcionalidades Avançadas

### Scraping Inteligente
- **Seletores Adaptativos**: Múltiplas estratégias de extração
- **Gestão de Cookies**: Aceitação automática de cookies
- **User Agent Rotation**: Evita detecção
- **Timeout Inteligente**: Navegação robusta

### Sistema de Observações
- **Histórico Temporal**: Notas com timestamps
- **Múltiplas Entradas**: Várias observações por biblioteca
- **Edição Avançada**: Modificar e apagar observações

### Gestão de Pastas
- **Organização Visual**: Interface drag & drop
- **Metadados Ricos**: Nome, descrição e contadores
- **Reordenação**: Posicionamento personalizado

## 🔒 Segurança

- **Validação de URLs**: Verificação de URLs Facebook Ads
- **Sanitização de Inputs**: Proteção contra XSS
- **Rate Limiting**: Controle de requisições
- **Error Handling**: Gestão robusta de erros

## 🚧 Roadmap

### Versão Atual (1.0.0)
- ✅ Dashboard com estatísticas
- ✅ Gestão completa de bibliotecas
- ✅ Sistema de pastas
- ✅ Monitorização automática
- ✅ Interface dark theme high-tech

### Próximas Versões
- 🔄 Integração com base de dados
- 🔄 Sistema de utilizadores
- 🔄 Relatórios avançados
- 🔄 Notificações em tempo real
- 🔄 API GraphQL
- 🔄 Exportação de dados

## 🤝 Contribuição

1. Fork o projeto
2. Cria uma branch para a feature (`git checkout -b feature/AmazingFeature`)
3. Commit as alterações (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abre um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - ver o ficheiro [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Issues**: [GitHub Issues](https://github.com/username/atlas-ecom/issues)
- **Documentação**: [Wiki](https://github.com/username/atlas-ecom/wiki)
- **Email**: support@atlas-ecom.com

## 🙏 Agradecimentos

- **Playwright**: Automação de browser
- **Express.js**: Framework web
- **Node.js**: Runtime JavaScript
- **Comunidade Open Source**: Contribuições e feedback

---

**Desenvolvido com ❤️ pela equipa Atlas Ecom**

*Monitorização inteligente para o futuro do marketing digital*
