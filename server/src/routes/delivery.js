import { readFileSync } from 'node:fs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { searchPlaces, reversePlace } from '../geocoder.js'
import { validationError } from '../validation.js'

const deliveryConfig = JSON.parse(
  readFileSync(new URL('../../../shared/delivery-config.json', import.meta.url), 'utf8'),
)

const router = Router()
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas de ubicacion. Intenta nuevamente en unos minutos.' },
}))

function distanceMeters(lat1, lng1, lat2, lng2) {
  const radius = 6371000
  const toRad = (degrees) => (degrees * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(a))
}

function localityFromPlace(place) {
  const address = place?.address || {}
  return address.city || address.town || address.village || address.suburb ||
    address.municipality || address.county || ''
}

function feeForLocality(locality) {
  const key = String(locality || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
  const fee = deliveryConfig.deliveryFees[key]
  return Number.isFinite(fee) ? fee : null
}

function coverageFor(lat, lng, selectedBranchKey) {
  const ranked = deliveryConfig.branches
    .map((branch) => ({
      ...branch,
      distanceMeters: distanceMeters(lat, lng, branch.lat, branch.lng),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
  const nearest = ranked[0]
  const selected = ranked.find((branch) => branch.key === selectedBranchKey) || nearest
  const inRange = ranked.find((branch) => branch.distanceMeters <= branch.coverageRadius)

  if (selected.distanceMeters <= selected.coverageRadius) {
    return { status: 'in_range', branchKey: selected.key, distanceKm: selected.distanceMeters / 1000 }
  }
  if (inRange) {
    return { status: 'redirected', branchKey: inRange.key, distanceKm: inRange.distanceMeters / 1000 }
  }
  return { status: 'out_of_range', branchKey: null, distanceKm: nearest.distanceMeters / 1000 }
}

function toCandidate(place, selectedBranchKey) {
  const lat = Number(place.lat)
  const lng = Number(place.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const locality = localityFromPlace(place)
  return {
    id: String(place.place_id || `${lat},${lng}`),
    label: String(place.display_name || ''),
    locality,
    lat,
    lng,
    coverage: coverageFor(lat, lng, selectedBranchKey),
    deliveryFee: feeForLocality(locality),
  }
}

router.post('/search', asyncHandler(async (req, res) => {
  const freeQuery = String(req.body?.query || '').trim()
  const locality = String(req.body?.locality || '').trim()
  const street = String(req.body?.street || '').trim()
  const streetNumber = String(req.body?.streetNumber || '').trim()
  const selectedBranchKey = String(req.body?.selectedBranchKey || '').trim()
  if (!freeQuery && (!locality || !street || !streetNumber)) {
    throw validationError('Localidad, calle y altura son requeridas')
  }
  if (freeQuery.length > 240 || ![locality, street, streetNumber].every((part) => part.length <= 120)) {
    throw validationError('La direccion es demasiado larga')
  }

  const query = freeQuery
    ? `${freeQuery}, Buenos Aires, Argentina`
    : `${street} ${streetNumber}, ${locality}, Buenos Aires, Argentina`
  const places = await searchPlaces(query, 5)
  const candidates = places.map((place) => toCandidate(place, selectedBranchKey)).filter(Boolean)
  res.json({ candidates, attribution: 'Geocodificacion © OpenStreetMap contributors' })
}))

router.post('/reverse', asyncHandler(async (req, res) => {
  const lat = Number(req.body?.lat)
  const lng = Number(req.body?.lng)
  const selectedBranchKey = String(req.body?.selectedBranchKey || '').trim()
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw validationError('Coordenadas invalidas')
  }
  const place = await reversePlace(lat, lng)
  const candidate = toCandidate({ ...place, lat, lon: lng }, selectedBranchKey)
  res.json({ candidate, attribution: 'Geocodificacion © OpenStreetMap contributors' })
}))

export default router
