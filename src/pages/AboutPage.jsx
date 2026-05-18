import { promoSteps, supplierBrands } from '../lib/catalog'

export function AboutPage() {
  return (
    <section className="about-shell">
      <div className="about-copy">
        <p className="section-kicker">Nosotros</p>
        <h1>Corralon Los Eucaliptos Solano vende con cercania comercial y salida a obra.</h1>
        <p>
          La nueva web esta planteada como vidriera publicitaria y punto de captura de pedidos.
          Primero ayudamos a comprar, despues ordenamos el pago y recien ahi pasa a revision
          comercial y logistica.
        </p>

        <ol className="step-list">
          {promoSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="branch-card">
        <h3>Marcas y lineas</h3>
        <div className="service-list">
          {supplierBrands.map((brand) => (
            <div className="service-item" key={brand}>
              <span />
              <p>{brand}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
