// Prerender de /catalogo: genera dist/catalogo/index.html con meta propias,
// JSON-LD (ItemList de Productos + BreadcrumbList) y un listado en <noscript>,
// para que el catálogo sea visible/indexable aunque sea una SPA.
// Corre en el build (post vite). En el VPS toma datos en vivo de la API;
// en local cae al JSON estático.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SITE = 'https://corralonloseucaliptus.com'

async function getCatalog() {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/catalog', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const d = await res.json()
      return { categories: d.categories || [], products: d.products || [], source: 'api' }
    }
  } catch {
    /* sin API: usar el JSON estático */
  }
  const d = JSON.parse(readFileSync(join(root, 'src/data/featured-catalog.json'), 'utf8'))
  return { categories: d.categories || [], products: d.products || [], source: 'static' }
}

const { products, source } = await getCatalog()
const active = products.filter((p) => !p.hidden)

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const fmtPrice = (n) => (n > 0 ? `$${Number(n).toLocaleString('es-AR')}` : 'A consultar')
const absImg = (img) => (!img ? null : img.startsWith('http') ? img : SITE + img)

const TITLE = 'Catálogo de Materiales de Construcción — Precios | Los Eucaliptus'
const DESC =
  'Más de 70 productos: ladrillos, cemento, hierro, áridos y más con precios actualizados. Stock permanente y envíos en Zona Sur.'

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE + '/' },
    { '@type': 'ListItem', position: 2, name: 'Catálogo', item: SITE + '/catalogo' },
  ],
}

const itemList = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Catálogo Los Eucaliptus',
  numberOfItems: active.length,
  itemListElement: active.map((p, i) => {
    const product = { '@type': 'Product', name: p.name }
    if (p.brand) product.brand = { '@type': 'Brand', name: p.brand }
    const img = absImg(p.image)
    if (img) product.image = img
    product.offers = {
      '@type': 'Offer',
      priceCurrency: 'ARS',
      availability: 'https://schema.org/InStock',
      url: SITE + '/catalogo',
      ...(p.price > 0 ? { price: p.price } : {}),
    }
    return { '@type': 'ListItem', position: i + 1, item: product }
  }),
}

const shell = readFileSync(join(root, 'dist/index.html'), 'utf8')

let html = shell
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(TITLE)}</title>`)
  .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(DESC)}" />`)
  .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${SITE}/catalogo" />`)
  .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${SITE}/catalogo" />`)
  .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(TITLE)}" />`)

const jsonld =
  `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>\n` +
  `    <script type="application/ld+json">${JSON.stringify(itemList)}</script>`
html = html.replace('</head>', `${jsonld}\n  </head>`)

const seo =
  `<noscript><section id="seo-catalogo"><h1>Catálogo de materiales de construcción</h1>` +
  `<ul>${active.map((p) => `<li>${esc(p.name)} — ${esc(fmtPrice(p.price))}</li>`).join('')}</ul></section></noscript>`
html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    ${seo}`)

mkdirSync(join(root, 'dist/catalogo'), { recursive: true })
writeFileSync(join(root, 'dist/catalogo/index.html'), html)
console.log(`[prerender] dist/catalogo/index.html · ${active.length} productos · fuente: ${source}`)
