import { useMemo, useState } from 'react'
import cubeIcon from './assets/icono-cubo.png'
import promoCamion from './assets/promo-camion.svg'
import promoMateriales from './assets/promo-materiales.svg'
import {
  categoryCards,
  contactItems,
  formatPrice,
  normalizeText,
  storefrontProducts,
  supplierBrands,
  whatsappBase,
} from './lib/catalog'
import { useCart } from './context/CartContext'
import './App.css'

const topCategories = [
  { label: 'Cemento', key: 'aridos-y-obra-gruesa' },
  { label: 'Cal', key: 'aridos-y-obra-gruesa' },
  { label: 'Arena', key: 'aridos-y-obra-gruesa' },
  { label: 'Hierro', key: 'hierros-y-estructura' },
  { label: 'Ladrillos', key: 'ladrillos-y-bloques' },
  { label: 'Ferreteria', key: 'electricidad-y-ferreteria' },
  { label: 'Griferias', key: 'sanitarios-y-plomeria' },
  { label: 'Envios', key: 'all' },
]

const serviceHighlights = [
  {
    title: 'Envios rapidos',
    text: 'En Zona Sur y alrededores',
  },
  {
    title: 'Stock permanente',
    text: 'Los mejores materiales',
  },
  {
    title: 'Atencion personalizada',
    text: 'Asesoramiento profesional',
  },
  {
    title: 'Medios de pago',
    text: 'Efectivo, transferencia y mas',
  },
]

const valueBanners = [
  {
    title: 'Hacemos tu obra mas simple',
    text: 'Pedi online y recibi en tu obra rapido y seguro.',
    tone: 'light',
  },
  {
    title: 'Zona Sur Bs As',
    text: 'Enviamos a Avellaneda, Lanus, Lomas, Quilmes, Berazategui y mas.',
    tone: 'dark',
  },
  {
    title: 'Pedi por WhatsApp',
    text: 'Consultas, presupuestos y pedidos en el acto.',
    tone: 'accent',
  },
  {
    title: 'Venta real',
    text: 'Productos listos para sumar al pedido y avanzar la compra.',
    tone: 'light',
  },
]

const curatedProducts = [
  {
    title: 'Cemento para obra',
    subtitle: 'Bolsa x 50 kg aprox.',
    match: 'CEMENT',
    categoryKey: 'aridos-y-obra-gruesa',
  },
  {
    title: 'Cal comun',
    subtitle: 'Bolsa para mezcla',
    match: 'CAL CA',
    categoryKey: 'aridos-y-obra-gruesa',
  },
  {
    title: 'Arena fina',
    subtitle: 'Venta por bolson o m3',
    match: 'ARENA',
    categoryKey: 'aridos-y-obra-gruesa',
  },
  {
    title: 'Ladrillo / bloque',
    subtitle: 'Mamposteria para cerramiento',
    match: 'BLOQUE',
    categoryKey: 'ladrillos-y-bloques',
  },
  {
    title: 'Hierro construccion',
    subtitle: 'Varios diametros',
    match: 'VARILL',
    categoryKey: 'hierros-y-estructura',
  },
  {
    title: 'Kit ferreteria basico',
    subtitle: 'Varios articulos',
    match: 'TIJERA',
    categoryKey: 'electricidad-y-ferreteria',
  },
]

function getCuratedShowcase() {
  return curatedProducts.map((item, index) => {
    const match = storefrontProducts.find((product) => normalizeText(product.rawName).includes(item.match))
    const category = categoryCards.find((entry) => entry.key === item.categoryKey)

    return {
      id: match?.id ?? `showcase-${index}`,
      code: match?.code ?? `SC-${index + 1}`,
      price: match?.price ?? 0,
      excelName: item.title,
      subtitle: item.subtitle,
      categoryKey: item.categoryKey,
      categoryName: category?.name ?? 'Materiales',
      brandName: match?.brandName ?? '',
      sourceName: match?.excelName ?? item.title,
    }
  })
}

function App() {
  const { items, itemCount, subtotal, addItem, removeItem, changeQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [showCart, setShowCart] = useState(false)

  const featuredProducts = useMemo(() => getCuratedShowcase(), [])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim())

    return featuredProducts.filter((product) => {
      const matchesCategory = activeCategory === 'all' || product.categoryKey === activeCategory
      const matchesSearch =
        !normalizedSearch ||
        normalizeText(product.excelName).includes(normalizedSearch) ||
        normalizeText(product.subtitle).includes(normalizedSearch) ||
        normalizeText(product.sourceName).includes(normalizedSearch)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, featuredProducts, search])

  return (
    <main className="figma-storefront">
      <header className="utility-strip">
        <div className="utility-cluster">
          <span>Zona Sur, Buenos Aires</span>
          <span>Lun a Vie 7:30 - 17:30</span>
          <span>Sab 7:30 - 13:00</span>
        </div>
        <div className="utility-cluster utility-cluster-right">
          <span>Atencion mayorista y minorista</span>
          <span>Envios a domicilio</span>
        </div>
      </header>

      <header className="commerce-header">
        <div className="brand-lockup">
          <div className="brand-mark">LE</div>
          <div className="brand-copy">
            <strong>Los Eucaliptus Corralon</strong>
            <span>Materiales para la construccion</span>
          </div>
        </div>

        <form className="header-search" onSubmit={(event) => event.preventDefault()}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar productos, marcas o categorias..."
          />
          <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>
            <option value="all">Todas las categorias</option>
            {categoryCards.slice(0, 6).map((category) => (
              <option key={category.key} value={category.key}>
                {category.name}
              </option>
            ))}
          </select>
          <button type="submit">Buscar</button>
        </form>

        <div className="header-actions">
          <div className="account-box">
            <strong>Mi cuenta</strong>
            <span>Ingresar / Registrarme</span>
          </div>
          <button className="cart-box" type="button" onClick={() => setShowCart(true)}>
            <strong>Mi carrito</strong>
            <span>
              {itemCount} items · {formatPrice(subtotal)}
            </span>
          </button>
          <a className="whatsapp-box" href={whatsappBase} target="_blank" rel="noreferrer">
            <strong>11 5974-8316</strong>
            <span>Escribinos por WhatsApp</span>
          </a>
        </div>
      </header>

      <nav className="category-bar">
        <button className="category-bar-main" type="button" onClick={() => setActiveCategory('all')}>
          Todas las categorias
        </button>
        <div className="category-bar-links">
          {topCategories.map((category) => (
            <button
              key={category.label}
              type="button"
              className={activeCategory === category.key ? 'category-link-active' : ''}
              onClick={() => setActiveCategory(category.key)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </nav>

      <section className="hero-section-figma">
        <div className="hero-overlay" />
        <div className="hero-copy">
          <h1>
            Materiales
            <br />
            que construyen
            <br />
            tus proyectos
          </h1>
          <p>Stock permanente • Mejores precios • Envios en Zona Sur</p>
          <div className="hero-cta-row">
            <button className="primary-cta" type="button" onClick={() => window.scrollTo({ top: 700, behavior: 'smooth' })}>
              Compra online
            </button>
            <a className="secondary-cta" href={whatsappBase} target="_blank" rel="noreferrer">
              Pedi por WhatsApp
            </a>
          </div>
          <div className="hero-note">Desde 1954 en Zona Sur, Buenos Aires</div>
        </div>
        <div className="hero-media">
          <img src={promoCamion} alt="Camion de Los Eucaliptus Corralon" />
        </div>
      </section>

      <section className="service-band">
        {serviceHighlights.map((item, index) => (
          <article className="service-band-item" key={item.title}>
            {index === 0 ? (
              <div className="service-band-icon-wrap">
                <img className="service-band-icon" src={cubeIcon} alt="Icono de envios rapidos" />
              </div>
            ) : null}
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </article>
        ))}
      </section>

      <section className="featured-section-figma">
        <div className="section-header">
          <h2>Productos destacados</h2>
          <button className="text-link-button" type="button" onClick={() => setActiveCategory('all')}>
            Ver todos los productos
          </button>
        </div>

        <div className="products-grid">
          {filteredProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-visual-large" data-category={product.categoryKey}>
                <span>{product.categoryName}</span>
              </div>
              <div className="product-copy">
                <h3>{product.excelName}</h3>
                <p>{product.subtitle}</p>
                <strong>{formatPrice(product.price)}</strong>
              </div>
              <div className="product-actions">
                <div className="mini-quantity">
                  <button type="button">-</button>
                  <span>1</span>
                  <button type="button">+</button>
                </div>
                <button className="add-cart-button" type="button" onClick={() => addItem(product)}>
                  Agregar al carrito
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="value-banner-grid">
        {valueBanners.map((banner) => (
          <article className={`value-banner value-banner-${banner.tone}`} key={banner.title}>
            <h3>{banner.title}</h3>
            <p>{banner.text}</p>
            {banner.title === 'Pedi por WhatsApp' ? (
              <a href={whatsappBase} target="_blank" rel="noreferrer">
                11 5974-8316
              </a>
            ) : null}
          </article>
        ))}
      </section>

      <section className="bottom-story-grid">
        <article className="story-card story-card-dark">
          <div className="story-card-copy">
            <h2>
              Construimos
              <br />
              con vos
            </h2>
            <p>Calidad, experiencia y compromiso desde 1954.</p>
            <button className="primary-cta" type="button">
              Conoce mas sobre nosotros
            </button>
          </div>
          <img src={promoMateriales} alt="Materiales para la construccion" />
        </article>

        <article className="story-card story-card-highlight">
          <div className="story-card-copy">
            <h2>
              Tu proyecto,
              <br />
              nuestro compromiso
            </h2>
            <p>Materiales de calidad, al mejor precio y con coordinacion comercial directa.</p>
            <button className="secondary-cta dark" type="button" onClick={() => setShowCart(true)}>
              Ver pedido
            </button>
          </div>
          <div className="story-meta">
            {contactItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
            <div className="story-brands">
              {supplierBrands.map((brand) => (
                <strong key={brand}>{brand}</strong>
              ))}
            </div>
          </div>
        </article>
      </section>

      {showCart ? (
        <aside className="cart-drawer">
          <div className="cart-drawer-header">
            <div>
              <p>Mi carrito</p>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <button type="button" onClick={() => setShowCart(false)}>
              Cerrar
            </button>
          </div>

          <div className="cart-drawer-items">
            {items.length ? (
              items.map((item) => (
                <article className="cart-drawer-item" key={item.id}>
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.brandName || item.categoryName}</p>
                  </div>
                  <div className="cart-drawer-controls">
                    <button type="button" onClick={() => changeQuantity(item.id, item.quantity - 1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => changeQuantity(item.id, item.quantity + 1)}>
                      +
                    </button>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                    <button type="button" onClick={() => removeItem(item.id)}>
                      Quitar
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="cart-empty">
                <p>Tu carrito esta vacio. Agrega materiales desde los destacados.</p>
              </div>
            )}
          </div>

          <div className="cart-drawer-footer">
            <button className="secondary-cta dark" type="button" onClick={clearCart}>
              Vaciar carrito
            </button>
            <a className="primary-cta" href={whatsappBase} target="_blank" rel="noreferrer">
              Finalizar por WhatsApp
            </a>
          </div>
        </aside>
      ) : null}
    </main>
  )
}

export default App
