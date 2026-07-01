export default function PurchaseSteps({
  purchaseSteps,
  activeStep,
  stepsPaused,
  setStepsPaused,
  setActiveStep,
  setShowCart,
  whatsappBase,
  whatsappBosques,
}) {
  return (
    <section
      className="benefits-rail"
      onMouseEnter={() => setStepsPaused(true)}
      onMouseLeave={() => setStepsPaused(false)}
    >
      <div className="benefits-rail-intro">
        <div className="benefits-rail-intro-text">
          <p className="section-kicker">Compra simple · paso {activeStep + 1} de {purchaseSteps.length}</p>
          <h3>
            <span className="benefits-rail-static">Pedir materiales es asi:</span>
            <span className="benefits-rail-rotator" key={activeStep}>
              {purchaseSteps[activeStep].title}
            </span>
          </h3>
        </div>
        <div className="benefits-rail-intro-side">
          <div className="benefits-rail-progress" aria-hidden="true">
            {purchaseSteps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                tabIndex={-1}
                className={`benefits-rail-progress-seg${index < activeStep ? ' benefits-rail-progress-seg-done' : ''}${stepsPaused && index === activeStep ? ' benefits-rail-progress-seg-paused' : ''}`}
                onClick={() => setActiveStep(index)}
              >
                {!stepsPaused && index === activeStep ? <span className="benefits-rail-progress-fill" /> : null}
              </button>
            ))}
          </div>
          <button className="primary-cta benefits-rail-cta" type="button" onClick={() => setShowCart(true)}>
            Ver pedido
          </button>
        </div>
      </div>
      <div className="benefits-rail-grid">
        {purchaseSteps.map((step, index) => (
          <article
            className={`benefit-tile benefit-tile-${step.tone}${index === activeStep ? ' benefit-tile-active' : ''}`}
            key={step.title}
            onMouseEnter={() => setActiveStep(index)}
          >
            <strong>{step.title}</strong>
            <p>{step.text}</p>
            {step.showWhatsapp ? (
              <div className="benefit-wa-links">
                <a href={whatsappBase} target="_blank" rel="noreferrer">
                  Solano: 11 5974-8316
                </a>
                <a href={whatsappBosques} target="_blank" rel="noreferrer">
                  Bosques: 11 3062-3113
                </a>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
