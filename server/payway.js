const PUBLIC_PAYWAY_NOTE =
  'La documentacion publica disponible hoy distingue el Link de Pago gestionado desde Mi Payway y la Gateway API para integracion tecnica. Este backend queda listo para asociar cualquiera de los dos modelos cuando se definan las credenciales y el flujo final.'

export async function createPaymentIntent({ order }) {
  const providerMode = process.env.PAYWAY_PROVIDER_MODE || 'manual-review'

  if (providerMode === 'manual-review') {
    return {
      provider: 'payway',
      mode: 'manual-review',
      checkoutUrl: null,
      message:
        'La orden quedo creada. El link de pago Payway puede asociarse en la siguiente etapa desde Mi Payway o mediante Gateway API privada.',
      note: PUBLIC_PAYWAY_NOTE,
    }
  }

  if (providerMode === 'mock-link') {
    return {
      provider: 'payway',
      mode: 'mock-link',
      checkoutUrl: `https://mi.payway.com.ar/mock-link/${order.id}`,
      message: 'Link de pago simulado generado para pruebas de integracion.',
      note: PUBLIC_PAYWAY_NOTE,
    }
  }

  return {
    provider: 'payway',
    mode: providerMode,
    checkoutUrl: null,
    message: 'Modo Payway configurado sin implementacion activa.',
    note: PUBLIC_PAYWAY_NOTE,
  }
}
