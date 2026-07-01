export default function FloatingCartButton({
  itemCount,
  floatingCartItems,
  subtotal,
  formatPrice,
  setShowCart,
}) {
  if (!itemCount) return null

  return (
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
  )
}
