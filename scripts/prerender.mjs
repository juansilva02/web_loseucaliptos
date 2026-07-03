import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outputDir = resolve(root, process.env.BUILD_OUT_DIR || 'dist')
const site = 'https://corralonloseucaliptus.com'

async function getCatalog() {
  try {
    const response = await fetch('http://127.0.0.1:3001/api/catalog', {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return {
      categories: data.categories || [],
      products: data.products || [],
      source: 'api',
    }
  } catch (error) {
    if (process.env.PRERENDER_REQUIRE_API === '1') {
      throw new Error(`La API es obligatoria para el prerender de produccion: ${error.message}`)
    }
  }

  const data = JSON.parse(
    readFileSync(join(root, 'src/data/featured-catalog.json'), 'utf8'),
  )
  return {
    categories: data.categories || [],
    products: data.products || [],
    source: 'static',
  }
}

const { products, source } = await getCatalog()
const activeProducts = products.filter((product) => product.active !== 0 && !product.hidden)
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
const formatPrice = (value) => (
  Number(value) > 0 ? `$${Number(value).toLocaleString('es-AR')}` : 'A consultar'
)
const absoluteImage = (image) => (
  !image ? null : image.startsWith('http') ? image : site + image
)
const isUnavailable = (name) => (
  /\b(NO+\s*HAY+|SIN\s+STOCK|NO\s+DISPONIBLE)\b/i.test(String(name || ''))
)

const title = 'Catalogo de Materiales de Construccion - Precios | Los Eucaliptus'
const description =
  'Materiales para construccion con precios actualizados, stock y envios en Zona Sur.'
const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${site}/` },
    { '@type': 'ListItem', position: 2, name: 'Catalogo', item: `${site}/catalogo` },
  ],
}
const itemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Catalogo Los Eucaliptus',
  numberOfItems: activeProducts.length,
  itemListElement: activeProducts.map((productData, index) => {
    const product = { '@type': 'Product', name: productData.name }
    if (productData.brand) product.brand = { '@type': 'Brand', name: productData.brand }
    const image = absoluteImage(productData.image)
    if (image) product.image = image
    if (Number(productData.price) > 0 && !isUnavailable(productData.name)) {
      product.offers = {
        '@type': 'Offer',
        priceCurrency: 'ARS',
        availability: 'https://schema.org/InStock',
        url: `${site}/catalogo`,
        price: productData.price,
      }
    }
    return { '@type': 'ListItem', position: index + 1, item: product }
  }),
}

const shell = readFileSync(join(outputDir, 'index.html'), 'utf8')
let html = shell
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
  .replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  )
  .replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${site}/catalogo" />`,
  )
  .replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${site}/catalogo" />`,
  )
  .replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
  )

const jsonLd = [
  `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`,
  `<script type="application/ld+json">${JSON.stringify(itemList)}</script>`,
].join('\n    ')
html = html.replace('</head>', `    ${jsonLd}\n  </head>`)

const noScript = [
  '<noscript><section id="seo-catalogo">',
  '<h1>Catalogo de materiales de construccion</h1><ul>',
  activeProducts
    .map((product) => `<li>${escapeHtml(product.name)} - ${escapeHtml(formatPrice(product.price))}</li>`)
    .join(''),
  '</ul></section></noscript>',
].join('')
html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    ${noScript}`)

mkdirSync(join(outputDir, 'catalogo'), { recursive: true })
writeFileSync(join(outputDir, 'catalogo', 'index.html'), html)

const buildDate = new Date().toISOString().slice(0, 10)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/sitemap/0.9">
  <url><loc>${site}/</loc><lastmod>${buildDate}</lastmod></url>
  <url><loc>${site}/catalogo</loc><lastmod>${buildDate}</lastmod></url>
</urlset>
`
writeFileSync(join(outputDir, 'sitemap.xml'), sitemap)
console.log(
  `[prerender] catalogo/index.html - ${activeProducts.length} productos - fuente: ${source}`,
)
