import { createContext } from 'react'

// Contexto del carrito separado del componente Provider para no romper
// fast-refresh (react-refresh/only-export-components).
export const CartContext = createContext(null)
