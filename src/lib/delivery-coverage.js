import { api } from '../admin/api'

export const NEAR_RADIUS_METERS = 15000

export function shortenPlaceLabel(place) {
  if (place?.shortLabel) return place.shortLabel
  if (place?.locality) {
    const street = String(place.label || '').split(',')[0]
    return [street, place.locality].filter(Boolean).join(', ')
  }
  return String(place?.label || place?.display_name || '').split(',').slice(0, 2).join(',').trim()
}

export function getLocalityLabel(place) {
  return String(place?.locality || '')
}

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const radius = 6371000
  const toRad = (degrees) => (degrees * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(a))
}

export function formatKm(meters) {
  return `${(Number(meters) / 1000).toFixed(1).replace('.', ',')} km`
}

export async function reverseGeocode(lat, lng, { selectedBranchKey, signal } = {}) {
  const response = await api.reverseDeliveryLocation({ lat, lng, selectedBranchKey }, signal)
  return response.candidate
}

export async function searchAddress(query, { selectedBranchKey, signal } = {}) {
  const payload = typeof query === 'string'
    ? { query, selectedBranchKey }
    : { ...query, selectedBranchKey }
  const response = await api.searchDeliveryAddress(payload, signal)
  return response.candidates || []
}

function normalizeBranch(branch, index) {
  return {
    ...branch,
    key: branch.key || `branch-${index + 1}`,
    name: branch.name || branch.label || `Sucursal ${index + 1}`,
    lat: Number(branch.lat),
    lng: Number(branch.lng),
    coverageRadius: Number(branch.coverageRadius ?? branch.radius ?? 0),
  }
}

export function resolveCoverage({
  lat,
  lng,
  branches,
  selectedBranchKey,
  nearRadius = NEAR_RADIUS_METERS,
}) {
  const ranked = (branches || [])
    .map(normalizeBranch)
    .filter((branch) => Number.isFinite(branch.lat) && Number.isFinite(branch.lng))
    .map((branch) => {
      const meters = distanceMeters(lat, lng, branch.lat, branch.lng)
      return {
        ...branch,
        distanceMeters: meters,
        distanceKm: Number((meters / 1000).toFixed(1)),
      }
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)

  if (!ranked.length) {
    return {
      status: 'error',
      zone: 'out',
      resolvedBranchKey: null,
      nearestBranchKey: null,
      nearestDistanceMeters: null,
      nearestDistanceKm: null,
      distances: [],
    }
  }

  const nearest = ranked[0]
  const selectedBranch = ranked.find((branch) => branch.key === selectedBranchKey) || nearest
  const inRangeBranch = ranked.find((branch) => branch.distanceMeters <= branch.coverageRadius)
  let status = 'out_of_range'
  let resolvedBranch = null

  if (selectedBranch.distanceMeters <= selectedBranch.coverageRadius) {
    status = 'in_range'
    resolvedBranch = selectedBranch
  } else if (inRangeBranch) {
    status = 'redirected'
    resolvedBranch = inRangeBranch
  }

  return {
    status,
    zone: nearest.distanceMeters <= nearest.coverageRadius
      ? 'in'
      : nearest.distanceMeters <= nearRadius
        ? 'near'
        : 'out',
    resolvedBranchKey: resolvedBranch?.key ?? null,
    resolvedBranchName: resolvedBranch?.name ?? null,
    nearestBranchKey: nearest.key,
    nearestBranchName: nearest.name,
    nearestDistanceMeters: nearest.distanceMeters,
    nearestDistanceKm: nearest.distanceKm,
    distances: ranked,
  }
}
