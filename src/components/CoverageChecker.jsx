import { useState } from 'react'
import { CheckCircle2, Truck, MapPin } from 'lucide-react'

/**
 * Modal para que el cliente verifique si su direccion esta dentro de la
 * zona de envios. Geocodifica con Nominatim (OpenStreetMap) o usa la
 * geolocalizacion del navegador, y calcula la distancia a cada sucursal.
 *
 * @param {Array}    branches  [{ name, lat, lng, radius, whatsappUrl }]
 * @param {Function} onClose   Cierra el modal
 * @param {Function} onResult  Recibe { label, zone } al verificar una ubicacion
 */

// Arma "Avenida Calchaqui 3950, Quilmes Oeste" desde los campos
// estructurados de Nominatim (addressdetails=1)
function shortenPlaceLabel(place) {
  const address = place.address ?? {}
  const street = [address.road, address.house_number].filter(Boolean).join(' ')
  const locality = address.city || address.town || address.village || address.suburb || address.municipality || ''
  const label = [street, locality].filter(Boolean).join(', ')

  if (label) return label
  return String(place.display_name).split(',').slice(0, 2).join(',').trim()
}

const NEAR_RADIUS = 15000 // metros: fuera del radio propio pero coordinable

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function formatKm(meters) {
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('reverse geocode failed')
  return response.json()
}

export default function CoverageChecker({ branches, onClose, onResult }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | options | result | error
  const [options, setOptions] = useState([])
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const evaluatePoint = (lat, lng, placeLabel, shortLabel = placeLabel) => {
    const ranked = branches
      .map((branch) => ({ ...branch, distance: distanceMeters(lat, lng, branch.lat, branch.lng) }))
      .sort((a, b) => a.distance - b.distance)

    const nearest = ranked[0]
    let zone = 'out'
    if (nearest.distance <= nearest.radius) zone = 'in'
    else if (nearest.distance <= NEAR_RADIUS) zone = 'near'

    setResult({ zone, nearest, placeLabel })
    setStatus('result')
    onResult?.({
      label: shortLabel,
      zone,
      nearestBranch: nearest.name,
      nearestDistanceKm: Number((nearest.distance / 1000).toFixed(1)),
    })
  }

  const geocode = async () => {
    const term = query.trim()
    if (!term) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const search = /buenos aires|argentina/i.test(term) ? term : `${term}, Buenos Aires, Argentina`
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ar&limit=4&addressdetails=1&q=${encodeURIComponent(search)}`
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('geocode failed')
      const places = await response.json()

      if (!places.length) {
        setErrorMsg('No encontramos esa direccion. Proba con calle y localidad, por ejemplo "Av. Monteverde 2766, Solano".')
        setStatus('error')
        return
      }

      if (places.length === 1) {
        evaluatePoint(Number(places[0].lat), Number(places[0].lon), places[0].display_name, shortenPlaceLabel(places[0]))
        return
      }

      setOptions(places)
      setStatus('options')
    } catch {
      setErrorMsg('No pudimos buscar la direccion. Revisa tu conexion e intenta de nuevo.')
      setStatus('error')
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Tu navegador no permite usar la ubicacion. Escribi tu direccion.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const place = await reverseGeocode(position.coords.latitude, position.coords.longitude)
          evaluatePoint(
            position.coords.latitude,
            position.coords.longitude,
            place.display_name || 'Tu ubicacion actual',
            shortenPlaceLabel(place),
          )
        } catch {
          evaluatePoint(position.coords.latitude, position.coords.longitude, 'Tu ubicacion actual')
        }
      },
      () => {
        setErrorMsg('No pudimos acceder a tu ubicacion. Escribi tu direccion o localidad.')
        setStatus('error')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    )
  }

  const reset = () => {
    setStatus('idle')
    setResult(null)
    setOptions([])
    setErrorMsg('')
  }

  const consultHref = (branch, placeLabel) =>
    `${branch.whatsappUrl}?text=${encodeURIComponent(`Hola, quiero saber si hacen envios a: ${placeLabel}`)}`

  return (
    <>
      <div className="coverage-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="coverage-modal" role="dialog" aria-modal="true" aria-label="Verifica si llegamos a tu zona">
        <div className="coverage-modal-head">
          <div>
            <p className="section-kicker">Envios Zona Sur</p>
            <h3>¿Llegamos a tu zona?</h3>
          </div>
          <button type="button" className="coverage-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {status === 'result' && result ? (
          <div className={`coverage-result coverage-result-${result.zone}`}>
            <strong className="coverage-result-title">
              {result.zone === 'in' && (<><CheckCircle2 size={18} aria-hidden="true" /> ¡Si, llegamos!</>)}
              {result.zone === 'near' && (<><Truck size={18} aria-hidden="true" /> Estamos cerca tuyo</>)}
              {result.zone === 'out' && (<><MapPin size={18} aria-hidden="true" /> Estas fuera de la zona habitual</>)}
            </strong>
            <p>
              {result.zone === 'in' &&
                `Estas a ${formatKm(result.nearest.distance)} de la sucursal ${result.nearest.name}, dentro de nuestra zona de envio propio.`}
              {result.zone === 'near' &&
                `Estas a ${formatKm(result.nearest.distance)} de la sucursal ${result.nearest.name}. Coordinamos envios en toda Zona Sur, consultanos.`}
              {result.zone === 'out' &&
                `Estas a ${formatKm(result.nearest.distance)} de la sucursal ${result.nearest.name}. Igual podes consultarnos: evaluamos cada entrega.`}
            </p>
            <p className="coverage-result-place">{result.placeLabel}</p>
            <a
              className="primary-cta coverage-cta"
              href={consultHref(result.nearest, result.placeLabel)}
              target="_blank"
              rel="noreferrer"
            >
              {result.zone === 'in' ? 'Coordinar envio por WhatsApp' : 'Consultar por WhatsApp'}
            </a>
            <button type="button" className="coverage-again" onClick={reset}>
              Probar con otra direccion
            </button>
          </div>
        ) : status === 'options' ? (
          <div className="coverage-options">
            <p>Encontramos varias coincidencias, elegi la tuya:</p>
            {options.map((place) => (
              <button
                key={place.place_id}
                type="button"
                onClick={() => evaluatePoint(Number(place.lat), Number(place.lon), place.display_name, shortenPlaceLabel(place))}
              >
                {place.display_name}
              </button>
            ))}
            <button type="button" className="coverage-again" onClick={reset}>
              Volver
            </button>
          </div>
        ) : (
          <div className="coverage-form">
            <p>Escribi tu direccion o localidad y te decimos al instante si tu obra entra en nuestra zona de envios.</p>
            <div className="coverage-input-row">
              <input
                type="text"
                value={query}
                placeholder="Ej: Av. Donato Alvarez 1500, Quilmes"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && geocode()}
                disabled={status === 'loading'}
                autoFocus
              />
              <button
                type="button"
                className="primary-cta"
                onClick={geocode}
                disabled={status === 'loading' || !query.trim()}
              >
                {status === 'loading' ? 'Buscando...' : 'Verificar'}
              </button>
            </div>
            <button type="button" className="coverage-geo" onClick={useMyLocation} disabled={status === 'loading'}>
              <MapPin size={16} aria-hidden="true" /> Usar mi ubicacion actual
            </button>
            {status === 'error' ? <p className="coverage-error">{errorMsg}</p> : null}
          </div>
        )}
      </div>
    </>
  )
}
