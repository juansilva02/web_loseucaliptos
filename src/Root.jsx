import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import App from './App.jsx'
import { ADMIN_HASH } from './admin/adminConfig'

const AdminPage = lazy(() => import('./admin/AdminPage.jsx'))

// Enrutado minimo por hash: el panel de administracion vive en /#admin y queda
// separado del storefront (no aparece en la navegacion del sitio).
export default function Root() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash.startsWith(ADMIN_HASH))

  useEffect(() => {
    const onHashChange = () => setIsAdmin(window.location.hash.startsWith(ADMIN_HASH))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (isAdmin) {
    return (
      <Suspense fallback={<div className="route-loading">Cargando administracion...</div>}>
        <AdminPage />
      </Suspense>
    )
  }

  return (
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  )
}
