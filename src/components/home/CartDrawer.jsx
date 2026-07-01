export default function CartDrawer({
  showCart,
  setShowCart,
  items,
  subtotal,
  formatPrice,
  changeQuantity,
  removeItem,
  clearCart,
  cartWhatsappUrl,
  cartWhatsappBosques,
}) {
  if (!showCart) return null

  return (
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
            Enviar - Solano
          </a>
          <a className="primary-cta" href={cartWhatsappBosques} target="_blank" rel="noreferrer">
            Enviar - Bosques
          </a>
        </div>
      </div>
    </aside>
  )
}
