import { useDialogA11y } from '../../hooks/useDialogA11y'

export default function CartDrawer({
  showCart,
  setShowCart,
  items,
  subtotal,
  formatPrice,
  changeQuantity,
  removeItem,
  clearCart,
  onStartCheckout,
  checkoutBusy = false,
  checkoutError = '',
}) {
  const closeCart = () => setShowCart(false)
  const dialogRef = useDialogA11y({ onClose: closeCart, active: showCart })
  if (!showCart) return null

  return (
    <aside
      ref={dialogRef}
      className="cart-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Mi carrito"
      tabIndex={-1}
    >
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
        {checkoutError ? <p className="cart-checkout-error" role="alert">{checkoutError}</p> : null}
        <button className="secondary-cta dark" type="button" onClick={clearCart}>
          Vaciar carrito
        </button>
        <div className="cart-send-group">
          <button
            className="primary-cta"
            type="button"
            onClick={() => onStartCheckout?.('solano')}
            disabled={!items.length || checkoutBusy}
          >
            {checkoutBusy ? 'Validando...' : 'Enviar - Solano'}
          </button>
          <button
            className="primary-cta"
            type="button"
            onClick={() => onStartCheckout?.('bosques')}
            disabled={!items.length || checkoutBusy}
          >
            Enviar - Bosques
          </button>
        </div>
      </div>
    </aside>
  )
}
