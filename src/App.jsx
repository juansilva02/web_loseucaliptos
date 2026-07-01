import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CoverageChecker from './components/CoverageChecker'
import BenefitsBar from './components/home/BenefitsBar'
import CartDrawer from './components/home/CartDrawer'
import FeaturedProducts from './components/home/FeaturedProducts'
import FloatingCartButton from './components/home/FloatingCartButton'
import Hero from './components/home/Hero'
import PurchaseSteps from './components/home/PurchaseSteps'
import SiteFooter from './components/home/SiteFooter'
import SiteHeader from './components/home/SiteHeader'
import ProductQuickView from './components/ProductQuickView'
import { api } from './admin/api'
import { benefitTicker, branches, faqs, heroSignals, promoImages, purchaseSteps } from './data/siteContent'
import { useCart } from './context/useCart'
import { useAutoRotate, useScrolled } from './hooks'
import {
  categoryCards,
  formatPrice,
  normalizeText,
  whatsappBase,
  whatsappBosques,
} from './lib/catalog'
import './App.css'

const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const Locations = lazy(() => import('./components/home/Locations'))
const PromoCarousel = lazy(() => import('./components/home/PromoCarousel'))
const FaqSection = lazy(() => import('./components/home/FaqSection'))

function parseDraftQuantity(value) {
  if (value === '') return ''
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : ''
}

function normalizeDraftQuantity(value) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function buildWhatsappOrderMessage({ items, subtotal }) {
  const itemLines = items.map((item) => `- ${item.name} x${item.quantity} | ${formatPrice(item.price * item.quantity)}`)

  return [
    'Hola, quiero hacer este pedido:',
    '',
    ...itemLines,
    '',
    `Subtotal: ${formatPrice(subtotal)}`,
    '',
    'Aguardo contacto del equipo de ventas para continuar la compra.',
  ]
    .filter(Boolean)
    .join('\n')
}

function App() {
  const { items, itemCount, subtotal, addItem, removeItem, changeQuantity, clearCart } = useCart()
  const [activeCategory, setActiveCategory] = useState('all')
  const [featuredSearch, setFeaturedSearch] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [showCoverage, setShowCoverage] = useState(false)
  const [productQuantities, setProductQuantities] = useState({})
  const [activeLocation, setActiveLocation] = useState(0)
  const [activePromo, setActivePromo] = useState(0)
  const [stepsPaused, setStepsPaused] = useState(false)
  const [apiFeatured, setApiFeatured] = useState([])
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [deliveryLocation, setDeliveryLocation] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('eucaliptus-delivery-location')) ?? null
    } catch {
      return null
    }
  })

  const isScrolled = useScrolled(24)
  const [activeSignal] = useAutoRotate(heroSignals.length, 2600)
  const [activeStep, setActiveStep] = useAutoRotate(purchaseSteps.length, 3400, stepsPaused)
  const navigate = useNavigate()
  const location = useLocation()
  const isCatalog = location.pathname === '/catalogo'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false

    api.getPublicFeatured()
      .then((res) => {
        if (!cancelled) setApiFeatured(res.featured || [])
      })
      .catch(() => {
        if (!cancelled) setApiFeatured([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const featuredProducts = useMemo(() => {
    return apiFeatured.map((product) => {
      const category = categoryCards.find((entry) => entry.key === product.categoryKey)
      const subtitle = [product.brandName, product.unit ? `Venta por ${product.unit}` : '']
        .filter(Boolean)
        .join(' · ')

      return {
        ...product,
        subtitle: subtitle || category?.description || 'Material disponible para entrega y retiro.',
        publicBlurb: category?.description || '',
      }
    })
  }, [apiFeatured])

  const filteredProducts = useMemo(() => {
    const term = normalizeText(featuredSearch.trim())

    return featuredProducts.filter((product) => {
      const matchesCategory = activeCategory === 'all' || product.categoryKey === activeCategory
      const matchesSearch = !term ||
        normalizeText(product.excelName).includes(term) ||
        normalizeText(product.categoryName).includes(term) ||
        normalizeText(product.brandName).includes(term)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, featuredSearch, featuredProducts])

  const [activeProduct, setActiveProduct] = useAutoRotate(filteredProducts.length, 2800)
  const floatingCartItems = items.slice(0, 3)
  const cartMsg = encodeURIComponent(buildWhatsappOrderMessage({ items, subtotal }))
  const cartWhatsappUrl = `${whatsappBase}?text=${cartMsg}`
  const cartWhatsappBosques = `${whatsappBosques}?text=${cartMsg}`
  const highlightedProduct = filteredProducts.length ? activeProduct % filteredProducts.length : -1

  const scrollToProducts = () => {
    const section = document.getElementById('productos-destacados')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const changeProductDraftQuantity = (productId, delta) => {
    setProductQuantities((current) => {
      const base = normalizeDraftQuantity(current[productId])
      const next = Math.max(1, base + delta)
      return { ...current, [productId]: next }
    })
  }

  const setProductDraftQuantity = (productId, value, commit = false) => {
    const nextValue = commit ? normalizeDraftQuantity(value) : parseDraftQuantity(value)
    setProductQuantities((current) => ({ ...current, [productId]: nextValue }))
  }

  const getProductDraftQuantity = (productId) => productQuantities[productId] ?? 1

  const handleAddToCart = (product) => {
    addItem(product, normalizeDraftQuantity(getProductDraftQuantity(product.id)))
    setProductQuantities((current) => ({ ...current, [product.id]: 1 }))
  }

  const handleQuickViewQuantity = (productId, value) => {
    setProductDraftQuantity(productId, value)
  }

  const handleCoverageResult = (nextLocation) => {
    setDeliveryLocation(nextLocation)
    try {
      window.localStorage.setItem('eucaliptus-delivery-location', JSON.stringify(nextLocation))
    } catch {
      // almacenamiento no disponible
    }
  }

  return (
    <main className="figma-storefront">
      {isCatalog ? (
        <Suspense fallback={<div className="route-loading">Cargando catalogo...</div>}>
          <CatalogPage onBack={() => navigate('/')} onOpenCart={() => setShowCart(true)} />
        </Suspense>
      ) : (
        <>
          <BenefitsBar benefitTicker={benefitTicker} />
          <SiteHeader
            isScrolled={isScrolled}
            deliveryLocation={deliveryLocation}
            itemCount={itemCount}
            subtotal={subtotal}
            formatPrice={formatPrice}
            setShowCoverage={setShowCoverage}
            setShowCart={setShowCart}
            whatsappBase={whatsappBase}
            whatsappBosques={whatsappBosques}
          />
          <Hero
            heroSignals={heroSignals}
            activeSignal={activeSignal}
            scrollToProducts={scrollToProducts}
            whatsappBase={whatsappBase}
            whatsappBosques={whatsappBosques}
          />
          <FeaturedProducts
            activeCategory={activeCategory}
            featuredSearch={featuredSearch}
            filteredProducts={filteredProducts}
            highlightedProduct={highlightedProduct}
            navigate={navigate}
            setActiveCategory={setActiveCategory}
            setFeaturedSearch={setFeaturedSearch}
            setActiveProduct={setActiveProduct}
            changeProductDraftQuantity={changeProductDraftQuantity}
            getProductDraftQuantity={getProductDraftQuantity}
            setProductDraftQuantity={setProductDraftQuantity}
            handleAddToCart={handleAddToCart}
            formatPrice={formatPrice}
            onOpenProduct={setQuickViewProduct}
          />
          <PurchaseSteps
            purchaseSteps={purchaseSteps}
            activeStep={activeStep}
            stepsPaused={stepsPaused}
            setStepsPaused={setStepsPaused}
            setActiveStep={setActiveStep}
            setShowCart={setShowCart}
            whatsappBase={whatsappBase}
            whatsappBosques={whatsappBosques}
          />
          <Suspense fallback={null}>
            <Locations
              branches={branches}
              activeLocation={activeLocation}
              setActiveLocation={setActiveLocation}
            />
            <PromoCarousel
              promoImages={promoImages}
              activePromo={activePromo}
              setActivePromo={setActivePromo}
            />
            <FaqSection faqs={faqs} />
          </Suspense>
          <SiteFooter
            navigate={navigate}
            scrollToProducts={scrollToProducts}
            setShowCoverage={setShowCoverage}
            setShowCart={setShowCart}
            whatsappBase={whatsappBase}
          />
        </>
      )}

      <a
        className={`floating-whatsapp${showCart ? ' floating-whatsapp-shifted' : ''}`}
        href={whatsappBase}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <svg className="floating-whatsapp-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M16 3C8.82 3 3 8.82 3 16c0 2.28.6 4.52 1.73 6.48L3 29l6.72-1.7A13 13 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3z" fill="white" />
          <path d="M23.14 20.08c-.31-.16-1.83-.9-2.11-.99-.28-.1-.49-.16-.69.15-.2.31-.78.99-.95 1.19-.17.2-.35.22-.66.07-.31-.16-1.3-.48-2.48-1.52-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.47.13-.63.14-.14.31-.37.47-.56.16-.19.2-.31.31-.52.1-.2.05-.38-.02-.54-.08-.16-.69-1.66-.94-2.27-.25-.6-.5-.52-.69-.53H12.3c-.2 0-.52.07-.79.38-.28.31-1.06 1.04-1.06 2.53 0 1.5 1.09 2.94 1.24 3.14.15.2 2.15 3.28 5.21 4.6.73.31 1.3.5 1.74.64.73.23 1.4.2 1.92.12.59-.09 1.83-.75 2.08-1.47.26-.72.26-1.34.18-1.47-.07-.13-.28-.2-.59-.36z" fill="#22c55e" />
        </svg>
      </a>

      <ProductQuickView
        product={quickViewProduct}
        quantity={quickViewProduct ? getProductDraftQuantity(quickViewProduct.id) : 1}
        onClose={() => setQuickViewProduct(null)}
        onChangeQuantity={(value) => quickViewProduct && handleQuickViewQuantity(quickViewProduct.id, value)}
        onBlurQuantity={() => quickViewProduct && setProductDraftQuantity(quickViewProduct.id, getProductDraftQuantity(quickViewProduct.id), true)}
        onAddToCart={() => {
          if (!quickViewProduct) return
          handleAddToCart(quickViewProduct)
          setQuickViewProduct(null)
          setShowCart(true)
        }}
      />

      {!showCart ? (
        <FloatingCartButton
          itemCount={itemCount}
          floatingCartItems={floatingCartItems}
          subtotal={subtotal}
          formatPrice={formatPrice}
          setShowCart={setShowCart}
        />
      ) : null}

      {showCoverage ? (
        <CoverageChecker
          branches={[
            { name: 'Solano', lat: branches[0].lat, lng: branches[0].lng, radius: branches[0].coverageRadius, whatsappUrl: whatsappBase },
            { name: 'Bosques', lat: branches[1].lat, lng: branches[1].lng, radius: branches[1].coverageRadius, whatsappUrl: whatsappBosques },
          ]}
          onClose={() => setShowCoverage(false)}
          onResult={handleCoverageResult}
        />
      ) : null}

      {showCart ? (
        <div className="cart-backdrop" onClick={() => setShowCart(false)} aria-hidden="true" />
      ) : null}

      <CartDrawer
        showCart={showCart}
        setShowCart={setShowCart}
        items={items}
        subtotal={subtotal}
        formatPrice={formatPrice}
        changeQuantity={changeQuantity}
        removeItem={removeItem}
        clearCart={clearCart}
        cartWhatsappUrl={cartWhatsappUrl}
        cartWhatsappBosques={cartWhatsappBosques}
      />
    </main>
  )
}

export default App
