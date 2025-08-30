# 🚀 Spy Ecom 3 - Facebook Ads Library Monitor

Monitor de Facebook Ads Library com contador visível e agendamento automático.

## ✨ Características

- **Contador Visível**: Lê o contador visível da UI ("~610 resultados") sem somar cards
- **Agendamento Automático**: Execução automática via cron (configurável)
- **Flexibilidade**: Suporte para Page IDs OU URLs diretas da biblioteca
- **Dashboard em Tempo Real**: Auto-refresh configurável
- **Histórico Persistente**: Armazenamento em JSON com histórico completo
- **API REST**: Endpoints para controle total do sistema

## 🛠️ Instalação

### 1. Dependências
```bash
# Instalar dependências Node.js
npm install

# Instalar Playwright (navegador headless)
npm run playwright:install
```

### 2. Configuração
Criar arquivo `.env` na raiz do projeto:
```env
PORT=3000
HEADLESS=true
LANG_HINT=pt-PT
PROXY_URL=
COUNTRY=PT
CRON_ENABLED=true
CRON_SCHEDULE=*/15 * * * *
AUTOREFRESH_SECONDS=30
```

### 3. Executar
```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

## 🌐 Uso

### Dashboard Web
Aceder a `http://localhost:3000` para o dashboard interativo.

### API REST

#### Status do Sistema
```bash
# Verificar se está a funcionar
curl http://localhost:3000/api/ping

# Status do scheduler
curl http://localhost:3000/api/scheduler/status

# Histórico de execuções
curl http://localhost:3000/api/data
```

#### Contagem Manual
```bash
# Contar por Page ID
curl -X GET "http://localhost:3000/api/count/77978885595?country=PT"

# Contar por URL
curl -X POST http://localhost:3000/api/countByUrl \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=77978885595"}'

# Execução em lote
curl -X POST http://localhost:3000/api/monitor \
  -H "Content-Type: application/json" \
  -d '{"pageIds":["77978885595"],"country":"PT"}'
```

#### Controle do Scheduler
```bash
# Iniciar scheduler
curl -X POST http://localhost:3000/api/scheduler/start \
  -H "Content-Type: application/json" \
  -d '{"cron":"*/10 * * * *","pageIds":["77978885595"],"country":"ALL"}'

# Parar scheduler
curl -X POST http://localhost:3000/api/scheduler/stop

# Status do scheduler
curl http://localhost:3000/api/scheduler/status
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `PORT` | Porta do servidor | `3000` |
| `HEADLESS` | Executar browser em background | `true` |
| `LANG_HINT` | Idioma do browser | `pt-PT` |
| `PROXY_URL` | URL do proxy (opcional) | - |
| `COUNTRY` | País padrão | `PT` |
| `CRON_ENABLED` | Habilitar scheduler automático | `true` |
| `CRON_SCHEDULE` | Expressão cron para execução | `*/15 * * * *` |
| `AUTOREFRESH_SECONDS` | Auto-refresh do dashboard | `30` |

### Expressões Cron

| Padrão | Descrição |
|--------|-----------|
| `*/15 * * * *` | A cada 15 minutos |
| `*/30 * * * *` | A cada 30 minutos |
| `0 */1 * * *` | A cada hora |
| `0 2 * * *` | Diariamente às 2:00 |
| `0 9,18 * * *` | Duas vezes por dia (9:00 e 18:00) |

## 📊 Estrutura de Dados

### Histórico (data/history.json)
```json
[
  {
    "ts": "2025-08-26T15:00:00.000Z",
    "type": "page",
    "pageId": "77978885595",
    "country": "PT",
    "count": 610,
    "source": "regex-text"
  }
]
```

### Campos de Resposta
- `ts`: Timestamp da execução
- `type`: Tipo de entrada (`page` ou `url`)
- `pageId`: ID da página (se aplicável)
- `url`: URL completa (se aplicável)
- `country`: País da consulta
- `count`: Número de anúncios encontrados
- `source`: Fonte da contagem (`regex-text`, `scan-texts`, `html-regex`)

## 🔧 Desenvolvimento

### Estrutura do Projeto
```
Spy Ecom 3/
├── utils/
│   ├── parse.js      # Parser do contador visível
│   └── url.js        # Validação de URLs
├── scraper.js        # Lógica de scraping
├── scheduler.js      # Sistema de agendamento
├── index.js          # Servidor Express
├── public/           # Dashboard web
│   ├── index.html
│   └── client.js
├── data/             # Dados persistentes
│   └── history.json
└── .pwdata/          # Dados do Playwright
```

### Adicionar Novos Seletores
Para adicionar novos seletores de contador, editar `utils/parse.js`:

```javascript
function parseVisibleCount(text) {
  // Adicionar novos padrões aqui
  const patterns = [
    /~?\s*([\d\.\,\s]+)\s+(resultados|results|résultats)/i,
    /(\d+)\s+anúncios?/i,
    // Adicionar mais padrões...
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1].replace(/[^\d]/g, ''));
  }
  
  return null;
}
```

## 🚨 Troubleshooting

### Erros Comuns

1. **"Cannot find module 'playwright'"**
   ```bash
   npm install playwright
   npm run playwright:install
   ```

2. **"Timeout exceeded"**
   - Verificar conexão à internet
   - Aumentar timeouts no `.env`
   - Verificar se o Facebook não está bloqueando

3. **"Container não encontrado"**
   - O Facebook mudou a estrutura da página
   - Atualizar seletores em `utils/parse.js`

### Logs
O sistema gera logs detalhados no console. Para debug:
```bash
# Ver logs em tempo real
npm run dev

# Ver logs do scheduler
tail -f logs/scheduler.log
```

## 📝 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuições

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para questões e suporte:
- Abrir uma issue no GitHub
- Verificar a documentação da API
- Consultar os logs do sistema

---

**Spy Ecom 3** - Monitor inteligente de Facebook Ads Library 🚀
