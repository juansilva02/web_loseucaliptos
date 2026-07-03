import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import BenefitsBar from './components/home/BenefitsBar'
import CartDrawer from './components/home/CartDrawer'
import FeaturedProducts from './components/home/FeaturedProducts'
import FloatingCartButton from './components/home/FloatingCartButton'
import Hero from './components/home/Hero'
import PreFaqContact from './components/home/PreFaqContact'
import PurchaseSteps from './components/home/PurchaseSteps'
import SiteFooter from './components/home/SiteFooter'
import SiteHeader from './components/home/SiteHeader'
import { api } from './admin/api'
import {
  benefitTicker,
  branches as siteBranches,
  faqs,
  heroSignals,
  promoImages,
  purchaseSteps,
} from './data/siteContent'
import { useCart } from './context/useCart'
import { useAutoRotate, useScrolled } from './hooks'
import {
  formatMoney,
  formatPrice,
  getCategoryDefinition,
  normalizeText,
  whatsappBase,
  whatsappBosques,
} from './lib/catalog'
import './App.css'

const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const CartPriceReviewModal = lazy(() => import('./components/checkout/CartPriceReviewModal'))
const CheckoutDeliveryModal = lazy(() => import('./components/checkout/CheckoutDeliveryModal'))
const CoverageChecker = lazy(() => import('./components/CoverageChecker'))
const Locations = lazy(() => import('./components/home/Locations'))
const ProductQuickView = lazy(() => import('./components/ProductQuickView'))
const PromoCarousel = lazy(() => import('./components/home/PromoCarousel'))
const FaqSection = lazy(() => import('./components/home/FaqSection'))

function parseDraftQuantity(value) {
  if (value === '') return ''
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(10000, parsed) : ''
}

function normalizeDraftQuantity(value) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(10000, parsed) : 1
}

function App() {
  const {
    items,
    itemCount,
    subtotal,
    addItem,
    removeItem,
    changeQuantity,
    replaceItems,
    clearCart,
  } = useCart()
  const [activeCategory, setActiveCategory] = useState('all')
  const [featuredSearch, setFeaturedSearch] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [showCoverage, setShowCoverage] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutBranchKey, setCheckoutBranchKey] = useState('solano')
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [priceReview, setPriceReview] = useState(null)
  const [productQuantities, setProductQuantities] = useState({})
  const [activeLocation, setActiveLocation] = useState(0)
  const [activePromo, setActivePromo] = useState(0)
  const [stepsPaused, setStepsPaused] = useState(false)
  const [catalog, setCatalog] = useState({ categories: [], products: [] })
  const [catalogStatus, setCatalogStatus] = useState('loading')
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

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const loadCatalog = () => {
    setCatalogStatus('loading')
    return api.getPublicCatalog()
      .then((response) => {
        setCatalog({
          categories: response.categories || [],
          products: response.products || [],
        })
        setCatalogStatus('ok')
      })
      .catch(() => {
        setCatalogStatus('error')
      })
  }

  useEffect(() => {
    let cancelled = false
    api.getPublicCatalog()
      .then((response) => {
        if (cancelled) return
        setCatalog({
          categories: response.categories || [],
          products: response.products || [],
        })
        setCatalogStatus('ok')
      })
      .catch(() => {
        if (!cancelled) setCatalogStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categoryNameByKey = useMemo(
    () => new Map(catalog.categories.map((category) => [category.key, category.name])),
    [catalog.categories],
  )

  const featuredProducts = useMemo(() => {
    return catalog.products
      .filter((product) => product.featured === 1)
      .map((product) => {
        const definition = getCategoryDefinition(product.category)
        const categoryName = categoryNameByKey.get(product.category) || definition.name
        const subtitle = [product.brand, product.unit ? `Venta por ${product.unit}` : '']
          .filter(Boolean)
          .join(' | ')

        return {
          id: product.id,
          code: product.id,
          excelName: product.name,
          price: product.price,
          brandName: product.brand || '',
          unit: product.unit || '',
          categoryKey: product.category,
          categoryName,
          image: product.image || '',
          version: product.version,
          subtitle: subtitle || definition.description,
          publicBlurb: definition.description,
        }
      })
  }, [catalog.products, categoryNameByKey])

  const deliveryBranches = useMemo(
    () => siteBranches.map((branch) => ({
      key: branch.key,
      label: branch.label,
      name: branch.name,
      kicker: branch.kicker,
      lat: branch.lat,
      lng: branch.lng,
      coverageRadius: branch.coverageRadius,
      address: branch.address,
      whatsappUrl: branch.whatsappUrl,
    })),
    [],
  )

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
  const highlightedProduct = filteredProducts.length ? activeProduct % filteredProducts.length : -1

  const scrollToProducts = () => {
    document.getElementById('productos-destacados')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const changeProductDraftQuantity = (productId, delta) => {
    setProductQuantities((current) => {
      const base = normalizeDraftQuantity(current[productId])
      return { ...current, [productId]: Math.min(10000, Math.max(1, base + delta)) }
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

  const handleCoverageResult = (nextLocation) => {
    setDeliveryLocation(nextLocation)
    try {
      window.localStorage.setItem('eucaliptus-delivery-location', JSON.stringify(nextLocation))
    } catch {
      // El selector sigue funcionando sin persistencia.
    }
  }

  const openCheckoutWithQuote = (quote, branchKey) => {
    replaceItems(quote.items)
    setPriceReview(null)
    setCheckoutError('')
    if (!quote.items.length) {
      setCheckoutError('Los productos del carrito ya no estan disponibles para compra.')
      setShowCart(true)
      return
    }
    setCheckoutBranchKey(branchKey)
    setShowCart(false)
    setShowCheckout(true)
  }

  const handleStartCheckout = async (branchKey) => {
    if (!items.length || checkoutBusy) return
    setCheckoutBusy(true)
    setCheckoutError('')
    try {
      const quote = await api.quoteCart(items)
      if (quote.changes.length || quote.blocked.length) {
        setShowCart(false)
        setPriceReview({ ...quote, branchKey })
      } else {
        openCheckoutWithQuote(quote, branchKey)
      }
    } catch (error) {
      setCheckoutError(error.message || 'No pudimos validar los precios. Intenta nuevamente.')
    } finally {
      setCheckoutBusy(false)
    }
  }

  const home = (
    <>
      <BenefitsBar benefitTicker={benefitTicker} />
      <SiteHeader
        isScrolled={isScrolled}
        deliveryLocation={deliveryLocation}
        itemCount={itemCount}
        subtotal={subtotal}
        formatPrice={formatMoney}
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
        categories={catalog.categories}
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
          branches={siteBranches}
          activeLocation={activeLocation}
          setActiveLocation={setActiveLocation}
        />
        <PromoCarousel
          promoImages={promoImages}
          activePromo={activePromo}
          setActivePromo={setActivePromo}
        />
        <PreFaqContact whatsappBase={whatsappBase} />
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
  )

  return (
    <main className="figma-storefront">
      <Routes>
        <Route path="/" element={home} />
        <Route
          path="/catalogo/*"
          element={(
            location.pathname === '/catalogo/' ? (
              <Navigate to="/catalogo" replace />
            ) : location.pathname === '/catalogo' ? (
              <Suspense fallback={<div className="route-loading">Cargando catalogo...</div>}>
                <CatalogPage
                  catalog={catalog}
                  status={catalogStatus}
                  onRetry={loadCatalog}
                  onBack={() => navigate('/')}
                  onOpenCart={() => setShowCart(true)}
                />
              </Suspense>
            ) : (
              <Navigate to="/catalogo" replace />
            )
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

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

      <Suspense fallback={null}>
        {quickViewProduct ? (
          <ProductQuickView
            product={quickViewProduct}
            quantity={getProductDraftQuantity(quickViewProduct.id)}
            onClose={() => setQuickViewProduct(null)}
            onChangeQuantity={(value) => setProductDraftQuantity(quickViewProduct.id, value)}
            onBlurQuantity={() => setProductDraftQuantity(
              quickViewProduct.id,
              getProductDraftQuantity(quickViewProduct.id),
              true,
            )}
            onAddToCart={() => {
              handleAddToCart(quickViewProduct)
              setQuickViewProduct(null)
              setShowCart(true)
            }}
          />
        ) : null}

      {!showCart ? (
        <FloatingCartButton
          itemCount={itemCount}
          floatingCartItems={floatingCartItems}
          subtotal={subtotal}
          formatPrice={formatMoney}
          setShowCart={setShowCart}
        />
      ) : null}

      {showCoverage ? (
        <CoverageChecker
          branches={deliveryBranches}
          onClose={() => setShowCoverage(false)}
          onResult={handleCoverageResult}
        />
      ) : null}

      {priceReview ? (
        <CartPriceReviewModal
          quote={priceReview}
          formatMoney={formatMoney}
          onClose={() => {
            setPriceReview(null)
            setShowCart(true)
          }}
          onConfirm={() => openCheckoutWithQuote(priceReview, priceReview.branchKey)}
        />
      ) : null}

      {showCheckout ? (
        <CheckoutDeliveryModal
          selectedBranchKey={checkoutBranchKey}
          cartItems={items}
          subtotal={subtotal}
          branches={deliveryBranches}
          formatPrice={formatMoney}
          onClose={() => setShowCheckout(false)}
        />
      ) : null}
      </Suspense>

      {showCart ? (
        <div className="cart-backdrop" onClick={() => setShowCart(false)} aria-hidden="true" />
      ) : null}

      <CartDrawer
        showCart={showCart}
        setShowCart={setShowCart}
        items={items}
        subtotal={subtotal}
        formatPrice={formatMoney}
        changeQuantity={changeQuantity}
        removeItem={removeItem}
        clearCart={clearCart}
        checkoutBusy={checkoutBusy}
        checkoutError={checkoutError}
        onStartCheckout={handleStartCheckout}
      />
    </main>
  )
}

export default App
