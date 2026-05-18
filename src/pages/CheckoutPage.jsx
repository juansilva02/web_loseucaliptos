import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createOrder, registerPaymentProof } from '../lib/api'
import { checkoutInstallmentOptions, checkoutPaymentOptions, formatPrice, whatsappBase } from '../lib/catalog'
import { useCart } from '../context/CartContext'

const initialForm = {
  customerName: '',
  phone: '',
  email: '',
  address: '',
  city: 'San Francisco Solano',
  notes: '',
  paymentMethod: 'payway',
  installmentPlan: '6-cuotas',
}

export function CheckoutPage() {
  const { items, itemCount, subtotal, changeQuantity, removeItem, clearCart } = useCart()
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('idle')
  const [orderResult, setOrderResult] = useState(null)
  const [receiptNumber, setReceiptNumber] = useState('')
  const [receiptStatus, setReceiptStatus] = useState('idle')

  const summaryLines = useMemo(() => {
    return items.map((item) => `${item.quantity}x ${item.name} (${formatPrice(item.price)})`)
  }, [items])

  async function handleSubmit(event) {
    event.preventDefault()

    if (!items.length) return

    setStatus('submitting')

    try {
      const result = await createOrder({
        customer: {
          name: form.customerName,
          phone: form.phone,
          email: form.email,
        },
        delivery: {
          address: form.address,
          city: form.city,
          notes: form.notes,
        },
        payment: {
          method: form.paymentMethod,
          installmentPlan: form.installmentPlan,
        },
        items,
      })

      setOrderResult(result)
      setStatus('success')
      clearCart()
    } catch (error) {
      setStatus('error')
    }
  }

  async function handleReceiptSubmit(event) {
    event.preventDefault()

    if (!orderResult?.order?.id || !receiptNumber.trim()) return

    setReceiptStatus('submitting')

    try {
      const result = await registerPaymentProof(orderResult.order.id, receiptNumber.trim())
      setOrderResult(result)
      setReceiptStatus('success')
    } catch {
      setReceiptStatus('error')
    }
  }

  return (
    <section className="checkout-shell">
      <div className="checkout-copy">
        <p className="section-kicker">Finalizar pedido</p>
        <h1>Pedinos materiales, domicilio y forma de pago desde una sola vista.</h1>
        <p>
          Este flujo deja la venta lista para revision comercial y logistica. Cuando integremos
          Payway, el backend ya esta preparado para asociar el link de pago a la orden.
        </p>

        <div className="checkout-benefits">
          <div>
            <strong>3 y 6 cuotas</strong>
            <span>Promociones bancarias a coordinar con Payway.</span>
          </div>
          <div>
            <strong>Entrega coordinada</strong>
            <span>Recibimos domicilio, materiales y observaciones del cliente.</span>
          </div>
          <div>
            <strong>Comprobante registrado</strong>
            <span>Luego del pago, se guarda el numero para preparar el pedido.</span>
          </div>
        </div>

        <a className="secondary-action" href={whatsappBase} target="_blank" rel="noreferrer">
          Coordinar por WhatsApp
        </a>
      </div>

      <div className="checkout-card">
        <div className="checkout-summary">
          <div>
            <p className="section-kicker">Resumen</p>
            <h2>{itemCount ? `${itemCount} items en tu pedido` : 'Tu pedido esta vacio'}</h2>
          </div>
          <strong>{formatPrice(subtotal)}</strong>
        </div>

        {items.length ? (
          <div className="checkout-items">
            {items.map((item) => (
              <article className="checkout-item" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.brandName || item.categoryName}</p>
                </div>
                <div className="checkout-item-controls">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) => changeQuantity(item.id, event.target.value)}
                  />
                  <span>{formatPrice(item.price * item.quantity)}</span>
                  <button type="button" onClick={() => removeItem(item.id)}>
                    Quitar
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-cart-panel">
            <p>Agrega productos desde el catalogo para poder generar la orden.</p>
            <Link className="primary-action" to="/productos">
              Ir al catalogo
            </Link>
          </div>
        )}

        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Nombre y apellido
              <input
                required
                value={form.customerName}
                onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
              />
            </label>
            <label>
              Telefono
              <input
                required
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label>
              Ciudad
              <input
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              />
            </label>
          </div>

          <label>
            Domicilio de entrega
            <input
              required
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
          </label>

          <label>
            Observaciones
            <textarea
              rows="4"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder={`Ejemplo:\n${summaryLines.join('\n')}`}
            />
          </label>

          <div className="form-grid">
            <label>
              Forma de pago
              <select
                value={form.paymentMethod}
                onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              >
                {checkoutPaymentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Plan
              <select
                value={form.installmentPlan}
                onChange={(event) =>
                  setForm((current) => ({ ...current, installmentPlan: event.target.value }))
                }
              >
                {checkoutInstallmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="primary-action" type="submit" disabled={!items.length || status === 'submitting'}>
            {status === 'submitting' ? 'Generando orden...' : 'Generar orden'}
          </button>

          {status === 'error' ? <p className="form-feedback form-error">No pudimos generar la orden.</p> : null}
        </form>

        {orderResult?.order ? (
          <section className="order-result">
            <p className="section-kicker">Orden creada</p>
            <h3>Pedido #{orderResult.order.id}</h3>
            <p>{orderResult.payment.message}</p>
            <ul className="result-list">
              <li>Total: {formatPrice(orderResult.order.totals.subtotal)}</li>
              <li>Estado: {orderResult.order.status}</li>
              <li>Pago: {orderResult.order.payment.method}</li>
            </ul>

            {orderResult.payment.checkoutUrl ? (
              <a className="primary-action" href={orderResult.payment.checkoutUrl} target="_blank" rel="noreferrer">
                Ir a pagar
              </a>
            ) : null}

            <form className="receipt-form" onSubmit={handleReceiptSubmit}>
              <label>
                Numero de comprobante de pago
                <input value={receiptNumber} onChange={(event) => setReceiptNumber(event.target.value)} />
              </label>
              <button className="secondary-action" type="submit" disabled={receiptStatus === 'submitting'}>
                {receiptStatus === 'submitting' ? 'Registrando...' : 'Registrar comprobante'}
              </button>
              {receiptStatus === 'success' ? (
                <p className="form-feedback">Comprobante guardado para revision logistica.</p>
              ) : null}
              {receiptStatus === 'error' ? (
                <p className="form-feedback form-error">No pudimos guardar el comprobante.</p>
              ) : null}
            </form>
          </section>
        ) : null}
      </div>
    </section>
  )
}
