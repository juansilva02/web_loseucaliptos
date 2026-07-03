import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Truck, MapPin } from 'lucide-react'
import {
  formatKm,
  reverseGeocode,
  resolveCoverage,
  searchAddress,
  shortenPlaceLabel,
} from '../lib/delivery-coverage'
import { useDialogA11y } from '../hooks/useDialogA11y'

/**
 * Modal para que el cliente verifique si su direccion esta dentro de la
 * zona de envios. Usa el proxy geografico del backend o la geolocalizacion
 * del navegador, y calcula la distancia a cada sucursal.
 *
 * @param {Array}    branches  [{ key, name, lat, lng, coverageRadius, whatsappUrl }]
 * @param {Function} onClose   Cierra el modal
 * @param {Function} onResult  Recibe { label, zone } al verificar una ubicacion
 */

export default function CoverageChecker({ branches, onClose, onResult }) {
  const dialogRef = useDialogA11y({ onClose })
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | options | result | error
  const [options, setOptions] = useState([])
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const requestControllerRef = useRef(null)

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  const evaluateCandidate = (candidate) => {
    const coverage = candidate.coverage || resolveCoverage({
      lat: candidate.lat,
      lng: candidate.lng,
      branches,
    })
    const nearest = branches.find((branch) => branch.key === (
      coverage.branchKey || coverage.nearestBranchKey
    )) || branches[0]
    const distanceMeters = coverage.distanceKm != null
      ? coverage.distanceKm * 1000
      : coverage.nearestDistanceMeters
    const zone = coverage.status === 'in_range' || coverage.status === 'redirected'
      ? 'in'
      : distanceMeters <= 15000
        ? 'near'
        : 'out'

    setResult({
      zone,
      nearest: { ...nearest, distanceMeters },
      placeLabel: candidate.label,
    })
    setStatus('result')
    onResult?.({
      label: shortenPlaceLabel(candidate),
      zone,
      nearestBranch: nearest?.name,
      nearestDistanceKm: Number((distanceMeters / 1000).toFixed(1)),
    })
  }

  const geocode = async () => {
    const term = query.trim()
    if (!term) return

    setStatus('loading')
    setErrorMsg('')
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller

    try {
      const places = await searchAddress(term, { signal: controller.signal })

      if (!places.length) {
        setErrorMsg('No encontramos esa direccion. Proba con calle y localidad, por ejemplo "Av. Monteverde 2766, Solano".')
        setStatus('error')
        return
      }

      if (places.length === 1) {
        evaluateCandidate(places[0])
        return
      }

      setOptions(places)
      setStatus('options')
    } catch (error) {
      if (error.name === 'AbortError') return
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
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const place = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
            { signal: controller.signal },
          )
          evaluateCandidate(place)
        } catch (error) {
          if (error.name === 'AbortError') return
          const fallbackCoverage = resolveCoverage({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            branches,
          })
          evaluateCandidate({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: 'Tu ubicacion actual',
            coverage: {
              status: fallbackCoverage.status,
              branchKey: fallbackCoverage.resolvedBranchKey || fallbackCoverage.nearestBranchKey,
              distanceKm: fallbackCoverage.nearestDistanceKm,
            },
          })
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
      <div
        ref={dialogRef}
        className="coverage-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Verifica si llegamos a tu zona"
        tabIndex={-1}
      >
        <div className="coverage-modal-head">
          <div>
            <p className="section-kicker">Envios Zona Sur</p>
            <h3>Llegamos a tu zona?</h3>
          </div>
          <button type="button" className="coverage-close" onClick={onClose} aria-label="Cerrar">
            x
          </button>
        </div>

        {status === 'result' && result ? (
          <div className={`coverage-result coverage-result-${result.zone}`}>
            <strong className="coverage-result-title">
              {result.zone === 'in' && (<><CheckCircle2 size={18} aria-hidden="true" /> Si, llegamos!</>)}
              {result.zone === 'near' && (<><Truck size={18} aria-hidden="true" /> Estamos cerca tuyo</>)}
              {result.zone === 'out' && (<><MapPin size={18} aria-hidden="true" /> Estas fuera de la zona habitual</>)}
            </strong>
            <p>
              {result.zone === 'in' &&
                `Estas a ${formatKm(result.nearest.distanceMeters)} de la sucursal ${result.nearest.name}, dentro de nuestra zona de envio propio.`}
              {result.zone === 'near' &&
                `Estas a ${formatKm(result.nearest.distanceMeters)} de la sucursal ${result.nearest.name}. Coordinamos envios en toda Zona Sur, consultanos.`}
              {result.zone === 'out' &&
                `Estas a ${formatKm(result.nearest.distanceMeters)} de la sucursal ${result.nearest.name}. Igual podes consultarnos: evaluamos cada entrega.`}
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
                key={place.id}
                type="button"
                onClick={() => evaluateCandidate(place)}
              >
                {place.label}
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
                onChange={(event) => {
                  requestControllerRef.current?.abort()
                  setQuery(event.target.value)
                  setStatus('idle')
                  setErrorMsg('')
                }}
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
            <p className="coverage-credit">
              Direcciones por{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                OpenStreetMap
              </a>
            </p>
          </div>
        )}
      </div>
    </>
  )
}
