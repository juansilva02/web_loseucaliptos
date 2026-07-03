import { useState, useMemo } from 'react'
import ProductQuickView from '../components/ProductQuickView'
import { useCart } from '../context/useCart'
import { formatMoney, formatPrice, normalizeText, resolveImage, whatsappBase } from '../lib/catalog'
import { getCatalogQualitySummary } from '../lib/catalog-quality'
import { getBundledProductImage } from '../lib/product-images'
import './CatalogPage.css'

function parseDraftQuantity(value) {
  if (value === '') return ''
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : ''
}

function normalizeDraftQuantity(value) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function toCatalogCardProduct(product, categoryMap) {
  return {
    id: product.id,
    code: product.id,
    excelName: product.name,
    price: product.price,
    brandName: product.brand || '',
    categoryKey: product.category,
    categoryName: categoryMap[product.category] ?? product.category ?? 'Materiales',
    unit: product.unit || 'unidad',
    image: product.image || '',
    featured: product.featured === 1,
    quality: getCatalogQualitySummary(product.name),
  }
}

export default function CatalogPage({
  catalog = { categories: [], products: [] },
  status = 'loading',
  onRetry,
  onBack,
  onOpenCart,
}) {
  const { addItem, itemCount, subtotal } = useCart()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [quantities, setQuantities] = useState({})
  const [selectedProduct, setSelectedProduct] = useState(null)

  const categoryMap = useMemo(() => {
    const map = {}
    for (const cat of catalog.categories) map[cat.key] = cat.name
    return map
  }, [catalog.categories])

  const categoryCounts = useMemo(() => {
    const counts = { all: catalog.products.length }
    for (const p of catalog.products) {
      counts[p.category] = (counts[p.category] || 0) + 1
    }
    return counts
  }, [catalog.products])

  const filtered = useMemo(() => {
    const term = normalizeText(search.trim())
    return catalog.products.filter((p) => {
      const matchesSearch =
        !term ||
        normalizeText(p.name).includes(term) ||
        normalizeText(p.brand).includes(term) ||
        normalizeText(categoryMap[p.category] ?? '').includes(term)
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [search, activeCategory, categoryMap, catalog.products])

  const getQty = (id) => quantities[id] ?? 1

  const setQty = (id, value, commit = false) => {
    const nextValue = commit ? normalizeDraftQuantity(value) : parseDraftQuantity(value)
    setQuantities((prev) => ({ ...prev, [id]: nextValue }))
  }

  const changeQty = (id, delta) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, normalizeDraftQuantity(prev[id]) + delta) }))
  }

  const handleAdd = (product) => {
    addItem(product, normalizeDraftQuantity(getQty(product.id)))
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }))
  }

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <button className="catalog-back-btn" type="button" onClick={onBack}>
          ← Volver
        </button>
        <div className="catalog-header-title">
          <h1>Catalogo</h1>
          <span>{status === 'ok' ? `${catalog.products.length} productos` : 'Cargando...'}</span>
        </div>
        <button className="catalog-cart-btn" type="button" onClick={onOpenCart}>
          <strong>Mi carrito - {itemCount} items</strong>
          <span>{formatMoney(subtotal)}</span>
        </button>
      </header>

      <div className="catalog-search-wrap">
        <div className="catalog-search-field">
          <input
            type="search"
            className="catalog-search-input"
            placeholder="Buscar producto, marca o categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          {search ? (
            <button
              className="catalog-search-clear"
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar busqueda"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="catalog-cats-wrap">
        <div className="catalog-cats">
          <button
            className={`catalog-cat-btn${activeCategory === 'all' ? ' catalog-cat-btn-active' : ''}`}
            type="button"
            onClick={() => setActiveCategory('all')}
          >
            Todos <em>{categoryCounts.all}</em>
          </button>
          {catalog.categories.map((cat) => (
            <button
              key={cat.key}
              className={`catalog-cat-btn${activeCategory === cat.key ? ' catalog-cat-btn-active' : ''}`}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.name} <em>{categoryCounts[cat.key] || 0}</em>
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' ? (
        <div className="route-loading">Cargando catalogo...</div>
      ) : status === 'error' ? (
        <div className="catalog-empty">
          <p>No se pudo cargar el catalogo. Reintenta en unos minutos.</p>
          <button type="button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="catalog-empty">
          <p>No se encontraron productos{search ? ` para "${search}"` : ''}.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setActiveCategory('all')
            }}
          >
            Ver todos
          </button>
        </div>
      ) : (
        <div className="catalog-grid">
          {filtered.map((rawProduct) => {
            const product = toCatalogCardProduct(rawProduct, categoryMap)
            const qty = getQty(product.id)
            const imgSrc = resolveImage(product.image) || getBundledProductImage({ id: product.id, name: product.excelName })
            const consultHref = `${whatsappBase}?text=${encodeURIComponent(`Hola, consulto precio de: ${product.quality.displayName}`)}`
            const purchasable = product.price > 0 && !product.quality.unavailable

            return (
              <article className="catalog-card" key={product.id} data-category={product.categoryKey}>
                {imgSrc ? (
                  <button
                    type="button"
                    className="catalog-card-visual catalog-card-visual-image catalog-card-open"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <img
                      src={imgSrc}
                      alt={product.quality.displayName}
                      className="catalog-card-img"
                      loading="lazy"
                      width="640"
                      height="480"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="catalog-card-visual catalog-card-open"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <span>{product.quality.displayName}</span>
                  </button>
                )}
                <div className="catalog-card-info">
                  <div className="catalog-card-meta">
                    <span className="catalog-badge">{product.categoryName}</span>
                    {product.featured ? <span className="catalog-featured-pill">Destacado</span> : null}
                    {product.quality.unavailable ? <span className="catalog-unavailable-pill">No disponible</span> : null}
                  </div>
                  <div className="catalog-card-body">
                    <h2>{product.quality.displayName}</h2>
                    <p className="catalog-brand">{product.brandName || 'Sin marca'}</p>
                  </div>
                  <div className="catalog-price-block">
                    {product.price > 0 && !product.quality.unavailable ? (
                      <>
                        <strong className="catalog-price">{formatPrice(product.price)}</strong>
                        <span className="catalog-unit">Efectivo, transferencia y debito. Sin descuento.</span>
                        <span className="catalog-installments">Credito: 1 a 3 cuotas +20% · 4 a 6 cuotas +29%</span>
                      </>
                    ) : (
                      <>
                        <strong className="catalog-price catalog-price-consult">{product.quality.unavailable ? 'No disponible' : 'A consultar'}</strong>
                        <span className="catalog-unit">Por {product.unit} · respuesta por WhatsApp</span>
                      </>
                    )}
                  </div>
                  <div className="catalog-card-actions">
                    <button type="button" className="catalog-detail-btn" onClick={() => setSelectedProduct(product)}>
                      Ver detalle
                    </button>
                    {purchasable ? <div className="mini-quantity">
                      <button type="button" aria-label="Disminuir cantidad" onClick={() => changeQty(product.id, -1)}>
                        -
                      </button>
                      <input
                        className="mini-quantity-input"
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => setQty(product.id, e.target.value)}
                        onBlur={(e) => setQty(product.id, e.target.value, true)}
                        aria-label="Cantidad"
                      />
                      <button type="button" aria-label="Aumentar cantidad" onClick={() => changeQty(product.id, 1)}>
                        +
                      </button>
                    </div> : null}
                    {purchasable ? (
                      <button className="add-cart-button" type="button" onClick={() => handleAdd(product)}>
                        Agregar
                      </button>
                    ) : (
                      <a className="catalog-consult-btn" href={consultHref} target="_blank" rel="noreferrer">
                        Consultar precio
                      </a>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="catalog-footer-note">
        Precios en pesos argentinos sujetos a actualizacion.
      </p>

      <ProductQuickView
        product={selectedProduct}
        quantity={selectedProduct ? getQty(selectedProduct.id) : 1}
        onClose={() => setSelectedProduct(null)}
        onChangeQuantity={(value) => selectedProduct && setQty(selectedProduct.id, value)}
        onBlurQuantity={() => selectedProduct && setQty(selectedProduct.id, getQty(selectedProduct.id), true)}
        onAddToCart={() => {
          if (!selectedProduct) return
          handleAdd(selectedProduct)
          setSelectedProduct(null)
          onOpenCart()
        }}
      />
    </div>
  )
}
