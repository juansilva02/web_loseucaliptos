import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import CoverageMap from './components/CoverageMap'
import CoverageChecker from './components/CoverageChecker'
import logoHeader from './assets/logo-header-los-eucaliptos.webp'
import promoCamion from './assets/promo-camion.webp'
import {
  categoryCards,
  formatPrice,
  normalizeText,
  resolveImage,
  storefrontProducts,
  whatsappBase,
  whatsappBosques,
} from './lib/catalog'
import { useCart } from './context/useCart'
import { useAutoRotate, useScrolled } from './hooks'
import { api } from './admin/api'
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
import featuredCatalogFallback from './data/featured-catalog.json'
import { benefitTicker, faqs, heroSignals, branches, purchaseSteps, promoImages } from './data/siteContent'
import { productImages } from './lib/product-images'
import './App.css'

// Icono Instagram inline (lucide v1 ya no exporta iconos de marca)
function InstagramGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function getCuratedShowcase(featuredItems) {
  return featuredItems.map((item, index) => {
    const match = storefrontProducts.find((product) => normalizeText(product.rawName).includes(item.match))
    const category = categoryCards.find((entry) => entry.key === item.categoryKey)

    return {
      id: match?.id ?? `showcase-${index}`,
      code: match?.code ?? `SC-${index + 1}`,
      price: item.priceOverride ?? match?.price ?? 0,
      excelName: item.title,
      subtitle: item.subtitle,
      categoryKey: item.category_key || item.categoryKey,
      categoryName: category?.name ?? 'Materiales',
      brandName: match?.brandName ?? '',
      sourceName: match?.excelName ?? item.title,
      // Prioriza la imagen administrada (subida desde el panel) y cae al mapa estatico.
      image: resolveImage(item.image_url || item.image) ?? productImages[item.match] ?? null,
    }
  })
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
  const isScrolled = useScrolled(24)
  const [activeSignal] = useAutoRotate(heroSignals.length, 2600)
  const [productQuantities, setProductQuantities] = useState({})
  const [activeLocation, setActiveLocation] = useState(0)
  const [activePromo, setActivePromo] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const isCatalog = location.pathname === '/catalogo'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  const [stepsPaused, setStepsPaused] = useState(false)
  const [activeStep, setActiveStep] = useAutoRotate(purchaseSteps.length, 3400, stepsPaused)
  const [showCoverage, setShowCoverage] = useState(false)
  const [deliveryLocation, setDeliveryLocation] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('eucaliptus-delivery-location')) ?? null
    } catch {
      return null
    }
  })

  const [apiFeatured, setApiFeatured] = useState(() => featuredCatalogFallback.featured)

  useEffect(() => {
    let cancelled = false
    api.getPublicFeatured()
      .then((res) => { if (!cancelled && res.featured?.length) setApiFeatured(res.featured) })
      .catch(() => { /* fallback al JSON importado */ })
    return () => { cancelled = true }
  }, [])

  const handleCoverageResult = (location) => {
    setDeliveryLocation(location)
    try {
      window.localStorage.setItem('eucaliptus-delivery-location', JSON.stringify(location))
    } catch {
      /* almacenamiento no disponible */
    }
  }

  const featuredProducts = useMemo(() => getCuratedShowcase(apiFeatured), [apiFeatured])

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

  const [activeProduct, setActiveProduct] = useAutoRotate(filteredProducts.length, 2800)

  const floatingCartItems = items.slice(0, 3)
  const cartMsg = encodeURIComponent(buildWhatsappOrderMessage({ items, subtotal }))
  const cartWhatsappUrl = `${whatsappBase}?text=${cartMsg}`
  const cartWhatsappBosques = `${whatsappBosques}?text=${cartMsg}`

  // Indice resaltado clampeado al rango actual (evita setState dentro del efecto)
  const highlightedProduct = filteredProducts.length ? activeProduct % filteredProducts.length : -1

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

  const setProductDraftQuantity = (productId, value) => {
    const parsed = parseInt(value, 10)
    setProductQuantities((current) => ({ ...current, [productId]: parsed > 0 ? parsed : 1 }))
  }

  const getProductDraftQuantity = (productId) => productQuantities[productId] ?? 1

  const handleAddToCart = (product) => {
    addItem(product, getProductDraftQuantity(product.id))
    setProductQuantities((current) => ({ ...current, [product.id]: 1 }))
  }

  const prevBranch = () => setActiveLocation((current) => (current - 1 + branches.length) % branches.length)
  const nextBranch = () => setActiveLocation((current) => (current + 1) % branches.length)

  const prevPromo = () => setActivePromo((c) => (c - 1 + promoImages.length) % promoImages.length)
  const nextPromo = () => setActivePromo((c) => (c + 1) % promoImages.length)

  return (
    <main className="figma-storefront">
      {isCatalog ? (
        <Suspense fallback={<div className="route-loading">Cargando catálogo…</div>}>
          <CatalogPage onBack={() => navigate('/')} onOpenCart={() => setShowCart(true)} />
        </Suspense>
      ) : (
        <>
      <div className="benefits-bar" aria-label="Beneficios">
        <div className="benefits-bar-track">
          {[...benefitTicker, ...benefitTicker].map((item, index) => (
            <div
              className="benefits-bar-item"
              key={index}
              aria-hidden={index >= benefitTicker.length ? 'true' : undefined}
            >
              <item.Icon className="benefits-bar-icon" size={16} strokeWidth={2.25} aria-hidden="true" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <header className={`commerce-header${isScrolled ? ' commerce-header-scrolled' : ''}`}>
        <div className="brand-lockup">
          <img className="brand-logo-image" src={logoHeader} alt="Los Eucaliptus Corralon" />
        </div>

        <div className="header-actions">
          <button className="coverage-box" type="button" onClick={() => setShowCoverage(true)}>
            <svg className="header-location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="header-location-text">
              <span className="header-location-label">Enviar a</span>
              <span className="header-location-val">
                {deliveryLocation ? deliveryLocation.label : 'Seleccionar ubicacion'}
                {deliveryLocation?.zone === 'in' ? ' ✓' : ''}
              </span>
            </span>
          </button>
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

      <section className="hero-section">
        <div className="hero-bg">
          <img src={promoCamion} alt="Camion de Los Eucaliptus Corralon" />
        </div>
        <div className="hero-content">
          <p className="hero-eyebrow">Desde 1954 · Solano y Bosques, Zona Sur</p>
          <h1>
            Corralón de
            <br />
            materiales en
            <br />
            Zona Sur
          </h1>
          <p>Materiales que construyen tu hogar · Stock permanente · Envíos propios</p>
          <div className="hero-cta-row">
            <button className="primary-cta hero-primary-cta" type="button" onClick={scrollToProducts}>
              Comprá online
            </button>
            <div className="hero-wa-group">
              <span className="hero-wa-label">o pedí por WhatsApp</span>
              <div className="hero-wa-buttons">
                <a className="hero-wa-btn" href={whatsappBase} target="_blank" rel="noreferrer">
                  Solano
                </a>
                <a className="hero-wa-btn" href={whatsappBosques} target="_blank" rel="noreferrer">
                  Bosques
                </a>
              </div>
            </div>
          </div>
          <div className="hero-signals">
            {heroSignals.map((signal, index) => (
              <span className={activeSignal === index ? 'hero-signal-active' : ''} key={signal}>
                {signal}
              </span>
            ))}
          </div>
        </div>
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
            <button className="text-link-button" type="button" onClick={() => navigate('/catalogo')}>
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
              className={`product-card${highlightedProduct === index ? ' product-card-active' : ''}`}
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
                  <button type="button" aria-label="Disminuir cantidad" onClick={() => changeProductDraftQuantity(product.id, -1)}>
                    -
                  </button>
                  <input
                    className="mini-quantity-input"
                    type="number"
                    min="1"
                    value={getProductDraftQuantity(product.id)}
                    onChange={(event) => setProductDraftQuantity(product.id, event.target.value)}
                    onBlur={(event) => setProductDraftQuantity(product.id, event.target.value)}
                    aria-label="Cantidad"
                  />
                  <button type="button" aria-label="Aumentar cantidad" onClick={() => changeProductDraftQuantity(product.id, 1)}>
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

      <section
        className="benefits-rail"
        onMouseEnter={() => setStepsPaused(true)}
        onMouseLeave={() => setStepsPaused(false)}
      >
        <div className="benefits-rail-intro">
          <div className="benefits-rail-intro-text">
            <p className="section-kicker">Compra simple · paso {activeStep + 1} de {purchaseSteps.length}</p>
            <h3>
              <span className="benefits-rail-static">Pedir materiales es asi:</span>
              <span className="benefits-rail-rotator" key={activeStep}>
                {purchaseSteps[activeStep].title}
              </span>
            </h3>
          </div>
          <div className="benefits-rail-intro-side">
            <div className="benefits-rail-progress" aria-hidden="true">
              {purchaseSteps.map((step, i) => (
                <button
                  key={step.title}
                  type="button"
                  tabIndex={-1}
                  className={`benefits-rail-progress-seg${i < activeStep ? ' benefits-rail-progress-seg-done' : ''}${stepsPaused && i === activeStep ? ' benefits-rail-progress-seg-paused' : ''}`}
                  onClick={() => setActiveStep(i)}
                >
                  {!stepsPaused && i === activeStep ? <span className="benefits-rail-progress-fill" /> : null}
                </button>
              ))}
            </div>
            <button className="primary-cta benefits-rail-cta" type="button" onClick={() => setShowCart(true)}>
              Ver pedido
            </button>
          </div>
        </div>
        <div className="benefits-rail-grid">
          {purchaseSteps.map((step, i) => (
            <article
              className={`benefit-tile benefit-tile-${step.tone}${i === activeStep ? ' benefit-tile-active' : ''}`}
              key={step.title}
              onMouseEnter={() => setActiveStep(i)}
            >
              <strong>{step.title}</strong>
              <p>{step.text}</p>
              {step.showWhatsapp ? (
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

      <section className="location-section" id="sucursales">
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
                  <CoverageMap
                    lat={branch.lat}
                    lng={branch.lng}
                    radius={branch.coverageRadius}
                    color="#db3a1e"
                    label={branch.kicker}
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

      <section className="promo-carousel">
        <div className="promo-carousel-track">
          {promoImages.map((img, i) => (
            <div
              key={i}
              className={`promo-carousel-slide${activePromo === i ? ' promo-carousel-slide-active' : ''}`}
            >
              <img src={img.src} alt={img.alt} />
            </div>
          ))}
        </div>
        {promoImages.length > 1 && (
          <>
            <button className="promo-carousel-nav promo-carousel-prev" type="button" onClick={prevPromo} aria-label="Imagen anterior">←</button>
            <button className="promo-carousel-nav promo-carousel-next" type="button" onClick={nextPromo} aria-label="Imagen siguiente">→</button>
            <div className="promo-carousel-dots">
              {promoImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`promo-dot${activePromo === i ? ' promo-dot-active' : ''}`}
                  onClick={() => setActivePromo(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="faq-section" id="preguntas-frecuentes" aria-label="Preguntas frecuentes">
        <div className="faq-intro">
          <p className="section-kicker">¿Tenés dudas?</p>
          <h2>Preguntas frecuentes</h2>
        </div>
        <div className="faq-list">
          {faqs.map((item) => (
            <details className="faq-item" key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <strong>Los Eucaliptus Corralon</strong>
            <p>
              Materiales de construccion a los mejores precios de Zona Sur. Stock permanente y
              envio propio desde 1954.
            </p>
            <div className="site-footer-actions">
              <a className="footer-chip footer-chip-wa" href={whatsappBase} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              <a className="footer-chip" href="tel:+5491159748316">
                Llamar
              </a>
            </div>
          </div>

          <div className="site-footer-block">
            <strong>Navegacion</strong>
            <button type="button" onClick={scrollToProducts}>Productos destacados</button>
            <button type="button" onClick={() => navigate('/catalogo')}>Catalogo completo</button>
            <button type="button" onClick={() => setShowCoverage(true)}>¿Llegamos a tu zona?</button>
            <button
              type="button"
              onClick={() => document.getElementById('sucursales')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Sucursales
            </button>
            <button type="button" onClick={() => setShowCart(true)}>Mi carrito</button>
          </div>

          <div className="site-footer-block">
            <strong>Horarios</strong>
            <span className="footer-branch-name">Solano</span>
            <span>Lunes a Viernes <b>8:00 a 12:00 y 14:00 a 19:00</b></span>
            <span>Sabados <b>8:00 a 14:00</b></span>
            <span className="footer-branch-name">Bosques</span>
            <span>Lunes a Viernes <b>8:00 a 18:00</b></span>
            <span>Sabados <b>8:00 a 15:00</b></span>
          </div>

          <div className="site-footer-block">
            <strong>Contacto</strong>
            <span className="footer-contact-line">
              <MapPin className="footer-contact-icon" size={15} aria-hidden="true" />
              Av. Monteverde 2766, San Francisco Solano
            </span>
            <a href="tel:+5491159748316">11 5974-8316</a>
            <span className="footer-contact-line">
              <MapPin className="footer-contact-icon" size={15} aria-hidden="true" />
              Av. Guillermo Hudson 2855, Bosques, F. Varela
            </span>
            <a href="tel:+5491130623113">11 3062-3113</a>
            <a href={whatsappBase} target="_blank" rel="noreferrer">
              Escribinos por WhatsApp
            </a>
            <a className="footer-social-link" href="https://www.instagram.com/corralon.loseucaliptus/" target="_blank" rel="noreferrer">
              <InstagramGlyph /> @corralon.loseucaliptus
            </a>
            <a className="footer-social-link" href="https://www.instagram.com/loseucaliptus.bosques/" target="_blank" rel="noreferrer">
              <InstagramGlyph /> @loseucaliptus.bosques
            </a>
          </div>
        </div>

        <div className="site-footer-legal">
          © {new Date().getFullYear()} Corralon Los Eucaliptus. Todos los derechos reservados.
          Precios sujetos a actualizacion.
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

      {showCoverage ? (
        <CoverageChecker
          branches={[
            { name: 'Solano', lat: branches[0].lat, lng: branches[0].lng, radius: branches[0].coverageRadius, whatsappUrl: whatsappBase },
            { name: 'Bosques', lat: branches[1].lat, lng: branches[1].lng, radius: branches[1].coverageRadius, whatsappUrl: whatsappBosques },
          ]}
          onClose={() => setShowCoverage(false)}
          onResult={handleCoverageResult}
        />
      ) : null}

      {showCart && (
        <div className="cart-backdrop" onClick={() => setShowCart(false)} aria-hidden="true" />
      )}

      {showCart ? (
        <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Mi carrito">
          <div className="cart-drawer-header">
            <div>
              <p>Mi carrito</p>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <button type="button" aria-label="Cerrar carrito" onClick={() => setShowCart(false)}>
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
                    <button type="button" aria-label="Disminuir cantidad" onClick={() => changeQuantity(item.id, item.quantity - 1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label="Aumentar cantidad" onClick={() => changeQuantity(item.id, item.quantity + 1)}>
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
