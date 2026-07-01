export default function FaqSection({ faqs }) {
  return (
    <section className="faq-section" id="preguntas-frecuentes" aria-label="Preguntas frecuentes">
      <div className="faq-intro">
        <p className="section-kicker">¿Tenes dudas?</p>
        <h2>Preguntas frecuentes</h2>
      </div>
      <div className="faq-list">
        {faqs.map((item) => (
          <details className="faq-item" key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
