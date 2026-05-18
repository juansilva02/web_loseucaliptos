import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { categoryCards, contactItems, formatPrice, whatsappBase } from '../lib/catalog'

export function SiteLayout() {
  const navigate = useNavigate()
  const { itemCount, subtotal } = useCart()
  const [headerSearch, setHeaderSearch] = useState('')
  const [headerCategory, setHeaderCategory] = useState('all')

  function handleHeaderSearch(event) {
    event.preventDefault()

    const query = headerSearch.trim()
    const params = new URLSearchParams()

    if (query) params.set('q', query)
    if (headerCategory !== 'all') params.set('categoria', headerCategory)

    navigate(`/productos${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div className="site-shell">
      <header className="utility-bar">
        <div className="utility-group">
          <span>Zona Sur, Buenos Aires</span>
          <span>Lun a Vie 8:00 - 12:00 | 14:00 - 19:00</span>
          <span>Sab 8:00 - 14:00</span>
        </div>
        <div className="utility-group utility-group-right">
          <span>Atencion mayorista y minorista</span>
          <span>Envios a domicilio</span>
        </div>
      </header>

      <header className="store-header">
        <div className="store-brand">
          <div className="store-brand-mark">
            <span>LE</span>
          </div>
          <div className="store-brand-copy">
            <strong>Los Eucaliptus Corralon</strong>
            <span>Materiales para la construccion</span>
          </div>
        </div>

        <form className="store-search" onSubmit={handleHeaderSearch}>
          <input
            type="search"
            value={headerSearch}
            onChange={(event) => setHeaderSearch(event.target.value)}
            placeholder="Buscar productos, marcas o categorias..."
          />
          <select value={headerCategory} onChange={(event) => setHeaderCategory(event.target.value)}>
            <option value="all">Todas las categorias</option>
            {categoryCards.slice(0, 6).map((category) => (
              <option key={category.key} value={category.key}>
                {category.name}
              </option>
            ))}
          </select>
          <button type="submit">Buscar</button>
        </form>

        <div className="store-actions">
          <div className="store-account">
            <strong>Mi cuenta</strong>
            <span>Ingresar / Registrarme</span>
          </div>
          <NavLink className="store-cart" to="/checkout">
            <strong>Mi carrito</strong>
            <span>
              {itemCount} items · {formatPrice(subtotal)}
            </span>
          </NavLink>
          <a className="nav-cta" href={whatsappBase} target="_blank" rel="noreferrer">
            11 5974-8316
          </a>
        </div>
      </header>

      <nav className="category-ribbon">
        <div className="category-ribbon-primary">Todas las categorias</div>
        <div className="category-ribbon-links">
          <NavLink to="/">Inicio</NavLink>
          {categoryCards.slice(0, 6).map((category) => (
            <NavLink key={category.key} to={`/productos?categoria=${category.key}`}>
              {category.shortName}
            </NavLink>
          ))}
          <NavLink to="/productos">Productos</NavLink>
          <NavLink to="/checkout">Pedido</NavLink>
          <NavLink to="/contacto">Envios</NavLink>
        </div>
      </nav>

      <Outlet />

      <footer className="site-footer">
        <div>
          <p className="section-kicker">Rubros principales</p>
          <ul className="footer-list">
            {categoryCards.slice(0, 6).map((category) => (
              <li key={category.key}>{category.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="section-kicker">Sucursal Solano</p>
          <ul className="footer-list">
            {contactItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  )
}
