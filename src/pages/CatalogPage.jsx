import { useState, useMemo } from 'react'
import catalogData from '../data/featured-catalog.json'
import { formatPrice, resolveImage, whatsappBase } from '../lib/catalog'
import { useCart } from '../context/useCart'
import './CatalogPage.css'

import imgLadrilloHueco12 from '../assets/featured-products/ladrillo-hueco-12.webp'
import imgLadrilloHueco8 from '../assets/featured-products/ladrillo-hueco-8.webp'
import imgLadrilloComun from '../assets/featured-products/ladrillo-comun.webp'
import imgLadrilloCordoba from '../assets/featured-products/ladrillo-cordoba-media-vista.webp'
import imgBloqueLiso10 from '../assets/featured-products/bloque-liso-10.webp'
import imgBloqueLiso13 from '../assets/featured-products/bloque-liso-13.webp'
import imgBloqueLiso20 from '../assets/featured-products/bloque-liso-20.webp'
import imgTelgopor10 from '../assets/featured-products/telgopor-10.webp'
import imgTelgopor125 from '../assets/featured-products/telgopor-12-5.webp'
import imgPortland25 from '../assets/featured-products/portland-25kg.webp'
import imgCalCacique from '../assets/featured-products/cal-cacique-25kg.webp'
import imgArenaBolson from '../assets/featured-products/arena-bolson.webp'
import imgArenaSupelta from '../assets/featured-products/arena-suelta.webp'
import imgCascoteBolson from '../assets/featured-products/cascote-bolson.webp'
import imgPiedraBolson from '../assets/featured-products/piedra-bolson.webp'
import imgHierro42 from '../assets/featured-products/hierro-4-2.webp'
import imgHierro6 from '../assets/featured-products/hierro-6.webp'
import imgHierro8 from '../assets/featured-products/hierro-8.webp'
import imgHierro10 from '../assets/featured-products/hierro-10.webp'
import imgHierro12 from '../assets/featured-products/hierro-12.webp'
import imgPegamentoCeramica from '../assets/featured-products/pegamento-ceramica.webp'
import imgCableUnipolar from '../assets/featured-products/cable-unipolar-2-5.webp'

const productImageMap = {
  'ladrillo-hueco-12':    imgLadrilloHueco12,
  'ladrillo-hueco-8':     imgLadrilloHueco8,
  'ladrillo-comun':       imgLadrilloComun,
  'ladrillo-cordoba-mv':  imgLadrilloCordoba,
  'bloque-cemento-10':    imgBloqueLiso10,
  'bloque-cemento-13':    imgBloqueLiso13,
  'bloque-cemento-20':    imgBloqueLiso20,
  'telgopor-10':          imgTelgopor10,
  'telgopor-12-5':        imgTelgopor125,
  'portland-25kg':        imgPortland25,
  'cal-25kg':             imgCalCacique,
  'arena-bolson':         imgArenaBolson,
  'arena-fina-bolsa':     imgArenaSupelta,
  'arena-gruesa-bolsa':   imgArenaSupelta,
  'cascote-bolson':       imgCascoteBolson,
  'piedra-partida':       imgPiedraBolson,
  'hierro-4-2':           imgHierro42,
  'hierro-6':             imgHierro6,
  'hierro-8':             imgHierro8,
  'hierro-10':            imgHierro10,
  'hierro-12':            imgHierro12,
  'pegamento-ceramica':   imgPegamentoCeramica,
  'cable-unipolar-2-5':   imgCableUnipolar,
}

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
    const visible = catalogData.products.filter((p) => !p.hidden)
    const counts = { all: visible.length }
    for (const p of visible) {
      counts[p.category] = (counts[p.category] || 0) + 1
    }
    return counts
  }, [])

  const filtered = useMemo(() => {
    const term = normalize(search.trim())
    return catalogData.products.filter((p) => {
      if (p.hidden) return false
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

  const setQty = (id, value) => {
    const parsed = parseInt(value, 10)
    setQuantities((prev) => ({ ...prev, [id]: parsed > 0 ? parsed : 1 }))
  }

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
            const imgSrc = resolveImage(product.image) ?? productImageMap[product.id]
            const consultHref = `${whatsappBase}?text=${encodeURIComponent(
              `Hola, consulto precio de: ${product.name}`,
            )}`

            return (
              <article className="catalog-card" key={product.id} data-category={product.category}>
                {imgSrc ? (
                  <div className="catalog-card-visual catalog-card-visual-image">
                    <img
                      src={imgSrc}
                      alt={product.name}
                      className="catalog-card-img"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="catalog-card-visual">
                    <span>{product.name}</span>
                  </div>
                )}
                <div className="catalog-card-info">
                  <div className="catalog-card-meta">
                    <span className="catalog-badge">{catName}</span>
                  </div>
                  <div className="catalog-card-body">
                    <h2>{product.name}</h2>
                    <p className="catalog-brand">{product.brand || 'Sin marca'}</p>
                  </div>
                  <div className="catalog-price-block">
                    {product.price > 0 ? (
                      <>
                        <strong className="catalog-price">{formatPrice(product.price)}</strong>
                        <span className="catalog-unit">Por {product.unit}</span>
                        <span className="catalog-installments">💳 3 y 6 cuotas sin interés</span>
                      </>
                    ) : (
                      <>
                        <strong className="catalog-price catalog-price-consult">A consultar</strong>
                        <span className="catalog-unit">Por {product.unit} · respuesta por WhatsApp</span>
                      </>
                    )}
                  </div>
                  <div className="catalog-card-actions">
                    <div className="mini-quantity">
                      <button type="button" aria-label="Disminuir cantidad" onClick={() => changeQty(product.id, -1)}>
                        −
                      </button>
                      <input
                        className="mini-quantity-input"
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => setQty(product.id, e.target.value)}
                        onBlur={(e) => setQty(product.id, e.target.value)}
                        aria-label="Cantidad"
                      />
                      <button type="button" aria-label="Aumentar cantidad" onClick={() => changeQty(product.id, 1)}>
                        +
                      </button>
                    </div>
                    {product.price > 0 ? (
                      <button className="add-cart-button" type="button" onClick={() => handleAdd(product)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
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
        Precios en pesos argentinos sujetos a actualización. Última actualización: {catalogData.updatedAt}.
      </p>
    </div>
  )
}
