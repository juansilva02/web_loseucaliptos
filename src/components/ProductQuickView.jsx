import { formatPrice, resolveImage, whatsappBase } from '../lib/catalog'
import { getCatalogQualitySummary } from '../lib/catalog-quality'
import { getBundledProductImage } from '../lib/product-images'
import './ProductQuickView.css'

const CREDIT_1_TO_3 = 1.2
const CREDIT_4_TO_6 = 1.29

function buildDescription(product) {
  if (product.publicBlurb) return product.publicBlurb

  const parts = [
    product.categoryName ? `Categoria: ${product.categoryName}.` : '',
    product.brandName ? `Marca: ${product.brandName}.` : '',
    product.unit ? `Venta por ${product.unit}.` : '',
  ]

  return parts.filter(Boolean).join(' ') || 'Producto disponible para consultar y agregar al carrito.'
}

export default function ProductQuickView({
  product,
  quantity,
  onClose,
  onChangeQuantity,
  onAddToCart,
}) {
  if (!product) return null

  const quality = getCatalogQualitySummary(product.excelName)
  const imageSrc = resolveImage(product.image) || getBundledProductImage({ id: product.id, name: product.excelName })
  const cashPrice = Number(product.price) || 0
  const price1to3 = cashPrice ? Math.round(cashPrice * CREDIT_1_TO_3) : 0
  const price4to6 = cashPrice ? Math.round(cashPrice * CREDIT_4_TO_6) : 0
  const consultHref = `${whatsappBase}?text=${encodeURIComponent(`Hola, consulto por ${quality.displayName}`)}`

  return (
    <div className="product-quickview-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="product-quickview"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${quality.displayName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="product-quickview-close" onClick={onClose} aria-label="Cerrar detalle">
          x
        </button>

        <div className="product-quickview-media">
          {imageSrc ? (
            <img src={imageSrc} alt={quality.displayName} className="product-quickview-image" />
          ) : (
            <div className="product-quickview-fallback">{quality.displayName}</div>
          )}
        </div>

        <div className="product-quickview-copy">
          <span className="product-quickview-badge">{product.categoryName || 'Materiales'}</span>
          <h2>{quality.displayName}</h2>
          {quality.unavailable ? <span className="product-quickview-status">No disponible por ahora</span> : null}
          <p>{buildDescription(product)}</p>

          {cashPrice > 0 && !quality.unavailable ? (
            <div className="product-quickview-pricing">
              <div>
                <span>Efectivo, transferencia y debito</span>
                <strong>{formatPrice(cashPrice)}</strong>
                <small>Sin descuento adicional.</small>
              </div>
              <div>
                <span>Credito 1 a 3 cuotas</span>
                <strong>{formatPrice(price1to3)}</strong>
                <small>Recargo del 20%.</small>
              </div>
              <div>
                <span>Credito 4 a 6 cuotas</span>
                <strong>{formatPrice(price4to6)}</strong>
                <small>Recargo del 29%.</small>
              </div>
            </div>
          ) : (
            <div className="product-quickview-pricing product-quickview-pricing-consult">
              <strong>Precio a consultar</strong>
              <a href={consultHref} target="_blank" rel="noreferrer">
                Consultar por WhatsApp
              </a>
            </div>
          )}
        </div>

        <div className="product-quickview-actions">
          <div className="mini-quantity">
            <button type="button" aria-label="Disminuir cantidad" onClick={() => onChangeQuantity(quantity - 1)}>
              -
            </button>
            <input
              className="mini-quantity-input"
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => onChangeQuantity(event.target.value)}
              onBlur={(event) => onChangeQuantity(event.target.value)}
              aria-label="Cantidad"
            />
            <button type="button" aria-label="Aumentar cantidad" onClick={() => onChangeQuantity(quantity + 1)}>
              +
            </button>
          </div>
          {cashPrice > 0 && !quality.unavailable ? (
            <button type="button" className="add-cart-button" onClick={onAddToCart}>
              Agregar al carrito
            </button>
          ) : (
            <a className="catalog-consult-btn" href={consultHref} target="_blank" rel="noreferrer">
              Consultar precio
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}
