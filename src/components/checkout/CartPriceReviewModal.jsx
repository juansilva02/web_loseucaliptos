import { CircleAlert } from 'lucide-react'
import { useDialogA11y } from '../../hooks/useDialogA11y'

export default function CartPriceReviewModal({ quote, formatMoney, onConfirm, onClose }) {
  const dialogRef = useDialogA11y({ onClose })
  const hasItems = quote.items.length > 0

  return (
    <>
      <div className="checkout-delivery-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={dialogRef}
        className="checkout-delivery-modal checkout-price-review"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-price-review-title"
        tabIndex={-1}
      >
        <div className="checkout-delivery-head">
          <div>
            <p className="section-kicker">Precios actualizados</p>
            <h3 id="cart-price-review-title">Revisa tu carrito</h3>
            <p>Comparamos el pedido con el catalogo vigente antes de continuar.</p>
          </div>
          <button type="button" className="checkout-delivery-close" onClick={onClose} aria-label="Cerrar">
            x
          </button>
        </div>
        <div className="checkout-delivery-body">
          {quote.changes.length ? (
            <div className="checkout-section-card">
              <h4>Productos con precio nuevo</h4>
              {quote.changes.map((change) => (
                <div className="checkout-summary-row" key={change.id}>
                  <span>{change.name}</span>
                  <strong>
                    <del>{formatMoney(change.previousPrice)}</del>{' '}
                    {formatMoney(change.currentPrice)}
                  </strong>
                </div>
              ))}
            </div>
          ) : null}

          {quote.blocked.length ? (
            <div className="checkout-status-note checkout-status-note-redirect">
              <strong><CircleAlert size={17} aria-hidden="true" /> Productos retirados</strong>
              <p>Ya no se pueden comprar o quedaron a consultar:</p>
              {quote.blocked.map((item) => <p key={item.id}>{item.name || item.id}</p>)}
            </div>
          ) : null}

          <div className="checkout-summary-row checkout-summary-total">
            <span>Subtotal vigente</span>
            <strong>{formatMoney(quote.subtotal)}</strong>
          </div>
          <div className="checkout-actions-row">
            <button type="button" className="secondary-cta" onClick={onClose}>
              Volver al carrito
            </button>
            <button type="button" className="primary-cta" onClick={onConfirm}>
              {hasItems ? 'Aceptar cambios y continuar' : 'Actualizar carrito'}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
