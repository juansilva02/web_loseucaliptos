import { contactItems, financingCards, whatsappBase } from '../lib/catalog'

export function ContactPage() {
  return (
    <section className="contact-shell">
      <div className="contact-panel">
        <div>
          <p className="section-kicker">Contacto directo</p>
          <h2>Presupuestos, pedidos y coordinacion comercial.</h2>
          <p className="contact-text">
            Atendemos en San Francisco Solano y centralizamos la venta por WhatsApp y orden web
            para responder rapido, validar pago y preparar entrega.
          </p>
          <ul className="branch-list">
            {contactItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <a className="primary-action" href={whatsappBase} target="_blank" rel="noreferrer">
          Escribir al +54 9 11 5974-8316
        </a>
      </div>

      <div className="financing-strip">
        {financingCards.map((card) => (
          <article className="financing-card" key={card.title}>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
