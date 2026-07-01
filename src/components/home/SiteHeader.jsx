import logoHeader from '../../assets/logo-header-los-eucaliptos.webp'

export default function SiteHeader({
  isScrolled,
  deliveryLocation,
  itemCount,
  subtotal,
  formatPrice,
  setShowCoverage,
  setShowCart,
  whatsappBase,
  whatsappBosques,
}) {
  return (
    <header className={`commerce-header${isScrolled ? ' commerce-header-scrolled' : ''}`}>
      <div className="brand-lockup">
        <img className="brand-logo-image" src={logoHeader} alt="Los Eucaliptus Corralon" />
      </div>

      <div className="header-actions">
        <button className="coverage-box" type="button" onClick={() => setShowCoverage(true)}>
          <svg className="header-location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="header-location-text">
            <span className="header-location-label">Enviar a</span>
            <span className="header-location-val">
              {deliveryLocation ? deliveryLocation.label : 'Seleccionar ubicacion'}
            </span>
            {deliveryLocation?.nearestBranch ? (
              <span className="header-location-branch">
                Recomendado: {deliveryLocation.nearestBranch}
                {deliveryLocation.nearestDistanceKm ? ` · ${deliveryLocation.nearestDistanceKm} km` : ''}
              </span>
            ) : null}
          </span>
        </button>
        <button className="cart-box" type="button" onClick={() => setShowCart(true)}>
          <strong>Mi carrito</strong>
          <span>{itemCount} items | {formatPrice(subtotal)}</span>
        </button>
        <div className="whatsapp-group">
          <a className="whatsapp-box-branch" href={whatsappBase} target="_blank" rel="noreferrer">
            <strong>Solano</strong>
            <span>11 5974-8316</span>
          </a>
          <a className="whatsapp-box-branch" href={whatsappBosques} target="_blank" rel="noreferrer">
            <strong>Bosques</strong>
            <span>11 3062-3113</span>
          </a>
        </div>
      </div>
    </header>
  )
}
