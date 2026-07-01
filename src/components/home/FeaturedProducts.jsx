import { categoryCards } from '../../lib/catalog'

export default function FeaturedProducts({
  activeCategory,
  featuredSearch,
  filteredProducts,
  highlightedProduct,
  navigate,
  setActiveCategory,
  setFeaturedSearch,
  setActiveProduct,
  changeProductDraftQuantity,
  getProductDraftQuantity,
  setProductDraftQuantity,
  handleAddToCart,
  formatPrice,
}) {
  return (
    <section className="featured-section-figma" id="productos-destacados">
      <div className="section-header">
        <h2>Productos destacados</h2>
        <div className="section-header-actions">
          <label className="featured-filter">
            <span>Filtrar</span>
            <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>
              <option value="all">Todas las categorias</option>
              {categoryCards.slice(0, 6).map((category) => (
                <option key={category.key} value={category.key}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button className="text-link-button" type="button" onClick={() => navigate('/catalogo')}>
            Ver todos los productos
          </button>
        </div>
      </div>

      <div className="featured-search-wrap">
        <input
          className="featured-search-input"
          type="search"
          placeholder="Buscar producto..."
          value={featuredSearch}
          onChange={(event) => setFeaturedSearch(event.target.value)}
          autoComplete="off"
        />
        {featuredSearch ? (
          <button className="featured-search-clear" type="button" onClick={() => setFeaturedSearch('')} aria-label="Limpiar">×</button>
        ) : null}
      </div>

      <div className="products-grid">
        {filteredProducts.map((product, index) => (
          <article
            className={`product-card${highlightedProduct === index ? ' product-card-active' : ''}`}
            key={product.id}
            onMouseEnter={() => setActiveProduct(index)}
          >
            {product.image ? (
              <div className="product-visual-large product-visual-image-frame">
                <img className="product-visual-image" src={product.image} alt={product.excelName} />
              </div>
            ) : (
              <div className="product-visual-large" data-category={product.categoryKey}>
                <span>{product.excelName}</span>
              </div>
            )}
            <div className="product-copy">
              <h3>{product.excelName}</h3>
              <p>{product.subtitle}</p>
              <strong>{formatPrice(product.price)}</strong>
            </div>
            <div className="product-actions">
              <div className="mini-quantity">
                <button type="button" aria-label="Disminuir cantidad" onClick={() => changeProductDraftQuantity(product.id, -1)}>
                  -
                </button>
                <input
                  className="mini-quantity-input"
                  type="number"
                  min="1"
                  value={getProductDraftQuantity(product.id)}
                  onChange={(event) => setProductDraftQuantity(product.id, event.target.value)}
                  onBlur={(event) => setProductDraftQuantity(product.id, event.target.value)}
                  aria-label="Cantidad"
                />
                <button type="button" aria-label="Aumentar cantidad" onClick={() => changeProductDraftQuantity(product.id, 1)}>
                  +
                </button>
              </div>
              <button className="add-cart-button" type="button" onClick={() => handleAddToCart(product)}>
                Agregar al carrito
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
