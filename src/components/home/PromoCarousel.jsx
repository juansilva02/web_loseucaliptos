export default function PromoCarousel({ promoImages, activePromo, setActivePromo }) {
  const prevPromo = () => setActivePromo((current) => (current - 1 + promoImages.length) % promoImages.length)
  const nextPromo = () => setActivePromo((current) => (current + 1) % promoImages.length)

  return (
    <section className="promo-carousel">
      <div className="promo-carousel-track">
        {promoImages.map((image, index) => (
          <div
            key={index}
            className={`promo-carousel-slide${activePromo === index ? ' promo-carousel-slide-active' : ''}`}
          >
            <img src={image.src} alt={image.alt} />
          </div>
        ))}
      </div>
      {promoImages.length > 1 ? (
        <>
          <button className="promo-carousel-nav promo-carousel-prev" type="button" onClick={prevPromo} aria-label="Imagen anterior">←</button>
          <button className="promo-carousel-nav promo-carousel-next" type="button" onClick={nextPromo} aria-label="Imagen siguiente">→</button>
          <div className="promo-carousel-dots">
            {promoImages.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`promo-dot${activePromo === index ? ' promo-dot-active' : ''}`}
                onClick={() => setActivePromo(index)}
                aria-label={`Ver imagen ${index + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
