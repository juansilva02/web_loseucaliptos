import { Link } from 'react-router-dom'
import promoCamion from '../assets/promo-camion.svg'
import promoMateriales from '../assets/promo-materiales.svg'
import {
  categoryCards,
  contactItems,
  featuredProducts,
  formatPrice,
  getWhatsAppHref,
  supplierBrands,
  whatsappBase,
} from '../lib/catalog'
import { useCart } from '../context/CartContext'

const serviceHighlights = [
  {
    title: 'Envios rapidos',
    text: 'En Solano y alrededores',
  },
  {
    title: 'Stock permanente',
    text: 'Materiales para obra y terminacion',
  },
  {
    title: 'Atencion personalizada',
    text: 'Asesoramiento comercial directo',
  },
  {
    title: 'Medios de pago',
    text: 'Efectivo, transferencia y cuotas',
  },
]

const customerBanners = [
  {
    title: 'Hacemos tu obra mas simple',
    text: 'Pedi online y recibi en tu obra rapido y seguro.',
  },
  {
    title: 'Zona Sur Bs As',
    text: 'Enviamos a Avellaneda, Lanus, Lomas, Quilmes, Berazategui y mas.',
  },
  {
    title: 'Pedi por WhatsApp',
    text: 'Consultas, presupuestos y pedidos en el acto.',
  },
  {
    title: 'Venta para obra',
    text: 'Productos listos para sumar al pedido y cerrar la compra.',
  },
]

export function HomePage() {
  const { addItem } = useCart()

  return (
    <>
      <section className="hero-reference">
        <div className="hero-reference-copy">
          <p className="section-kicker">Corralon Los Eucaliptus Solano</p>
          <h1>
            Materiales
            <br />
            que construyen
            <br />
            tus proyectos
          </h1>
          <p>
            Venta online, atencion comercial y envios en Zona Sur. Precios visibles, cuotas y
            pedido directo para coordinar la entrega.
          </p>

          <div className="hero-reference-actions">
            <Link className="primary-action" to="/productos">
              Compra online
            </Link>
            <a className="secondary-action hero-whatsapp" href={whatsappBase} target="_blank" rel="noreferrer">
              Pedi por WhatsApp
            </a>
          </div>

          <div className="hero-reference-note">Desde 1954 en Zona Sur, Buenos Aires</div>
        </div>

        <div className="hero-reference-media">
          <img src={promoCamion} alt="Camion y logistica de Los Eucaliptos" />
        </div>
      </section>

      <section className="service-strip">
        {serviceHighlights.map((item) => (
          <article className="service-strip-item" key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </article>
        ))}
      </section>

      <section className="featured-reference">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Productos destacados</p>
            <h2>Materiales listos para vender, no una vista interna de catalogo.</h2>
          </div>
          <Link className="see-all-link" to="/productos">
            Ver todos los productos
          </Link>
        </div>

        <div className="featured-reference-grid">
          {featuredProducts.slice(0, 6).map((product) => (
            <article className="product-card-reference" key={product.id}>
              <div className="product-visual reference-visual" data-category={product.categoryKey}>
                <span>{product.categoryShortName}</span>
              </div>
              <div className="product-card-reference-copy">
                <h3>{product.excelName}</h3>
                <p>{product.brandName || product.categoryName}</p>
                <strong>{formatPrice(product.price)}</strong>
              </div>
              <div className="product-card-reference-actions">
                <button className="store-secondary-button" type="button" onClick={() => addItem(product)}>
                  Agregar al pedido
                </button>
                <a className="product-whatsapp" href={getWhatsAppHref(product)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="customer-banner-grid">
        {customerBanners.map((banner, index) => (
          <article className={`customer-banner customer-banner-${index + 1}`} key={banner.title}>
            <h3>{banner.title}</h3>
            <p>{banner.text}</p>
            {index === 2 ? (
              <a href={whatsappBase} target="_blank" rel="noreferrer">
                11 5974-8316
              </a>
            ) : null}
          </article>
        ))}
      </section>

      <section className="story-panels">
        <article className="story-panel story-panel-dark">
          <div>
            <p className="section-kicker">Construimos con vos</p>
            <h2>Una web comercial para vender materiales con mas claridad.</h2>
            <p>
              Rubros claros, productos visibles, carrito, pedido y futura integracion con Payway
              para profesionalizar la venta.
            </p>
            <Link className="primary-action" to="/nosotros">
              Conoce mas sobre nosotros
            </Link>
          </div>
          <img src={promoMateriales} alt="Publicidad de materiales para la construccion" />
        </article>

        <article className="story-panel story-panel-light">
          <div>
            <p className="section-kicker">Tu proyecto, nuestro compromiso</p>
            <h2>Materiales de calidad, precio visible y preparacion de pedido.</h2>
            <p>
              El cliente compra, informa el domicilio y sube el comprobante. El resto queda listo
              para revision comercial y logistica.
            </p>
            <Link className="secondary-action dark-action" to="/checkout">
              Ver pedido
            </Link>
          </div>
          <div className="story-panel-list">
            {contactItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
            <div className="story-brand-row">
              {supplierBrands.slice(0, 4).map((brand) => (
                <strong key={brand}>{brand}</strong>
              ))}
            </div>
            <div className="story-category-row">
              {categoryCards.slice(0, 5).map((category) => (
                <em key={category.key}>{category.shortName}</em>
              ))}
            </div>
          </div>
        </article>
      </section>
    </>
  )
}
