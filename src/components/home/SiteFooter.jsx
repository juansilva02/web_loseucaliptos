import { MapPin } from 'lucide-react'

function InstagramGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export default function SiteFooter({
  navigate,
  scrollToProducts,
  setShowCoverage,
  setShowCart,
  whatsappBase,
}) {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <strong>Los Eucaliptus Corralon</strong>
          <p>
            Materiales de construccion a los mejores precios de Zona Sur. Stock permanente y
            envio propio desde 1954.
          </p>
          <div className="site-footer-actions">
            <a className="footer-chip footer-chip-wa" href={whatsappBase} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a className="footer-chip" href="tel:+5491159748316">
              Llamar
            </a>
          </div>
        </div>

        <div className="site-footer-block">
          <strong>Navegacion</strong>
          <button type="button" onClick={scrollToProducts}>Productos destacados</button>
          <button type="button" onClick={() => navigate('/catalogo')}>Catalogo completo</button>
          <button type="button" onClick={() => setShowCoverage(true)}>¿Llegamos a tu zona?</button>
          <button
            type="button"
            onClick={() => document.getElementById('sucursales')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Sucursales
          </button>
          <button type="button" onClick={() => setShowCart(true)}>Mi carrito</button>
        </div>

        <div className="site-footer-block">
          <strong>Horarios</strong>
          <span className="footer-branch-name">Solano</span>
          <span>Lunes a Viernes <b>8:00 a 12:00 y 14:00 a 19:00</b></span>
          <span>Sabados <b>8:00 a 14:00</b></span>
          <span className="footer-branch-name">Bosques</span>
          <span>Lunes a Viernes <b>8:00 a 18:00</b></span>
          <span>Sabados <b>8:00 a 15:00</b></span>
        </div>

        <div className="site-footer-block">
          <strong>Contacto</strong>
          <span className="footer-contact-line">
            <MapPin className="footer-contact-icon" size={15} aria-hidden="true" />
            Av. Monteverde 2766, San Francisco Solano
          </span>
          <a href="tel:+5491159748316">11 5974-8316</a>
          <span className="footer-contact-line">
            <MapPin className="footer-contact-icon" size={15} aria-hidden="true" />
            Av. Guillermo Hudson 2855, Bosques, F. Varela
          </span>
          <a href="tel:+5491130623113">11 3062-3113</a>
          <a href={whatsappBase} target="_blank" rel="noreferrer">
            Escribinos por WhatsApp
          </a>
          <a className="footer-social-link" href="https://www.instagram.com/corralon.loseucaliptus/" target="_blank" rel="noreferrer">
            <InstagramGlyph /> @corralon.loseucaliptus
          </a>
          <a className="footer-social-link" href="https://www.instagram.com/loseucaliptus.bosques/" target="_blank" rel="noreferrer">
            <InstagramGlyph /> @loseucaliptus.bosques
          </a>
        </div>
      </div>

      <div className="site-footer-legal">
        © {new Date().getFullYear()} Corralon Los Eucaliptus. Todos los derechos reservados.
        Precios sujetos a actualizacion.
      </div>
    </footer>
  )
}
