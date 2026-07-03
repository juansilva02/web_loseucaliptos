import { useEffect, useMemo, useState } from 'react'
import { CartContext } from './cart-context'

const STORAGE_KEY = 'loseucaliptos-cart-v1'

function normalizeItem(item) {
  return {
    id: String(item?.id || ''),
    code: item?.code,
    name: String(item?.name || ''),
    brandName: String(item?.brandName || ''),
    categoryName: String(item?.categoryName || ''),
    unit: String(item?.unit || ''),
    price: Math.max(0, Number(item?.price) || 0),
    quantity: Math.min(10000, Math.max(1, Number(item?.quantity) || 1)),
    version: Number(item?.version) || 1,
  }
}

function readCart() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    const source = Array.isArray(parsed) ? parsed : parsed?.items
    return Array.isArray(source)
      ? source.map(normalizeItem).filter((item) => item.id && item.name)
      : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCart())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, items }))
    } catch {
      // El carrito sigue funcionando en memoria si el almacenamiento no esta disponible.
    }
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
          const safeQuantity = Math.min(10000, Math.max(1, Number(quantity) || 1))
          const existing = current.find((item) => item.id === product.id)
          if (existing) {
            return current.map((item) =>
              item.id === product.id
                ? { ...item, quantity: Math.min(10000, item.quantity + safeQuantity) }
                : item,
            )
          }
          return [
            ...current,
            normalizeItem({
              id: product.id,
              code: product.code,
              name: product.excelName,
              brandName: product.brandName,
              categoryName: product.categoryName,
              unit: product.unit,
              price: product.price,
              quantity: safeQuantity,
              version: product.version,
            }),
          ]
        })
      },
      removeItem(id) {
        setItems((current) => current.filter((item) => item.id !== id))
      },
      changeQuantity(id, nextQuantity) {
        setItems((current) =>
          current
            .map((item) => (
              item.id === id
                ? {
                    ...item,
                    quantity: Math.min(10000, Math.max(0, Number(nextQuantity) || 0)),
                  }
                : item
            ))
            .filter((item) => item.quantity > 0),
        )
      },
      replaceItems(nextItems) {
        setItems(Array.isArray(nextItems) ? nextItems.map(normalizeItem) : [])
      },
      clearCart() {
        setItems([])
      },
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
