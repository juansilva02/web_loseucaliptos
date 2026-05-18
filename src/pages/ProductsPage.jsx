import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { categoryCards, formatPrice, getWhatsAppHref, normalizeText, storefrontProducts } from '../lib/catalog'
import { useCart } from '../context/CartContext'

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  const activeCategory = params.get('categoria') || 'all'
  const normalizedSearch = normalizeText(search.trim())
  const { addItem, itemCount, subtotal } = useCart()

  useEffect(() => {
    setSearch(params.get('q') || '')
  }, [params])

  const visibleProducts = useMemo(() => {
    return storefrontProducts.filter((product) => {
      const matchesCategory = activeCategory === 'all' || product.categoryKey === activeCategory
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(product.excelName).includes(normalizedSearch) ||
        normalizeText(product.helperName).includes(normalizedSearch) ||
        normalizeText(product.brandName).includes(normalizedSearch) ||
        normalizeText(product.categoryName).includes(normalizedSearch)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, normalizedSearch])

  return (
    <section className="storefront-shell">
      <div className="storefront-headline">
        <div>
          <p className="section-kicker">Catalogo de venta</p>
          <h1>Elegi materiales por rubro y pasalos directo a tu pedido.</h1>
          <p>
            Mostramos lo importante para vender: rubro, nombre, marca cuando aplica y precio. Lo
            interno queda afuera de la vista del cliente.
          </p>
        </div>

        <div className="cart-banner">
          <span>{itemCount} items</span>
          <strong>{formatPrice(subtotal)}</strong>
          <Link className="primary-action" to="/checkout">
            Ir al pedido
          </Link>
        </div>
      </div>

      <div className="storefront-toolbar">
        <label className="search-box" htmlFor="store-search">
          <span>Buscar materiales</span>
          <input
            id="store-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej: cemento, canilla, viga, membrana"
          />
        </label>
        <div className="inventory-chipset">
          <button
            type="button"
            className={activeCategory === 'all' ? 'chip-active' : ''}
            onClick={() => setParams({})}
          >
            Todos
          </button>
          {categoryCards.map((category) => (
            <button
              key={category.key}
              type="button"
              className={activeCategory === category.key ? 'chip-active' : ''}
              onClick={() => setParams({ categoria: category.key })}
            >
              {category.shortName}
            </button>
          ))}
        </div>
      </div>

      <div className="public-store-grid">
        {visibleProducts.slice(0, 72).map((product) => (
          <article className="store-card" key={product.id}>
            <div className="product-visual" data-category={product.categoryKey}>
              <span>{product.categoryShortName}</span>
            </div>
            <div className="store-card-head">
              <span className="catalog-category">{product.categoryName}</span>
              {product.brandName ? <span className="store-brand-badge">{product.brandName}</span> : null}
            </div>
            <h3>{product.excelName}</h3>
            <p>{product.publicBlurb}</p>
            <div className="store-card-footer">
              <strong>{formatPrice(product.price)}</strong>
              <div className="store-card-actions">
                <button className="store-secondary-button" type="button" onClick={() => addItem(product)}>
                  Agregar
                </button>
                <a className="product-whatsapp" href={getWhatsAppHref(product)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
