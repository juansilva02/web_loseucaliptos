const UNAVAILABLE_PATTERNS = [
  /\bNO+\s*HAY+\b/i,
  /\bSIN\s+STOCK\b/i,
  /\bNO\s+DISPONIBLE\b/i,
]

const PROMO_PATTERNS = [/\bPROMO\b/i, /\bOFERTA\b/i]

const ODD_PATTERNS = [
  /\s{2,}/,
  /-{2,}/,
  /_{2,}/,
  /[A-Z]{3,}[0-9]{2,}[A-Z]{2,}/,
]

export function isUnavailableName(name) {
  return UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(String(name || '')))
}

export function cleanCatalogName(name) {
  return String(name || '')
    .replace(/\bNO+\s*HAY+\b/gi, '')
    .replace(/\bSIN\s+STOCK\b/gi, '')
    .replace(/\bNO\s+DISPONIBLE\b/gi, '')
    .replace(/\s*[-–]+\s*$/g, '')
    .replace(/\s*[-–]+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function getCatalogQualityFlags(name) {
  const value = String(name || '')
  const flags = []

  if (isUnavailableName(value)) flags.push('unavailable')
  if (PROMO_PATTERNS.some((pattern) => pattern.test(value))) flags.push('promo')
  if (ODD_PATTERNS.some((pattern) => pattern.test(value))) flags.push('format')
  if (value !== cleanCatalogName(value)) flags.push('cleanup')

  return flags
}

export function getCatalogQualitySummary(name) {
  const flags = getCatalogQualityFlags(name)
  return {
    flags,
    displayName: cleanCatalogName(name),
    unavailable: flags.includes('unavailable'),
    needsReview: flags.length > 0,
  }
}
