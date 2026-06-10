import { useState, useMemo } from 'react'
import catalogData from '../data/featured-catalog.json'
import { formatPrice, whatsappBase } from '../lib/catalog'
import { useCart } from '../context/CartContext'
import './CatalogPage.css'

import imgLadrilloHueco12 from '../assets/featured-products/ladrillo-hueco-12.png'
import imgLadrilloHueco8 from '../assets/featured-products/ladrillo-hueco-8.png'
import imgLadrilloComun from '../assets/featured-products/ladrillo-comun.png'
import imgLadrilloCordoba from '../assets/featured-products/ladrillo-cordoba-media-vista.png'
import imgBloqueLiso10 from '../assets/featured-products/bloque-liso-10.png'
import imgBloqueLiso13 from '../assets/featured-products/bloque-liso-13.png'
import imgBloqueLiso20 from '../assets/featured-products/bloque-liso-20.png'
import imgTelgopor10 from '../assets/featured-products/telgopor-10.png'
import imgTelgopor125 from '../assets/featured-products/telgopor-12-5.png'
import imgPortland25 from '../assets/featured-products/portland-25kg.png'
import imgCalCacique from '../assets/featured-products/cal-cacique-25kg.png'
import imgArenaBolson from '../assets/featured-products/arena-bolson.png'
import imgArenaSupelta from '../assets/featured-products/arena-suelta.png'
import imgCascoteBolson from '../assets/featured-products/cascote-bolson.png'
import imgPiedraBolson from '../assets/featured-products/piedra-bolson.png'
import imgHierro42 from '../assets/featured-products/hierro-4-2.png'
import imgHierro6 from '../assets/featured-products/hierro-6.png'
import imgHierro8 from '../assets/featured-products/hierro-8.png'
import imgHierro10 from '../assets/featured-products/hierro-10.png'
import imgHierro12 from '../assets/featured-products/hierro-12.png'
import imgPegamentoCeramica from '../assets/featured-products/pegamento-ceramica.png'
import imgCableUnipolar from '../assets/featured-products/cable-unipolar-2-5.png'

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
                {productImageMap[product.id] ? (
                  <div className="catalog-card-visual catalog-card-visual-image">
                    <img src={productImageMap[product.id]} alt={product.name} className="catalog-card-img" />
                  </div>
                ) : (
                  <div className="catalog-card-visual" />
                )}
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
                    <button type="button" aria-label="Disminuir cantidad" onClick={() => changeQty(product.id, -1)}>
                      -
                    </button>
                    <span>{qty}</span>
                    <button type="button" aria-label="Aumentar cantidad" onClick={() => changeQty(product.id, 1)}>
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
