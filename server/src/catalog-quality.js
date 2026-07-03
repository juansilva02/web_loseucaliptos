const UNAVAILABLE_PATTERNS = [
  /\bNO+\s*HAY+\b/i,
  /\bSIN\s+STOCK\b/i,
  /\bNO\s+DISPONIBLE\b/i,
]

export function isUnavailableName(name) {
  return UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(String(name || '')))
}

export function normalizeCatalogText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}
