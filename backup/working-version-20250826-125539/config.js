import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// IDs das páginas para monitorar (exemplos - alterar conforme necessário)
export const PAGE_IDS = [
  "100992572945925",
  "112233445566778"
];

// Configurações padrão
export const DEFAULT_COUNTRY = process.env.COUNTRY || "UNKNOWN";
export const PORT = process.env.PORT || 3000;
export const HEADLESS = process.env.HEADLESS === 'true';
export const PROXY_URL = process.env.PROXY_URL || null;
export const MAX_SCROLL_STEPS = parseInt(process.env.MAX_SCROLL_STEPS) || 120;
export const SCROLL_PAUSE_MS = parseInt(process.env.SCROLL_PAUSE_MS) || 800;
export const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 2;
export const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "*/5 * * * *"; // A cada 5 minutos

// Caminhos dos arquivos
export const DATA_DIR = join(__dirname, 'data');
export const HISTORY_FILE = join(DATA_DIR, 'history.json');
export const LIBRARIES_FILE = join(DATA_DIR, 'libraries.json');

// User agents para rotação
export const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// Timeouts
export const PAGE_TIMEOUT = 45000; // 45 segundos
export const TOTAL_TIMEOUT = 180000; // 3 minutos
