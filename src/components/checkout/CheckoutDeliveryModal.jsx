import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  MapPin,
  Store,
} from 'lucide-react'
import { getDeliveryFeeByLocality } from '../../data/delivery-fees'
import { getAvailableDeliveryDays } from '../../lib/delivery-schedule'
import {
  formatKm,
  getLocalityLabel,
  resolveCoverage,
  searchAddress,
} from '../../lib/delivery-coverage'
import { useDialogA11y } from '../../hooks/useDialogA11y'
import './CheckoutDeliveryModal.css'

const STORAGE_KEY = 'loseucaliptos-checkout-draft-v1'
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000

const EMPTY_DELIVERY = {
  locality: '',
  street: '',
  streetNumber: '',
  betweenStreets: '',
  geocodedLabel: '',
  lat: null,
  lng: null,
  coverageStatus: 'idle',
  resolvedBranchKey: null,
  nearestDistanceKm: null,
  deliveryFee: null,
}

const EMPTY_CUSTOMER = {
  fullName: '',
  phone: '',
  wantsEmail: false,
  email: '',
}

const EMPTY_SCHEDULE = {
  dateIso: '',
  dateLabel: '',
  slotKey: '',
  slotLabel: '',
}

function createEmptyDraft(branchKey = 'solano') {
  return {
    branchKey,
    step: 1,
    delivery: { ...EMPTY_DELIVERY },
    customer: { ...EMPTY_CUSTOMER },
    schedule: { ...EMPTY_SCHEDULE },
  }
}

function resetCoverageState(delivery, overrides = {}) {
  return {
    ...delivery,
    geocodedLabel: '',
    lat: null,
    lng: null,
    coverageStatus: 'idle',
    resolvedBranchKey: null,
    nearestDistanceKm: null,
    deliveryFee: null,
    ...overrides,
  }
}

function sanitizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function sanitizePhoneInput(value) {
  return String(value || '').replace(/[^\d+\s()-]/g, '')
}

function hasValidPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length >= 8
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function getBranchLabel(branch) {
  if (!branch) return ''
  if (branch.label) return branch.label
  if (branch.kicker) return String(branch.kicker).replace(/^Sucursal\s+/i, '').trim()
  return String(branch.name || '').replace(/^Corralon Los Eucaliptus\s*/i, '').replace(/["']/g, '').trim()
}

function buildAddressQuery(delivery) {
  return `${sanitizeText(delivery.street)} ${sanitizeText(delivery.streetNumber)}, ${sanitizeText(delivery.locality)}, Buenos Aires, Argentina`
}

function writeStoredDraft(draft) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      expiresAt: Date.now() + DRAFT_TTL_MS,
      draft,
    }))
  } catch {
    // almacenamiento no disponible
  }
}

function clearStoredDraft() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // almacenamiento no disponible
  }
}

function mergeDraft(selectedBranchKey, parsed) {
  const base = createEmptyDraft(selectedBranchKey)
  if (!parsed || typeof parsed !== 'object') return base

  const merged = {
    branchKey: parsed.branchKey || selectedBranchKey,
    step: [1, 2, 3].includes(parsed.step) ? parsed.step : 1,
    delivery: {
      ...EMPTY_DELIVERY,
      ...(parsed.delivery || {}),
    },
    customer: {
      ...EMPTY_CUSTOMER,
      ...(parsed.customer || {}),
    },
    schedule: {
      ...EMPTY_SCHEDULE,
      ...(parsed.schedule || {}),
    },
  }

  if (merged.step === 1 && !merged.delivery.resolvedBranchKey) {
    merged.branchKey = selectedBranchKey
  }

  return merged
}

function readStoredDraft(selectedBranchKey) {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyDraft(selectedBranchKey)
    const stored = JSON.parse(raw)
    if (stored?.expiresAt && stored.expiresAt <= Date.now()) {
      clearStoredDraft()
      return createEmptyDraft(selectedBranchKey)
    }
    return mergeDraft(selectedBranchKey, stored?.draft || stored)
  } catch {
    return createEmptyDraft(selectedBranchKey)
  }
}

function getDeliveryFeeLabel(deliveryFee, formatPrice) {
  return deliveryFee == null ? 'A confirmar' : formatPrice(deliveryFee)
}

function getEstimatedTotalLabel(subtotal, deliveryFee, formatPrice) {
  return deliveryFee == null ? `${formatPrice(subtotal)} + envio a confirmar` : formatPrice(subtotal + deliveryFee)
}

function buildWhatsappCheckoutMessage({ cartItems, subtotal, draft, effectiveBranch, formatPrice }) {
  const itemLines = cartItems.map((item) => `- ${item.name} x${item.quantity} | ${formatPrice(item.price * item.quantity)}`)
  const shippingLabel = getDeliveryFeeLabel(draft.delivery.deliveryFee, formatPrice)
  const totalLabel = getEstimatedTotalLabel(subtotal, draft.delivery.deliveryFee, formatPrice)
  const deliveryLine = `${sanitizeText(draft.delivery.street)} ${sanitizeText(draft.delivery.streetNumber)}`

  return [
    'Hola, quiero hacer este pedido:',
    '',
    ...itemLines,
    '',
    `Sucursal: ${getBranchLabel(effectiveBranch)}`,
    'Entrega:',
    `- Localidad: ${sanitizeText(draft.delivery.locality)}`,
    `- Direccion: ${deliveryLine}`,
    draft.delivery.betweenStreets ? `- Entre calles: ${sanitizeText(draft.delivery.betweenStreets)}` : '',
    '',
    'Cliente:',
    `- Nombre: ${sanitizeText(draft.customer.fullName)}`,
    `- Telefono: ${sanitizeText(draft.customer.phone)}`,
    draft.customer.wantsEmail && draft.customer.email ? `- Email: ${sanitizeText(draft.customer.email)}` : '',
    '',
    'Entrega solicitada:',
    `- Fecha: ${draft.schedule.dateLabel || draft.schedule.dateIso}`,
    `- Franja: ${draft.schedule.slotLabel}`,
    '',
    `Subtotal: ${formatPrice(subtotal)}`,
    `Envio: ${shippingLabel}`,
    `Total estimado: ${totalLabel}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export default function CheckoutDeliveryModal({
  selectedBranchKey,
  cartItems,
  subtotal,
  branches,
  formatPrice,
  onClose,
}) {
  const dialogRef = useDialogA11y({ onClose })
  const availableDays = useMemo(() => getAvailableDeliveryDays(), [])
  const initialDraft = useMemo(() => {
    const stored = readStoredDraft(selectedBranchKey)
    if (
      stored.schedule.dateIso &&
      !availableDays.some((day) => day.dateIso === stored.schedule.dateIso)
    ) {
      stored.schedule = { ...EMPTY_SCHEDULE }
    }
    return stored
  }, [availableDays, selectedBranchKey])
  const [draft, setDraft] = useState(initialDraft)
  const [addressOptions, setAddressOptions] = useState([])
  const [addressError, setAddressError] = useState('')
  const [customerError, setCustomerError] = useState('')
  const [scheduleError, setScheduleError] = useState('')
  const [expandedDateIso, setExpandedDateIso] = useState(initialDraft.schedule.dateIso || availableDays[0]?.dateIso || '')
  const requestControllerRef = useRef(null)
  const branchMap = useMemo(() => new Map(branches.map((branch) => [branch.key, branch])), [branches])
  const effectiveBranch = branchMap.get(draft.delivery.resolvedBranchKey || draft.branchKey) || branches[0]
  const activeBranch = branchMap.get(draft.branchKey) || effectiveBranch

  useEffect(() => {
    writeStoredDraft(draft)
  }, [draft])

  useEffect(() => {
    if (!cartItems.length) {
      clearStoredDraft()
      onClose?.()
    }
  }, [cartItems.length, onClose])

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  const updateDeliveryField = (field, value) => {
    requestControllerRef.current?.abort()
    setAddressError('')
    setAddressOptions([])
    setDraft((current) => ({
      ...current,
      step: 1,
      delivery: resetCoverageState(current.delivery, { [field]: value }),
    }))
  }

  const validateDeliveryFields = () => {
    if (!sanitizeText(draft.delivery.locality)) return 'Completa la localidad de entrega.'
    if (!sanitizeText(draft.delivery.street)) return 'Completa la calle de entrega.'
    if (!sanitizeText(draft.delivery.streetNumber)) return 'Completa la altura de entrega.'
    return ''
  }

  const applySelectedPlace = (place) => {
    const lat = Number(place.lat)
    const lng = Number(place.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAddressError('No pudimos interpretar la direccion elegida. Proba con otra opcion.')
      setDraft((current) => ({
        ...current,
        delivery: { ...current.delivery, coverageStatus: 'error' },
      }))
      return
    }

    const locality = getLocalityLabel(place) || sanitizeText(draft.delivery.locality)
    const coverage = place.coverage
      ? {
          status: place.coverage.status,
          resolvedBranchKey: place.coverage.branchKey,
          nearestDistanceKm: place.coverage.distanceKm,
          nearestDistanceMeters: place.coverage.distanceKm * 1000,
        }
      : resolveCoverage({ lat, lng, branches, selectedBranchKey: draft.branchKey })

    const nextDelivery = {
      ...draft.delivery,
      locality,
      geocodedLabel: place.label || buildAddressQuery(draft.delivery),
      lat,
      lng,
      coverageStatus: coverage.status,
      resolvedBranchKey: coverage.resolvedBranchKey,
      nearestDistanceKm: coverage.nearestDistanceKm,
      deliveryFee: place.deliveryFee ?? getDeliveryFeeByLocality(locality),
    }

    setAddressOptions([])

    if (coverage.status === 'out_of_range') {
      setAddressError(
        `La direccion queda fuera de cobertura. La sucursal mas cercana esta a ${formatKm(coverage.nearestDistanceMeters)}.`,
      )
      setDraft((current) => ({
        ...current,
        step: 1,
        delivery: nextDelivery,
      }))
      return
    }

    setAddressError('')
    setDraft((current) => ({
      ...current,
      branchKey: coverage.resolvedBranchKey || current.branchKey,
      step: 2,
      delivery: nextDelivery,
    }))
  }

  const handleResolveCoverage = async () => {
    const validationError = validateDeliveryFields()
    if (validationError) {
      setAddressError(validationError)
      return
    }

    setAddressError('')
    setAddressOptions([])
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    setDraft((current) => ({
      ...current,
      delivery: { ...current.delivery, coverageStatus: 'loading' },
    }))

    try {
      const places = await searchAddress({
        locality: sanitizeText(draft.delivery.locality),
        street: sanitizeText(draft.delivery.street),
        streetNumber: sanitizeText(draft.delivery.streetNumber),
      }, {
        selectedBranchKey: draft.branchKey,
        signal: controller.signal,
      })

      if (!places.length) {
        setAddressError('No encontramos esa direccion. Revisa calle, altura y localidad.')
        setDraft((current) => ({
          ...current,
          delivery: { ...current.delivery, coverageStatus: 'error' },
        }))
        return
      }

      if (places.length === 1) {
        applySelectedPlace(places[0])
        return
      }

      setAddressOptions(places)
      setDraft((current) => ({
        ...current,
        delivery: { ...current.delivery, coverageStatus: 'idle' },
      }))
    } catch (error) {
      if (error.name === 'AbortError') return
      setAddressError('No pudimos validar la direccion. Intenta nuevamente en unos segundos.')
      setDraft((current) => ({
        ...current,
        delivery: { ...current.delivery, coverageStatus: 'error' },
      }))
    }
  }

  const handleCustomerContinue = () => {
    const fullName = sanitizeText(draft.customer.fullName)
    const phone = sanitizeText(draft.customer.phone)

    if (!fullName) {
      setCustomerError('Completa el nombre y apellido de contacto.')
      return
    }

    if (!hasValidPhone(phone)) {
      setCustomerError('Completa un numero de contacto valido.')
      return
    }

    if (draft.customer.wantsEmail && !isValidEmail(draft.customer.email)) {
      setCustomerError('El correo electronico no tiene un formato valido.')
      return
    }

    setCustomerError('')
    setScheduleError('')
    setDraft((current) => ({
      ...current,
      step: 3,
      customer: {
        ...current.customer,
        fullName,
        phone,
        email: sanitizeText(current.customer.email),
      },
    }))
  }

  const handleSelectSlot = (dateIso, slot) => {
    setScheduleError('')
    setDraft((current) => ({
      ...current,
      schedule: {
        dateIso,
        dateLabel: availableDays.find((day) => day.dateIso === dateIso)?.label || dateIso,
        slotKey: slot.key,
        slotLabel: slot.label,
      },
    }))
  }

  const handleSubmit = () => {
    if (!draft.schedule.dateIso || !draft.schedule.slotKey) {
      setScheduleError('Selecciona una fecha y una franja horaria para continuar.')
      return
    }

    const message = buildWhatsappCheckoutMessage({
      cartItems,
      subtotal,
      draft,
      effectiveBranch,
      formatPrice,
    })
    const url = `${effectiveBranch.whatsappUrl}?text=${encodeURIComponent(message)}`
    const opened = window.open(url, '_blank', 'noopener,noreferrer')

    if (!opened) {
      window.location.href = url
    }

    clearStoredDraft()
    onClose?.()
  }

  const handleExplicitCancel = () => {
    clearStoredDraft()
    onClose?.()
  }

  const shippingLabel = getDeliveryFeeLabel(draft.delivery.deliveryFee, formatPrice)
  const totalEstimatedLabel = getEstimatedTotalLabel(subtotal, draft.delivery.deliveryFee, formatPrice)

  return (
    <>
      <div className="checkout-delivery-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={dialogRef}
        className="checkout-delivery-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-delivery-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="checkout-delivery-head">
          <div>
            <p className="section-kicker">Pedido guiado por WhatsApp</p>
            <h3 id="checkout-delivery-title">Entrega paso a paso</h3>
            <p>Confirmamos cobertura, datos de contacto y la franja de entrega antes de abrir WhatsApp.</p>
          </div>
          <button type="button" className="checkout-delivery-close" onClick={onClose} aria-label="Cerrar checkout">
            x
          </button>
        </div>

        <div className="checkout-stepper" aria-label="Pasos del checkout">
          {[
            { step: 1, label: '1. Entrega' },
            { step: 2, label: '2. Cliente' },
            { step: 3, label: '3. Fecha y envio' },
          ].map((stepItem) => (
            <span
              key={stepItem.step}
              className={[
                'checkout-step-pill',
                draft.step === stepItem.step ? 'checkout-step-pill-active' : '',
                draft.step > stepItem.step ? 'checkout-step-pill-done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {draft.step > stepItem.step ? <CheckCircle2 size={15} aria-hidden="true" /> : null}
              {stepItem.label}
            </span>
          ))}
        </div>

        <div className="checkout-delivery-body">
          <span className="checkout-branch-chip">
            <Store size={16} aria-hidden="true" /> Sucursal inicial: {getBranchLabel(activeBranch)}
          </span>

          {draft.delivery.coverageStatus === 'redirected' ? (
            <div className="checkout-status-note checkout-status-note-redirect">
              <strong>
                <Store size={16} aria-hidden="true" />
                Tu direccion sera atendida por {getBranchLabel(effectiveBranch)}
              </strong>
              <p>La otra sucursal no cubre esa direccion, asi que redirigimos el pedido automaticamente por cercania.</p>
            </div>
          ) : null}

          {draft.step === 1 ? (
            <div className="checkout-section-card">
              <h4>Paso 1. Direccion de entrega</h4>
              <p>Necesitamos validar la direccion completa para confirmar que la entrega este dentro de rango.</p>

              <div className="checkout-form-grid">
                <div className="checkout-form-field">
                  <label htmlFor="checkout-locality">Localidad</label>
                  <input
                    id="checkout-locality"
                    type="text"
                    autoFocus
                    value={draft.delivery.locality}
                    onChange={(event) => updateDeliveryField('locality', event.target.value)}
                    placeholder="Ej: San Francisco Solano"
                  />
                </div>

                <div className="checkout-form-field">
                  <label htmlFor="checkout-between-streets">Entre calles (opcional)</label>
                  <input
                    id="checkout-between-streets"
                    type="text"
                    value={draft.delivery.betweenStreets}
                    onChange={(event) => updateDeliveryField('betweenStreets', event.target.value)}
                    placeholder="Ej: Calle 844 y Calle 895"
                  />
                </div>

                <div className="checkout-form-field">
                  <label htmlFor="checkout-street">Calle</label>
                  <input
                    id="checkout-street"
                    type="text"
                    value={draft.delivery.street}
                    onChange={(event) => updateDeliveryField('street', event.target.value)}
                    placeholder="Ej: Av. Donato Alvarez"
                  />
                </div>

                <div className="checkout-form-field">
                  <label htmlFor="checkout-street-number">Altura</label>
                  <input
                    id="checkout-street-number"
                    type="text"
                    inputMode="numeric"
                    value={draft.delivery.streetNumber}
                    onChange={(event) => updateDeliveryField('streetNumber', event.target.value)}
                    placeholder="Ej: 1500"
                  />
                </div>
              </div>

              {draft.delivery.coverageStatus === 'loading' ? (
                <div className="checkout-loading">
                  <LoaderCircle size={16} aria-hidden="true" /> Validando direccion y cobertura...
                </div>
              ) : null}

              {draft.delivery.geocodedLabel && draft.delivery.coverageStatus !== 'out_of_range' ? (
                <div className="checkout-status-note checkout-status-note-success">
                  <strong>
                    <MapPin size={16} aria-hidden="true" />
                    Direccion validada
                  </strong>
                  <p>{draft.delivery.geocodedLabel}</p>
                  <p>
                    Sucursal asignada: {getBranchLabel(effectiveBranch)}{' '}
                    {draft.delivery.nearestDistanceKm != null ? `(${draft.delivery.nearestDistanceKm.toFixed(1).replace('.', ',')} km)` : ''}
                  </p>
                  <p>Envio: {shippingLabel === 'A confirmar' ? 'Costo de envio a confirmar' : shippingLabel}</p>
                </div>
              ) : null}

              {addressOptions.length ? (
                <div className="checkout-options-list">
                  <p className="checkout-inline-hint">
                    <CircleAlert size={15} aria-hidden="true" /> Encontramos varias direcciones. Elige la correcta.
                  </p>
                  {addressOptions.map((place) => (
                    <button key={place.id} type="button" onClick={() => applySelectedPlace(place)}>
                      {place.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {addressError ? <p className="checkout-error-text">{addressError}</p> : null}
              <p className="checkout-geocoder-credit">
                Direcciones provistas por{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                  OpenStreetMap
                </a>
              </p>

              <div className="checkout-actions-row">
                <button type="button" className="checkout-ghost-button" onClick={handleExplicitCancel}>
                  Cancelar checkout
                </button>
                <div className="checkout-actions-group">
                  <button
                    type="button"
                    className="primary-cta"
                    onClick={handleResolveCoverage}
                    disabled={draft.delivery.coverageStatus === 'loading'}
                  >
                    {draft.delivery.coverageStatus === 'loading' ? 'Validando...' : 'Validar cobertura y continuar'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {draft.step === 2 ? (
            <>
              <div className="checkout-section-card">
                <h4>Paso 2. Datos del cliente</h4>
                <p>Usamos estos datos para identificar el pedido y coordinar la entrega por WhatsApp.</p>

                <div className="checkout-summary-grid">
                  <div className="checkout-summary-block">
                    <span>Entrega</span>
                    <strong>
                      {sanitizeText(draft.delivery.street)} {sanitizeText(draft.delivery.streetNumber)}
                    </strong>
                    <p>{sanitizeText(draft.delivery.locality)}</p>
                  </div>
                  <div className="checkout-summary-block">
                    <span>Sucursal</span>
                    <strong>{getBranchLabel(effectiveBranch)}</strong>
                    <p>{draft.delivery.deliveryFee == null ? 'Envio a confirmar' : `Envio ${shippingLabel}`}</p>
                  </div>
                </div>

                <div className="checkout-form-grid">
                  <div className="checkout-form-field checkout-form-field-wide">
                    <label htmlFor="checkout-full-name">Nombre completo</label>
                    <input
                      id="checkout-full-name"
                      type="text"
                      autoFocus
                      value={draft.customer.fullName}
                      onChange={(event) => {
                        setCustomerError('')
                        setDraft((current) => ({
                          ...current,
                          customer: { ...current.customer, fullName: event.target.value },
                        }))
                      }}
                      placeholder="Ej: Juan Perez"
                    />
                  </div>

                  <div className="checkout-form-field checkout-form-field-wide">
                    <label htmlFor="checkout-phone">Numero de contacto</label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      value={draft.customer.phone}
                      onChange={(event) => {
                        setCustomerError('')
                        setDraft((current) => ({
                          ...current,
                          customer: { ...current.customer, phone: sanitizePhoneInput(event.target.value) },
                        }))
                      }}
                      placeholder="Ej: 11 1234-5678"
                    />
                  </div>
                </div>

                <label className="checkout-customer-toggle">
                  <input
                    type="checkbox"
                    checked={draft.customer.wantsEmail}
                    onChange={(event) => {
                      setCustomerError('')
                      const wantsEmail = event.target.checked
                      setDraft((current) => ({
                        ...current,
                        customer: {
                          ...current.customer,
                          wantsEmail,
                          email: wantsEmail ? current.customer.email : '',
                        },
                      }))
                    }}
                  />
                  Agregar correo electronico
                </label>

                {draft.customer.wantsEmail ? (
                  <div className="checkout-form-field">
                    <label htmlFor="checkout-email">Correo electronico</label>
                    <input
                      id="checkout-email"
                      type="email"
                      value={draft.customer.email}
                      onChange={(event) => {
                        setCustomerError('')
                        setDraft((current) => ({
                          ...current,
                          customer: { ...current.customer, email: event.target.value },
                        }))
                      }}
                      placeholder="Ej: cliente@correo.com"
                    />
                  </div>
                ) : null}

                {customerError ? <p className="checkout-error-text">{customerError}</p> : null}

                <div className="checkout-actions-row">
                  <button type="button" className="secondary-cta" onClick={() => setDraft((current) => ({ ...current, step: 1 }))}>
                    <ArrowLeft size={16} aria-hidden="true" /> Volver a la direccion
                  </button>
                  <div className="checkout-actions-group">
                    <button type="button" className="primary-cta" onClick={handleCustomerContinue}>
                      Continuar con fecha de entrega
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {draft.step === 3 ? (
            <>
              <div className="checkout-section-card">
                <h4>Paso 3. Fecha y franja horaria</h4>
                <p>Selecciona una fecha habil y despues la franja disponible para tu entrega.</p>

                <div className="checkout-schedule-list">
                  {availableDays.map((day) => {
                    const isOpen = expandedDateIso === day.dateIso
                    return (
                      <div key={day.dateIso} className="checkout-day-card">
                        <button
                          type="button"
                          className={`checkout-day-toggle${isOpen ? ' checkout-day-toggle-open' : ''}`}
                          onClick={() => setExpandedDateIso((current) => (current === day.dateIso ? '' : day.dateIso))}
                        >
                          <span>{day.label}</span>
                          <ChevronDown size={18} aria-hidden="true" />
                        </button>

                        {isOpen ? (
                          <div className="checkout-slot-list">
                            {day.slots.map((slot) => {
                              const isActive =
                                draft.schedule.dateIso === day.dateIso && draft.schedule.slotKey === slot.key
                              return (
                                <button
                                  key={slot.key}
                                  type="button"
                                  className={`checkout-slot-button${isActive ? ' checkout-slot-button-active' : ''}`}
                                  onClick={() => handleSelectSlot(day.dateIso, slot)}
                                >
                                  {slot.label}
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                {scheduleError ? <p className="checkout-error-text">{scheduleError}</p> : null}
              </div>

              <div className="checkout-summary-card">
                <h4>Resumen final</h4>

                <div className="checkout-summary-grid">
                  <div className="checkout-summary-block">
                    <span>Sucursal efectiva</span>
                    <strong>{getBranchLabel(effectiveBranch)}</strong>
                    <p>{draft.delivery.geocodedLabel || `${sanitizeText(draft.delivery.street)} ${sanitizeText(draft.delivery.streetNumber)}`}</p>
                  </div>
                  <div className="checkout-summary-block">
                    <span>Cliente</span>
                    <strong>{sanitizeText(draft.customer.fullName) || 'Pendiente'}</strong>
                    <p>{sanitizeText(draft.customer.phone) || 'Sin telefono cargado'}</p>
                    {draft.customer.wantsEmail && draft.customer.email ? <p>{sanitizeText(draft.customer.email)}</p> : null}
                  </div>
                </div>

                <div className="checkout-summary-row">
                  <span>Entrega</span>
                  <strong>
                    {sanitizeText(draft.delivery.locality)} - {sanitizeText(draft.delivery.street)} {sanitizeText(draft.delivery.streetNumber)}
                  </strong>
                </div>
                {draft.delivery.betweenStreets ? (
                  <div className="checkout-summary-row">
                    <span>Entre calles</span>
                    <strong>{sanitizeText(draft.delivery.betweenStreets)}</strong>
                  </div>
                ) : null}
                <div className="checkout-summary-row">
                  <span>Fecha</span>
                  <strong>{draft.schedule.dateLabel || draft.schedule.dateIso || 'Seleccion pendiente'}</strong>
                </div>
                <div className="checkout-summary-row">
                  <span>Franja</span>
                  <strong>{draft.schedule.slotLabel || 'Seleccion pendiente'}</strong>
                </div>
                <div className="checkout-summary-row">
                  <span>Subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <div className="checkout-summary-row">
                  <span>Envio</span>
                  <strong>{shippingLabel}</strong>
                </div>
                <div className="checkout-summary-row checkout-summary-total">
                  <span>Total estimado</span>
                  <strong>{totalEstimatedLabel}</strong>
                </div>

                <div className="checkout-actions-row">
                  <button type="button" className="secondary-cta" onClick={() => setDraft((current) => ({ ...current, step: 2 }))}>
                    <ArrowLeft size={16} aria-hidden="true" /> Volver a datos
                  </button>
                  <div className="checkout-actions-group">
                    <button type="button" className="primary-cta" onClick={handleSubmit}>
                      Abrir WhatsApp con el pedido
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  )
}
