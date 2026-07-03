export default function PreFaqContact({ whatsappBase }) {
  return (
    <section className="pre-faq-contact" aria-label="Contacto Los Eucaliptus">
      <div className="site-footer-brand">
        <div>
          <strong>Los Eucaliptus Corralon</strong>
          <p>
            Materiales de construccion a los mejores precios de Zona Sur. Stock permanente y
            envio propio desde 1954.
          </p>
        </div>
        <div className="site-footer-actions">
          <a className="footer-chip footer-chip-wa" href={whatsappBase} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a className="footer-chip" href="tel:+5491159748316">
            Llamar
          </a>
        </div>
      </div>
    </section>
  )
}
