// Extrai número de um texto tipo "~610 resultados"
function parseVisibleCount(text) {
  if (!text) return null;
  const m = text.match(/~?\s*([\d\.\,\s]+)\s+(resultados|results|résultats|ergebnisse|risultati|risultats)/i);
  if (!m) return null;
  const num = Number(String(m[1]).replace(/[^\d]/g, ''));
  return Number.isFinite(num) ? num : null;
}

export { parseVisibleCount };
