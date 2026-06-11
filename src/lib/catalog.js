import { productCatalog } from '../data/catalog'

export const whatsappBase = 'https://wa.me/5491159748316'
export const whatsappBosques = 'https://wa.me/5491130623113'

const categoryDefinitions = [
  {
    key: 'aridos-y-obra-gruesa',
    name: 'Aridos y Obra Gruesa',
    shortName: 'Aridos',
    description: 'Arena, cascote, piedra, tosca, cemento y cal para arranque de obra.',
    match: ['ARENA', 'CASCOT', 'CEMENT', 'CAL ', 'CALCA', 'CALMI', 'TOSCA', 'BOLSON', 'BOLSIT', 'PIEDRA'],
  },
  {
    key: 'hierros-y-estructura',
    name: 'Hierros y Estructura',
    shortName: 'Hierros',
    description: 'Varillas, vigas, mallas, alambres y refuerzos para estructura.',
    match: ['HIERRO', 'VARILL', 'VIGA', 'MALLA', 'ALAMBR', 'TEJIDO'],
  },
  {
    key: 'ladrillos-y-bloques',
    name: 'Ladrillos y Bloques',
    shortName: 'Ladrillos',
    description: 'Bloques, ladrillos y piezas de mamposteria para cerramientos.',
    match: ['BLOQUE', 'LADRIL'],
  },
  {
    key: 'construccion-en-seco',
    name: 'Construccion en Seco',
    shortName: 'Seco',
    description: 'Yesos, placas, masillas, membranas y terminaciones.',
    match: ['YESO', 'PLACA', 'MASILLA', 'SOLERA', 'MONTANTE', 'WEBER', 'BICAPA', 'AISLAN'],
  },
  {
    key: 'sanitarios-y-plomeria',
    name: 'Sanitarios y Plomeria',
    shortName: 'Sanitarios',
    description: 'Bachas, canillas, vanitorys, canos, uniones y accesorios de agua.',
    match: ['BACHA', 'BIDET', 'CANILL', 'VANITO', 'VALVUL', 'TERMOT', 'CALEFO', 'CANO', 'CAÑO', 'UNION', 'ACOPLE', 'ADAPTA', 'TEFLON', 'BOMBA', 'CAPEA'],
  },
  {
    key: 'electricidad-y-ferreteria',
    name: 'Electricidad y Ferreteria',
    shortName: 'Electricidad',
    description: 'Cables, cajas, termicas, tornillos, tarugos y herramientas.',
    match: ['CABLE', 'CAJA ', 'TERMIC', 'TECLA', 'LLAVE', 'TOMAC', 'JELUZ', 'TORNIL', 'TARUGO', 'TENAZA', 'TIJERA', 'CANDAD', 'BARRET', 'BUSCAP', 'ATORNI'],
  },
]

const helperDictionary = {
  ACELER: 'Acelerante para construccion',
  ACOPLE: 'Acople para instalacion',
  ADAPTA: 'Adaptador para instalacion',
  AIREAD: 'Aireador',
  AISLAN: 'Aislante',
  ALAMBR: 'Alambre',
  ALICAT: 'Alicate',
  ANTEOJ: 'Anteojos de seguridad',
  ANTIPA: 'Antiparra',
  ARENA: 'Arena',
  ARGENT: 'Accesorio linea Argent',
  BACHA: 'Bacha',
  BALDE: 'Balde',
  BARNIZ: 'Barniz',
  BARRET: 'Barreta',
  BICAPA: 'Membrana bicapa',
  BIDET: 'Bidet',
  BLOQUE: 'Bloque',
  BOLSON: 'Bolson',
  BOLSIT: 'Bolsita',
  BOMBA: 'Bomba',
  BOQUIL: 'Boquilla',
  CABLE: 'Cable',
  CALCA: 'Cal',
  CALMI: 'Cal',
  CALCO: 'Cal',
  CANDAD: 'Candado',
  CANILL: 'Canilla',
  CAPEA: 'Accesorio para caneria',
  CASCOT: 'Cascote',
  CEMENT: 'Cemento',
  CERAMI: 'Ceramico',
  HIERRO: 'Hierro',
  LADRIL: 'Ladrillo',
  MEMBRA: 'Membrana',
  TARUGO: 'Tarugo',
  TEFLON: 'Teflon',
  TERMIC: 'Termica',
  TERMOT: 'Termotanque',
  TORNIL: 'Tornillo',
  TOSCA: 'Tosca',
  UNION: 'Union',
  VANITO: 'Vanitory',
  VARILL: 'Varilla',
  VENTAN: 'Ventana',
  VIGA: 'Viga',
  WEBER: 'Producto Weber',
  YESO: 'Yeso',
}

const brandDictionary = {
  ARGENT: 'Argent',
  AWADUC: 'Awaduct',
  BORGOL: 'Borgol',
  FANELLI: 'Fanelli',
  JELUZ: 'Jeluz',
  KLAUKOL: 'Klaukol',
  'LOMA NEGRA': 'Loma Negra',
  SIPAR: 'Sipar Gerdau',
  TUYANGO: 'Tuyango',
  WEBER: 'Weber',
}

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function fixMojibake(value) {
  return String(value)
    .replaceAll('Ã‘', 'Ñ')
    .replaceAll('Ã±', 'ñ')
    .replaceAll('Ã¡', 'á')
    .replaceAll('Ã©', 'é')
    .replaceAll('Ã­', 'í')
    .replaceAll('Ã³', 'ó')
    .replaceAll('Ãº', 'ú')
}

function prettifyLabel(label) {
  return fixMojibake(label)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getExcelName(rawName) {
  return prettifyLabel(String(rawName).replace(/\s+/g, ' ').trim())
}

function getHelperName(rawName) {
  const normalized = normalizeText(fixMojibake(rawName)).trim()
  if (helperDictionary[normalized]) return helperDictionary[normalized]
  return getExcelName(rawName)
}

function getBrandName(rawName) {
  const normalized = normalizeText(fixMojibake(rawName)).trim()
  if (brandDictionary[normalized]) return brandDictionary[normalized]
  const matchedKey = Object.keys(brandDictionary).find((key) => normalized.includes(key))
  return matchedKey ? brandDictionary[matchedKey] : ''
}

function getCategory(rawName) {
  const normalized = normalizeText(fixMojibake(rawName))
  const matched = categoryDefinitions.find((category) =>
    category.match.some((term) => normalized.includes(term)),
  )

  return (
    matched || {
      key: 'otros-materiales',
      name: 'Otros Materiales',
      shortName: 'Otros',
      description: 'Materiales y accesorios para distintas etapas de obra.',
    }
  )
}

function getPublicBlurb(product) {
  if (product.brandName) {
    return `${product.categoryDescription} Marca referencial: ${product.brandName}.`
  }

  if (product.helperName !== product.excelName) {
    return `${product.categoryDescription} Presentado comercialmente como ${product.helperName.toLowerCase()}.`
  }

  return product.categoryDescription
}

export function formatPrice(value) {
  return value > 0 ? priceFormatter.format(value) : 'Consultar'
}

// Resuelve la ruta de una imagen administrada (guardada en el JSON como
// "product-images/archivo.png" dentro de /public) respetando el base de Vite.
// Acepta tambien URLs absolutas o rutas que ya empiezan con "/".
export function resolveImage(path) {
  if (!path) return null
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path
  return `${import.meta.env.BASE_URL}${path}`
}

export const storefrontProducts = productCatalog
  .map((product) => {
    const category = getCategory(product.name)
    const excelName = getExcelName(product.name)
    const helperName = getHelperName(product.name)
    const brandName = getBrandName(product.name)

    return {
      id: String(product.code),
      code: product.code,
      price: product.price,
      excelName,
      helperName,
      brandName,
      rawName: fixMojibake(product.name),
      categoryKey: category.key,
      categoryName: category.name,
      categoryShortName: category.shortName,
      categoryDescription: category.description,
      publicBlurb: getPublicBlurb({
        categoryDescription: category.description,
        brandName,
        helperName,
        excelName,
      }),
    }
  })
  .sort((a, b) => {
    if (a.categoryName !== b.categoryName) {
      return a.categoryName.localeCompare(b.categoryName, 'es')
    }

    return a.excelName.localeCompare(b.excelName, 'es')
  })

export const categoryCards = Object.values(
  storefrontProducts.reduce((accumulator, product) => {
    const current = accumulator[product.categoryKey] || {
      key: product.categoryKey,
      name: product.categoryName,
      shortName: product.categoryShortName,
      description: product.categoryDescription,
      total: 0,
    }

    current.total += 1
    accumulator[product.categoryKey] = current
    return accumulator
  }, {}),
).sort((a, b) => b.total - a.total)

