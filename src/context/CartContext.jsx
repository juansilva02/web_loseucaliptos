import { useEffect, useMemo, useState } from 'react'
import { CartContext } from './cart-context'

const STORAGE_KEY = 'loseucaliptos-cart-v1'

function readCart() {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCart())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const value = useMemo(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0)
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)

    return {
      items,
      itemCount,
      subtotal,
      addItem(product, quantity = 1) {
        setItems((current) => {
          const safeQuantity = Math.max(1, Number(quantity) || 1)
          const existing = current.find((item) => item.id === product.id)
          if (existing) {
            return current.map((item) =>
              item.id === product.id ? { ...item, quantity: item.quantity + safeQuantity } : item,
            )
          }

          return [
            ...current,
            {
              id: product.id,
              code: product.code,
              name: product.excelName,
              brandName: product.brandName,
              price: product.price,
              categoryName: product.categoryName,
              quantity: safeQuantity,
            },
          ]
        })
      },
      removeItem(id) {
        setItems((current) => current.filter((item) => item.id !== id))
      },
      changeQuantity(id, nextQuantity) {
        setItems((current) =>
          current
            .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, Number(nextQuantity) || 0) } : item))
            .filter((item) => item.quantity > 0),
        )
      },
      clearCart() {
        setItems([])
      },
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
