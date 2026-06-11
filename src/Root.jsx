import { useEffect, useState } from 'react'
import { CartProvider } from './context/CartContext'
import App from './App.jsx'
import AdminPage from './admin/AdminPage.jsx'
import { ADMIN_HASH } from './admin/adminConfig'

// Enrutado minimo por hash: el panel de administracion vive en /#admin y queda
// separado del storefront (no aparece en la navegacion del sitio).
export default function Root() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash.startsWith(ADMIN_HASH))

  useEffect(() => {
    const onHashChange = () => setIsAdmin(window.location.hash.startsWith(ADMIN_HASH))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (isAdmin) return <AdminPage />

  return (
    <CartProvider>
      <App />
    </CartProvider>
  )
}
