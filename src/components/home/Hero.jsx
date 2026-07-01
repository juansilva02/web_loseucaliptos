import promoCamion from '../../assets/promo-camion.webp'

export default function Hero({
  heroSignals,
  activeSignal,
  scrollToProducts,
  whatsappBase,
  whatsappBosques,
}) {
  return (
    <section className="hero-section">
      <div className="hero-bg">
        <img src={promoCamion} alt="Camion de Los Eucaliptus Corralon" />
      </div>
      <div className="hero-content">
        <p className="hero-eyebrow">Desde 1954 · Solano y Bosques, Zona Sur</p>
        <h1>
          Corralon de
          <br />
          materiales en
          <br />
          Zona Sur
        </h1>
        <p>Materiales que construyen tu hogar · Stock permanente · Envios propios</p>
        <div className="hero-cta-row">
          <button className="primary-cta hero-primary-cta" type="button" onClick={scrollToProducts}>
            Compra online
          </button>
          <div className="hero-wa-group">
            <span className="hero-wa-label">o pedi por WhatsApp</span>
            <div className="hero-wa-buttons">
              <a className="hero-wa-btn" href={whatsappBase} target="_blank" rel="noreferrer">
                Solano
              </a>
              <a className="hero-wa-btn" href={whatsappBosques} target="_blank" rel="noreferrer">
                Bosques
              </a>
            </div>
          </div>
        </div>
        <div className="hero-signals">
          {heroSignals.map((signal, index) => (
            <span className={activeSignal === index ? 'hero-signal-active' : ''} key={signal}>
              {signal}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
