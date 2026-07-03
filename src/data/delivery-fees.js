import { deliveryFeeByLocality } from '../lib/delivery-config'

function normalizeLocalityKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export { deliveryFeeByLocality }

export function getDeliveryFeeByLocality(locality) {
  const key = normalizeLocalityKey(locality)
  if (!key) return null
  const fee = deliveryFeeByLocality[key]
  return Number.isFinite(fee) ? fee : null
}
