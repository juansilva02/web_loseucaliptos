export async function createOrder(payload) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('No se pudo generar la orden.')
  }

  return response.json()
}

export async function registerPaymentProof(orderId, receiptNumber) {
  const response = await fetch(`/api/orders/${orderId}/payment-proof`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ receiptNumber }),
  })

  if (!response.ok) {
    throw new Error('No se pudo registrar el comprobante.')
  }

  return response.json()
}
