import {
  buildAllowedShippingRates,
  getShippingConfig,
  registerShippingCarrier,
  registerShippingCarrierOption,
} from './tiendanube-shipping.js'

async function main() {
  const config = getShippingConfig()
  const carrier = await registerShippingCarrier(config)

  const uniqueOptions = new Map()
  for (const rate of buildAllowedShippingRates(config)) {
    uniqueOptions.set(rate.code, { code: rate.code, name: rate.name })
  }

  const createdOptions = []
  for (const option of uniqueOptions.values()) {
    const created = await registerShippingCarrierOption(carrier.id, option, config)
    createdOptions.push(created)
  }

  console.log(
    JSON.stringify(
      {
        carrier,
        options: createdOptions,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
