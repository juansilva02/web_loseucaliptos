import CoverageMap from '../CoverageMap'

export default function Locations({ branches, activeLocation, setActiveLocation }) {
  const prevBranch = () => setActiveLocation((current) => (current - 1 + branches.length) % branches.length)
  const nextBranch = () => setActiveLocation((current) => (current + 1) % branches.length)

  return (
    <section className="location-section" id="sucursales">
      <div className="location-carousel">
        <div className="location-carousel-viewport">
          {branches.map((branch, index) => (
            <article
              key={branch.name}
              className={`location-card${activeLocation === index ? ' location-card-visible' : ''}`}
            >
              <div className="location-copy">
                <p className="section-kicker">{branch.kicker}</p>
                <h3>{branch.heading}</h3>
                <p>{branch.description}</p>
                <div className="location-meta">
                  <span>{branch.address}</span>
                  {branch.phone ? <span>Tel: {branch.phone}</span> : null}
                  <span>{branch.hours}</span>
                </div>
                <a className="primary-cta" href={branch.mapsDirectionsUrl} target="_blank" rel="noreferrer">
                  Abrir en Google Maps
                </a>
              </div>
              <div className="location-map-frame">
                <CoverageMap
                  lat={branch.lat}
                  lng={branch.lng}
                  radius={branch.coverageRadius}
                  color="#db3a1e"
                  label={branch.kicker}
                />
              </div>
            </article>
          ))}
        </div>

        <div className="location-carousel-controls">
          <button
            className="location-carousel-btn"
            type="button"
            onClick={prevBranch}
            aria-label="Sucursal anterior"
          >
            ←
          </button>
          <div className="location-carousel-dots">
            {branches.map((branch, index) => (
              <button
                key={branch.name}
                className={`location-dot${activeLocation === index ? ' location-dot-active' : ''}`}
                type="button"
                onClick={() => setActiveLocation(index)}
                aria-label={`Ver ${branch.name}`}
              />
            ))}
          </div>
          <button
            className="location-carousel-btn"
            type="button"
            onClick={nextBranch}
            aria-label="Siguiente sucursal"
          >
            →
          </button>
        </div>
      </div>
    </section>
  )
}
