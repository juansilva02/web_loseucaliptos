import { useEffect, useMemo, useState } from 'react'
import cubeIcon from './assets/icono-cubo.png'
import logoHeader from './assets/logo-header-los-eucaliptos.png'
import promoCamion from './assets/promo-camion.png'
import promoMateriales from './assets/promo-cta-corralon.png'
import imgLadrilloHueco12 from './assets/featured-products/ladrillo-hueco-12.png'
import imgLadrilloHueco8 from './assets/featured-products/ladrillo-hueco-8.png'
import imgLadrilloComun from './assets/featured-products/ladrillo-comun.png'
import imgPortland25 from './assets/featured-products/portland-25kg.png'
import imgCalCacique from './assets/featured-products/cal-cacique-25kg.png'
import imgBloqueLiso13 from './assets/featured-products/bloque-liso-13.png'
import imgBloqueLiso20 from './assets/featured-products/bloque-liso-20.png'
import imgBloqueLiso10 from './assets/featured-products/bloque-liso-10.png'
import imgHierro6 from './assets/featured-products/hierro-6.png'
import imgHierro8 from './assets/featured-products/hierro-8.png'
import imgHierro10 from './assets/featured-products/hierro-10.png'
import imgHierro42 from './assets/featured-products/hierro-4-2.png'
import imgLadrilloCordoba from './assets/featured-products/ladrillo-cordoba-media-vista.png'
import imgArenaBolson from './assets/featured-products/arena-bolson.png'
import imgPegamentoCeramica from './assets/featured-products/pegamento-ceramica.png'
import imgTelgopor10 from './assets/featured-products/telgopor-10.png'
import imgTelgopor125 from './assets/featured-products/telgopor-12-5.png'
import imgCableUnipolar from './assets/featured-products/cable-unipolar-2-5.png'
import {
  categoryCards,
  contactItems,
  formatPrice,
  normalizeText,
  storefrontProducts,
  supplierBrands,
  whatsappBase,
  whatsappBosques,
} from './lib/catalog'
import { useCart } from './context/CartContext'
import CatalogPage from './pages/CatalogPage'
import featuredCatalog from './data/featured-catalog.json'
import './App.css'

const serviceHighlights = [
  { icon: 'delivery', title: 'Envios rapidos', text: 'En Zona Sur y alrededores' },
  { icon: 'stock', title: 'Stock permanente', text: 'Los mejores materiales' },
  { icon: 'support', title: 'Atencion personalizada', text: 'Asesoramiento profesional' },
  { icon: 'payment', title: 'Medios de pago', text: 'Efectivo, transferencia y mas' },
]

const heroSignals = [
  '3 y 6 cuotas con todos los bancos',
  'Pedidos por WhatsApp con respuesta directa',
  'Envios rapidos en Zona Sur y alrededores',
]

const branches = [
  {
    name: 'Corralon Los Eucaliptus "Solano"',
    kicker: 'Sucursal Solano',
    heading: 'Visitanos en Av. Monteverde 2766',
    description:
      'Estamos en San Francisco Solano, Zona Sur. Podes acercarte o escribirnos por WhatsApp para coordinar el pedido y la entrega.',
    address: 'Av. Monteverde 2766, San Francisco Solano, Buenos Aires',
    hours: 'Lun a Vie 8:00 a 12:00 y 14:00 a 19:00 | Sab 08:00 a 14:00',
    mapsEmbedUrl: 'https://www.google.com/maps?q=-34.7904685,-58.3096963&output=embed',
    mapsDirectionsUrl:
      'https://www.google.com/maps/place/Corral%C3%B3n+Los+Eucaliptus+%22Solano%22/@-34.7904685,-58.3096963,17z/data=!3m1!4b1!4m6!3m5!1s0x95a32c71520b4479:0x4a3a34f33c1db2be!8m2!3d-34.7904685!4d-58.3096963!16s%2Fg%2F11c6pnxypl?hl=en-US&entry=ttu&g_ep=EgoyMDI2MDYwMS4wIKXMDSoASAFQAw%3D%3D',
  },
  {
    name: 'Corralon Los Eucaliptus "Bosques"',
    kicker: 'Sucursal Bosques',
    heading: 'Visitanos en Av. Guillermo Hudson 2855',
    description:
      'Encontranos en Bosques, Florencio Varela. Los mismos materiales, la misma atencion y el mismo compromiso de siempre.',
    address: 'Av. Guillermo Hudson 2855, Bosques, Buenos Aires',
    phone: '11 3062-3113',
    hours: 'Lun a Vie 08:00 a 18:00 | Sab 08:00 a 15:00',
    mapsEmbedUrl: 'https://www.google.com/maps?q=-34.8315412,-58.2423633&output=embed',
    mapsDirectionsUrl:
      'https://www.google.com/maps/place/Corralon+Los+Eucaliptus+%22Bosques%22/@-34.8315412,-58.2449382,17z/data=!3m1!4b1!4m6!3m5!1s0x95a329fb5902748d:0xc9956ec6f35647e6!8m2!3d-34.8315412!4d-58.2423633!16s%2Fg%2F11l2fcpsk1?entry=tts',
  },
]

const utilityHighlights = [
  {
    title: 'Envios coordinados',
    text: 'Recibi materiales en obra con entrega programada en Zona Sur.',
    tone: 'light',
  },
  {
    title: 'Medios de pago',
    text: 'Efectivo, transferencia, debito y credito con opciones de cuotas.',
    tone: 'dark',
  },
  {
    title: 'Hace tu pedido',
    text: 'Nombre, CUIL, direccion y forma de pago para preparar la entrega.',
    tone: 'accent',
  },
  {
    title: 'WhatsApp directo',
    text: 'Consultas, presupuestos y confirmacion comercial en el acto.',
    tone: 'light',
  },
]

const productImages = {
  'LADRILLO HUECO 12': imgLadrilloHueco12,
  'LADRILLO HUECO 8': imgLadrilloHueco8,
  'LADRILLO COMUN': imgLadrilloComun,
  'PORTLAND 25': imgPortland25,
  'CACIQUE MAX 25': imgCalCacique,
  'BLOQUE LISO 13': imgBloqueLiso13,
  'BLOQUE LISO 20': imgBloqueLiso20,
  'BLOQUE LISO 10': imgBloqueLiso10,
  'HIERRO 6': imgHierro6,
  'HIERRO 8': imgHierro8,
  'HIERRO 10': imgHierro10,
  'HIERRO 4,2': imgHierro42,
  'CORDOBA MEDIA VISTA': imgLadrilloCordoba,
  'ARENA BOLSON': imgArenaBolson,
  'PEGAMENTO CERAMICA': imgPegamentoCeramica,
  'TELGOPOR 10': imgTelgopor10,
  'TELGOPOR 12.5': imgTelgopor125,
  'UNIPOLAR 1 X2.5': imgCableUnipolar,
}

function getCuratedShowcase() {
  return featuredCatalog.featured.map((item, index) => {
    const match = storefrontProducts.find((product) => normalizeText(product.rawName).includes(item.match))
    const category = categoryCards.find((entry) => entry.key === item.categoryKey)

    return {
      id: match?.id ?? `showcase-${index}`,
      code: match?.code ?? `SC-${index + 1}`,
      price: item.priceOverride ?? match?.price ?? 0,
      excelName: item.title,
      subtitle: item.subtitle,
      categoryKey: item.categoryKey,
      categoryName: category?.name ?? 'Materiales',
      brandName: match?.brandName ?? '',
      sourceName: match?.excelName ?? item.title,
      image: productImages[item.match] ?? null,
    }
  })
}

function ServiceIcon({ icon, title }) {
  if (icon === 'delivery') {
    return (
      <div className="service-band-icon-wrap">
        <img className="service-band-icon" src={cubeIcon} alt={`Icono de ${title.toLowerCase()}`} />
      </div>
    )
  }

  if (icon === 'stock') {
    return (
      <div className="service-band-glyph" aria-hidden="true">
        <span className="glyph glyph-box" />
      </div>
    )
  }

  if (icon === 'support') {
    return (
      <div className="service-band-glyph" aria-hidden="true">
        <span className="glyph glyph-badge" />
      </div>
    )
  }

  return (
    <div className="service-band-glyph" aria-hidden="true">
      <span className="glyph glyph-card" />
    </div>
  )
}

function buildWhatsappOrderMessage({ items, subtotal }) {
  const itemLines = items.map((item) => `- ${item.name} x${item.quantity} | ${formatPrice(item.price * item.quantity)}`)

  return [
    'Hola, quiero hacer este pedido:',
    '',
    ...itemLines,
    '',
    `Subtotal: ${formatPrice(subtotal)}`,
    '',
    'Aguardo contacto del equipo de ventas para continuar la compra.',
  ]
    .filter(Boolean)
    .join('\n')
}

function App() {
  const { items, itemCount, subtotal, addItem, removeItem, changeQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState('all')
  const [featuredSearch, setFeaturedSearch] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSignal, setActiveSignal] = useState(0)
  const [activeProduct, setActiveProduct] = useState(0)
  const [productQuantities, setProductQuantities] = useState({})
  const [activeLocation, setActiveLocation] = useState(0)
  const [currentPage, setCurrentPage] = useState('home')

  const featuredProducts = useMemo(() => getCuratedShowcase(), [])

  const filteredProducts = useMemo(() => {
    const term = normalizeText(featuredSearch.trim())
    return featuredProducts.filter((product) => {
      const matchesCategory = activeCategory === 'all' || product.categoryKey === activeCategory
      const matchesSearch = !term ||
        normalizeText(product.excelName).includes(term) ||
        normalizeText(product.categoryName).includes(term) ||
        normalizeText(product.brandName).includes(term)
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, featuredSearch, featuredProducts])

  const floatingCartItems = items.slice(0, 3)
  const cartMsg = encodeURIComponent(buildWhatsappOrderMessage({ items, subtotal }))
  const cartWhatsappUrl = `${whatsappBase}?text=${cartMsg}`
  const cartWhatsappBosques = `${whatsappBosques}?text=${cartMsg}`

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSignal((current) => (current + 1) % heroSignals.length)
    }, 2600)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!filteredProducts.length) {
      setActiveProduct(0)
      return
    }

    const timer = window.setInterval(() => {
      setActiveProduct((current) => (current + 1) % filteredProducts.length)
    }, 2800)

    return () => window.clearInterval(timer)
  }, [filteredProducts])

  const scrollToProducts = () => {
    const section = document.getElementById('productos-destacados')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const changeProductDraftQuantity = (productId, delta) => {
    setProductQuantities((current) => {
      const next = Math.max(1, (current[productId] ?? 1) + delta)
      return { ...current, [productId]: next }
    })
  }

  const getProductDraftQuantity = (productId) => productQuantities[productId] ?? 1

  const handleAddToCart = (product) => {
    addItem(product, getProductDraftQuantity(product.id))
    setProductQuantities((current) => ({ ...current, [product.id]: 1 }))
  }

  const prevBranch = () => setActiveLocation((current) => (current - 1 + branches.length) % branches.length)
  const nextBranch = () => setActiveLocation((current) => (current + 1) % branches.length)

  return (
    <main className="figma-storefront">
      {currentPage === 'catalog' ? (
        <CatalogPage onBack={() => setCurrentPage('home')} onOpenCart={() => setShowCart(true)} />
      ) : (
        <>
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

      <header className={`commerce-header${isScrolled ? ' commerce-header-scrolled' : ''}`}>
        <div className="brand-lockup">
          <img className="brand-logo-image" src={logoHeader} alt="Los Eucaliptus Corralon" />
        </div>

        <div className="header-actions">
          <button className="cart-box" type="button" onClick={() => setShowCart(true)}>
            <strong>Mi carrito</strong>
            <span>{itemCount} items | {formatPrice(subtotal)}</span>
          </button>
          <div className="whatsapp-group">
            <a className="whatsapp-box-branch" href={whatsappBase} target="_blank" rel="noreferrer">
              <strong>Solano</strong>
              <span>11 5974-8316</span>
            </a>
            <a className="whatsapp-box-branch" href={whatsappBosques} target="_blank" rel="noreferrer">
              <strong>Bosques</strong>
              <span>11 3062-3113</span>
            </a>
          </div>
        </div>
      </header>

      <div className="category-bar">
        <div className="category-bar-item">Todos los productos</div>
        <div className="category-bar-item">Medios de pago</div>
      </div>

      <section className="hero-section-figma">
        <div className="hero-overlay" />
        <div className="hero-copy">
          <h1>
            Materiales
            <br />
            que construyen
            <br />
            tu hogar
          </h1>
          <p>Stock permanente | Mejores precios | Envios en Zona Sur</p>
          <div className="hero-cta-row">
            <button className="primary-cta" type="button" onClick={scrollToProducts}>
              Compra online
            </button>
            <div className="hero-wa-group">
              <a className="secondary-cta hero-wa-btn" href={whatsappBase} target="_blank" rel="noreferrer">
                WhatsApp Solano
              </a>
              <a className="secondary-cta hero-wa-btn" href={whatsappBosques} target="_blank" rel="noreferrer">
                WhatsApp Bosques
              </a>
            </div>
          </div>
          <div className="hero-note">Desde 1954 en Zona Sur, Buenos Aires</div>
          <div className="hero-signals">
            {heroSignals.map((signal, index) => (
              <span className={activeSignal === index ? 'hero-signal-active' : ''} key={signal}>
                {signal}
              </span>
            ))}
          </div>
        </div>
        <div className="hero-media">
          <img src={promoCamion} alt="Camion de Los Eucaliptus Corralon" />
        </div>
      </section>

      <section className="service-band">
        {serviceHighlights.map((item) => (
          <article className="service-band-item" key={item.title}>
            <ServiceIcon icon={item.icon} title={item.title} />
            <div className="service-band-copy">
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="featured-section-figma" id="productos-destacados">
        <div className="section-header">
          <h2>Productos destacados</h2>
          <div className="section-header-actions">
            <label className="featured-filter">
              <span>Filtrar</span>
              <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>
                <option value="all">Todas las categorias</option>
                {categoryCards.slice(0, 6).map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="text-link-button" type="button" onClick={() => setCurrentPage('catalog')}>
              Ver todos los productos
            </button>
          </div>
        </div>

        <div className="featured-search-wrap">
          <input
            className="featured-search-input"
            type="search"
            placeholder="Buscar producto..."
            value={featuredSearch}
            onChange={(e) => setFeaturedSearch(e.target.value)}
            autoComplete="off"
          />
          {featuredSearch && (
            <button className="featured-search-clear" type="button" onClick={() => setFeaturedSearch('')} aria-label="Limpiar">×</button>
          )}
        </div>

        <div className="products-grid">
          {filteredProducts.map((product, index) => (
            <article
              className={`product-card${activeProduct === index ? ' product-card-active' : ''}`}
              key={product.id}
              onMouseEnter={() => setActiveProduct(index)}
            >
              {product.image ? (
                <div className="product-visual-large product-visual-image-frame">
                  <img className="product-visual-image" src={product.image} alt={product.excelName} />
                </div>
              ) : (
                <div className="product-visual-large" data-category={product.categoryKey}>
                  <span>{product.excelName}</span>
                </div>
              )}
              <div className="product-copy">
                <h3>{product.excelName}</h3>
                <p>{product.subtitle}</p>
                <strong>{formatPrice(product.price)}</strong>
              </div>
              <div className="product-actions">
                <div className="mini-quantity">
                  <button type="button" onClick={() => changeProductDraftQuantity(product.id, -1)}>
                    -
                  </button>
                  <span>{getProductDraftQuantity(product.id)}</span>
                  <button type="button" onClick={() => changeProductDraftQuantity(product.id, 1)}>
                    +
                  </button>
                </div>
                <button className="add-cart-button" type="button" onClick={() => handleAddToCart(product)}>
                  Agregar al carrito
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="benefits-rail">
        <div className="benefits-rail-intro">
          <p className="section-kicker">Compra simple</p>
          <h3>Todo lo importante para comprar rapido y coordinar tu entrega.</h3>
        </div>
        <div className="benefits-rail-grid">
          {utilityHighlights.map((banner) => (
            <article className={`benefit-tile benefit-tile-${banner.tone}`} key={banner.title}>
              <strong>{banner.title}</strong>
              <p>{banner.text}</p>
              {banner.title === 'WhatsApp directo' ? (
                <div className="benefit-wa-links">
                  <a href={whatsappBase} target="_blank" rel="noreferrer">
                    Solano: 11 5974-8316
                  </a>
                  <a href={whatsappBosques} target="_blank" rel="noreferrer">
                    Bosques: 11 3062-3113
                  </a>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="location-section">
        <div className="location-carousel">
          <div className="location-carousel-viewport">
            {branches.map((branch, i) => (
              <article
                key={branch.name}
                className={`location-card${activeLocation === i ? ' location-card-visible' : ''}`}
              >
                <div className="location-copy">
                  <p className="section-kicker">{branch.kicker}</p>
                  <h3>{branch.heading}</h3>
                  <p>{branch.description}</p>
                  <div className="location-meta">
                    <span>{branch.address}</span>
                    {branch.phone ? <span>Tel: {branch.phone}</span> : null}
                    <span>{branch.hours}</span>
                  </div>
                  <a className="primary-cta" href={branch.mapsDirectionsUrl} target="_blank" rel="noreferrer">
                    Abrir en Google Maps
                  </a>
                </div>
                <div className="location-map-frame">
                  <iframe
                    title={`Mapa de ${branch.name}`}
                    src={branch.mapsEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="location-carousel-controls">
            <button
              className="location-carousel-btn"
              type="button"
              onClick={prevBranch}
              aria-label="Sucursal anterior"
            >
              ←
            </button>
            <div className="location-carousel-dots">
              {branches.map((branch, i) => (
                <button
                  key={branch.name}
                  className={`location-dot${activeLocation === i ? ' location-dot-active' : ''}`}
                  type="button"
                  onClick={() => setActiveLocation(i)}
                  aria-label={`Ver ${branch.name}`}
                />
              ))}
            </div>
            <button
              className="location-carousel-btn"
              type="button"
              onClick={nextBranch}
              aria-label="Siguiente sucursal"
            >
              →
            </button>
          </div>
        </div>
      </section>

      <section className="bottom-story-grid">
        <article className="story-card story-card-dark story-card-image-only">
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

      <footer className="site-footer">
        <div className="site-footer-brand">
          <strong>Los Eucaliptus Corralon</strong>
          <p>Materiales para la construccion, envios en Zona Sur y atencion comercial directa.</p>
        </div>
        <div className="site-footer-block">
          <strong>Contacto</strong>
          <span>Av. Monteverde 2766, San Francisco Solano</span>
          <span>+54 9 11 5974-8316</span>
          <span>Lun a Vie 8:00 a 12:00 y 14:00 a 19:00</span>
          <span>Sabados de 08:00 a 14:00</span>
        </div>
        <div className="site-footer-block">
          <strong>Compras</strong>
          <span>Pedidos por WhatsApp</span>
          <span>Efectivo, transferencias, credito y debito</span>
          <span>1 a 3 cuotas 20% | 4 a 6 cuotas 29%</span>
        </div>
      </footer>
        </>
      )}

      <a
        className={`floating-whatsapp${showCart ? ' floating-whatsapp-shifted' : ''}`}
        href={whatsappBase}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <svg className="floating-whatsapp-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M16 3C8.82 3 3 8.82 3 16c0 2.28.6 4.52 1.73 6.48L3 29l6.72-1.7A13 13 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3z" fill="white"/>
          <path d="M23.14 20.08c-.31-.16-1.83-.9-2.11-.99-.28-.1-.49-.16-.69.15-.2.31-.78.99-.95 1.19-.17.2-.35.22-.66.07-.31-.16-1.3-.48-2.48-1.52-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.47.13-.63.14-.14.31-.37.47-.56.16-.19.2-.31.31-.52.1-.2.05-.38-.02-.54-.08-.16-.69-1.66-.94-2.27-.25-.6-.5-.52-.69-.53H12.3c-.2 0-.52.07-.79.38-.28.31-1.06 1.04-1.06 2.53 0 1.5 1.09 2.94 1.24 3.14.15.2 2.15 3.28 5.21 4.6.73.31 1.3.5 1.74.64.73.23 1.4.2 1.92.12.59-.09 1.83-.75 2.08-1.47.26-.72.26-1.34.18-1.47-.07-.13-.28-.2-.59-.36z" fill="#22c55e"/>
        </svg>
      </a>

      {itemCount ? (
        <button className="floating-cart" type="button" onClick={() => setShowCart(true)}>
          <div className="floating-cart-head">
            <strong>Mi carrito</strong>
            <span>{itemCount} items</span>
          </div>
          <div className="floating-cart-items">
            {floatingCartItems.map((item) => (
              <div className="floating-cart-line" key={item.id}>
                <span>{item.name}</span>
                <strong>x{item.quantity}</strong>
              </div>
            ))}
          </div>
          <div className="floating-cart-foot">
            <strong>{formatPrice(subtotal)}</strong>
            <span>Ver pedido</span>
          </div>
        </button>
      ) : null}

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
            <div className="cart-send-group">
              <a className="primary-cta" href={cartWhatsappUrl} target="_blank" rel="noreferrer">
                Enviar — Solano
              </a>
              <a className="primary-cta" href={cartWhatsappBosques} target="_blank" rel="noreferrer">
                Enviar — Bosques
              </a>
            </div>
          </div>
        </aside>
      ) : null}
    </main>
  )
}

export default App
