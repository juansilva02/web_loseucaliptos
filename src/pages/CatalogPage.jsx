import { useState, useMemo } from 'react'
import catalogData from '../data/featured-catalog.json'
import { formatPrice, whatsappBase } from '../lib/catalog'
import { useCart } from '../context/CartContext'
import './CatalogPage.css'

const normalize = (str) =>
  String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export default function CatalogPage({ onBack, onOpenCart }) {
  const { addItem, itemCount, subtotal } = useCart()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [quantities, setQuantities] = useState({})

  const categoryMap = useMemo(() => {
    const map = {}
    for (const cat of catalogData.categories) map[cat.key] = cat.name
    return map
  }, [])

  const categoryCounts = useMemo(() => {
    const counts = { all: catalogData.products.length }
    for (const p of catalogData.products) {
      counts[p.category] = (counts[p.category] || 0) + 1
    }
    return counts
  }, [])

  const filtered = useMemo(() => {
    const term = normalize(search.trim())
    return catalogData.products.filter((p) => {
      const matchesSearch =
        !term ||
        normalize(p.name).includes(term) ||
        normalize(p.brand).includes(term) ||
        normalize(categoryMap[p.category] ?? '').includes(term)
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [search, activeCategory, categoryMap])

  const getQty = (id) => quantities[id] ?? 1

  const changeQty = (id, delta) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + delta) }))

  const handleAdd = (product) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        brandName: product.brand,
        categoryName: categoryMap[product.category] ?? product.category,
      },
      getQty(product.id),
    )
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }))
  }

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <button className="catalog-back-btn" type="button" onClick={onBack}>
          ← Volver
        </button>
        <div className="catalog-header-title">
          <h1>Catálogo</h1>
          <span>Actualizado {catalogData.updatedAt}</span>
        </div>
        <button className="catalog-cart-btn" type="button" onClick={onOpenCart}>
          <strong>Mi carrito — {itemCount} items</strong>
          <span>{formatPrice(subtotal)}</span>
        </button>
      </header>

      <div className="catalog-search-wrap">
        <div className="catalog-search-field">
          <input
            type="search"
            className="catalog-search-input"
            placeholder="Buscar producto, marca o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          {search && (
            <button
              className="catalog-search-clear"
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
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
          {catalogData.categories.map((cat) => (
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

      {filtered.length === 0 ? (
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
          {filtered.map((product) => {
            const catName = categoryMap[product.category]
            const qty = getQty(product.id)
            const consultHref = `${whatsappBase}?text=${encodeURIComponent(
              `Hola, consulto precio de: ${product.name}`,
            )}`

            return (
              <article className="catalog-card" key={product.id} data-category={product.category}>
                <div className="catalog-card-visual" />
                <div className="catalog-card-top">
                  <span className="catalog-badge">{catName}</span>
                </div>
                <div className="catalog-card-body">
                  <h3>{product.name}</h3>
                  {product.brand && <p className="catalog-brand">{product.brand}</p>}
                  <p className="catalog-unit">Por {product.unit}</p>
                </div>
                <strong className="catalog-price">{formatPrice(product.price)}</strong>
                <div className="catalog-card-actions">
                  <div className="mini-quantity">
                    <button type="button" onClick={() => changeQty(product.id, -1)}>
                      -
                    </button>
                    <span>{qty}</span>
                    <button type="button" onClick={() => changeQty(product.id, 1)}>
                      +
                    </button>
                  </div>
                  {product.price > 0 ? (
                    <button className="add-cart-button" type="button" onClick={() => handleAdd(product)}>
                      Agregar
                    </button>
                  ) : (
                    <a className="catalog-consult-btn" href={consultHref} target="_blank" rel="noreferrer">
                      Consultar precio
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="catalog-footer-note">
        Precios en pesos argentinos sujetos a actualización. Última actualización: {catalogData.updatedAt}.
      </p>
    </div>
  )
}
