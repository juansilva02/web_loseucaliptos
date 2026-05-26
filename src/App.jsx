import { useEffect, useMemo, useState } from 'react'
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

const priceNotes = [
  'Los precios estan sujetos a modificacion sin previo aviso.',
  'Los reclamos por cambio de material se toman dentro de las 24 hs de entregado el pedido.',
]

const orderRequirements = [
  'Apellido y nombre',
  'CUIL',
  'Direccion, numero y entre calles',
  'Forma de pago',
]

const priceHighlights = [
  'Arena suelta $41.000',
  'Arena en bolson $49.200 oferta',
  'Piedra suelta $70.000 super oferta',
  'Piedra en bolson $78.200 super oferta',
  'Cemento Loma Negra 25kg $7.200',
  'Cal Cacique Max 25kg $7.100',
]

const curatedProducts = [
  {
    title: 'Ladrillo hueco del 12',
    subtitle: 'Marca Quilmes',
    match: 'LADRILLO HUECO 12',
    categoryKey: 'ladrillos-y-bloques',
    priceOverride: 790,
  },
  {
    title: 'Ladrillos comunes',
    subtitle: 'Sin marca',
    match: 'LADRILLO COMUN',
    categoryKey: 'ladrillos-y-bloques',
    priceOverride: 220,
  },
  {
    title: 'Ladrillo hueco del 8',
    subtitle: 'Marca Quilmes',
    match: 'LADRILLO HUECO 8',
    categoryKey: 'ladrillos-y-bloques',
    priceOverride: 630,
  },
  {
    title: 'Cemento Portland 25kg',
    subtitle: 'Marca Loma Negra',
    match: 'PORTLAND 25',
    categoryKey: 'aridos-y-obra-gruesa',
    priceOverride: 7200,
  },
  {
    title: 'Cal Cacique Max 25kg',
    subtitle: 'Marca Cacique',
    match: 'CACIQUE MAX 25',
    categoryKey: 'aridos-y-obra-gruesa',
    priceOverride: 7100,
  },
  {
    title: 'Bloque liso de cemento del 13',
    subtitle: 'Sin marca',
    match: 'BLOQUE LISO 13',
    categoryKey: 'ladrillos-y-bloques',
  },
  {
    title: 'Bloque liso de cemento del 20',
    subtitle: 'Sin marca',
    match: 'BLOQUE LISO 20',
    categoryKey: 'ladrillos-y-bloques',
  },
  {
    title: 'Bloque liso de cemento del 10',
    subtitle: 'Sin marca',
    match: 'BLOQUE LISO 10',
    categoryKey: 'ladrillos-y-bloques',
  },
  {
    title: 'Hierro del 6',
    subtitle: 'Marca Acindar',
    match: 'HIERRO 6',
    categoryKey: 'hierros-y-estructura',
    priceOverride: 6250,
  },
  {
    title: 'Hierro del 8',
    subtitle: 'Marca Acindar',
    match: 'HIERRO 8',
    categoryKey: 'hierros-y-estructura',
    priceOverride: 10800,
  },
  {
    title: 'Ladrillo Cordoba media vista',
    subtitle: 'Sin marca',
    match: 'CORDOBA MEDIA VISTA',
    categoryKey: 'ladrillos-y-bloques',
  },
  {
    title: 'Arena por metro bolson',
    subtitle: 'Sin marca',
    match: 'ARENA BOLSON',
    categoryKey: 'aridos-y-obra-gruesa',
    priceOverride: 49200,
  },
  {
    title: 'Hierro del 10',
    subtitle: 'Marca Acindar',
    match: 'HIERRO 10',
    categoryKey: 'hierros-y-estructura',
    priceOverride: 16900,
  },
  {
    title: 'Hierro del 4,2',
    subtitle: 'Marca Acindar',
    match: 'HIERRO 4,2',
    categoryKey: 'hierros-y-estructura',
    priceOverride: 2500,
  },
  {
    title: 'Pegamento para ceramica',
    subtitle: 'Marca Premecol',
    match: 'PEGAMENTO CERAMICA',
    categoryKey: 'electricidad-y-ferreteria',
    priceOverride: 7400,
  },
  {
    title: 'Ladrillo de telgopor 10cm',
    subtitle: 'Marca Polipol',
    match: 'TELGOPOR 10',
    categoryKey: 'ladrillos-y-bloques',
    priceOverride: 4000,
  },
  {
    title: 'Ladrillo de telgopor 12.5cm',
    subtitle: 'Marca Polipol',
    match: 'TELGOPOR 12.5',
    categoryKey: 'ladrillos-y-bloques',
    priceOverride: 4800,
  },
  {
    title: 'Cable unipolar 1 x 2.5',
    subtitle: 'Sin marca',
    match: 'UNIPOLAR 1 X2.5',
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
      price: item.priceOverride ?? match?.price ?? 0,
      excelName: item.title,
      subtitle: item.subtitle,
      categoryKey: item.categoryKey,
      categoryName: category?.name ?? 'Materiales',
      brandName: match?.brandName ?? '',
      sourceName: match?.excelName ?? item.title,
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

function App() {
  const { items, itemCount, subtotal, addItem, removeItem, changeQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState('all')
  const [showCart, setShowCart] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSignal, setActiveSignal] = useState(0)
  const [activeProduct, setActiveProduct] = useState(0)

  const featuredProducts = useMemo(() => getCuratedShowcase(), [])

  const filteredProducts = useMemo(() => {
    return featuredProducts.filter((product) => activeCategory === 'all' || product.categoryKey === activeCategory)
  }, [activeCategory, featuredProducts])

  const floatingCartItems = items.slice(0, 3)

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

      <header className={`commerce-header${isScrolled ? ' commerce-header-scrolled' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark">LE</div>
          <div className="brand-copy">
            <strong>Los Eucaliptus Corralon</strong>
            <span>Materiales para la construccion</span>
          </div>
        </div>

        <form className="header-search" onSubmit={(event) => event.preventDefault()}>
          <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>
            <option value="all">Todas las categorias</option>
            {categoryCards.slice(0, 6).map((category) => (
              <option key={category.key} value={category.key}>
                {category.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={scrollToProducts}>
            Ver
          </button>
        </form>

        <div className="header-actions">
          <div className="account-box">
            <strong>Mi cuenta</strong>
            <span>Ingresar / Registrarme</span>
          </div>
          <button className="cart-box" type="button" onClick={() => setShowCart(true)}>
            <strong>Mi carrito</strong>
            <span>{itemCount} items | {formatPrice(subtotal)}</span>
          </button>
          <a className="whatsapp-box" href={whatsappBase} target="_blank" rel="noreferrer">
            <strong>11 5974-8316</strong>
            <span>Escribinos por WhatsApp</span>
          </a>
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
            tus proyectos
          </h1>
          <p>Stock permanente | Mejores precios | Envios en Zona Sur</p>
          <div className="hero-cta-row">
            <button className="primary-cta" type="button" onClick={scrollToProducts}>
              Compra online
            </button>
            <a className="secondary-cta" href={whatsappBase} target="_blank" rel="noreferrer">
              Pedi por WhatsApp
            </a>
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
          <button className="text-link-button" type="button" onClick={() => setActiveCategory('all')}>
            Ver todos los productos
          </button>
        </div>

        <div className="products-grid">
          {filteredProducts.map((product, index) => (
            <article
              className={`product-card${activeProduct === index ? ' product-card-active' : ''}`}
              key={product.id}
              onMouseEnter={() => setActiveProduct(index)}
            >
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
                <a href={whatsappBase} target="_blank" rel="noreferrer">
                  11 5974-8316
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="purchase-brief">
        <div className="purchase-brief-main">
          <p className="section-kicker">Informacion comercial</p>
          <h3>Precios orientativos, datos para tomar el pedido y condiciones de venta.</h3>
          <div className="purchase-brief-tags">
            {priceHighlights.slice(0, 4).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div className="purchase-brief-side">
          <article className="purchase-brief-card">
            <div className="purchase-brief-media" aria-hidden="true">
              <span>Imagen para pedido</span>
            </div>
            <strong>Para pedir</strong>
            <div className="purchase-brief-list">
              {orderRequirements.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
          <article className="purchase-brief-card purchase-brief-card-accent">
            <strong>Condiciones</strong>
            <div className="purchase-brief-list">
              {priceNotes.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
        </div>
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

      <a
        className={`floating-whatsapp${showCart ? ' floating-whatsapp-shifted' : ''}`}
        href={whatsappBase}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <span className="floating-whatsapp-mark">W</span>
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
