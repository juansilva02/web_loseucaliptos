export default function BenefitsBar({ benefitTicker }) {
  return (
    <div className="benefits-bar" aria-label="Beneficios">
      <div className="benefits-bar-track">
        {[...benefitTicker, ...benefitTicker].map((item, index) => (
          <div
            className="benefits-bar-item"
            key={index}
            aria-hidden={index >= benefitTicker.length ? 'true' : undefined}
          >
            <item.Icon className="benefits-bar-icon" size={16} strokeWidth={2.25} aria-hidden="true" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
