import { useEffect, useRef, useState } from 'react'
import { resolveImage } from '../lib/catalog'
import { getCatalogQualitySummary } from '../lib/catalog-quality'
import { makeUniqueSlug } from '../lib/slugify'
import { useDialogA11y } from '../hooks/useDialogA11y'
import { api } from './api'
import './AdminPage.css'

const ADMIN_APPEARANCE_KEY = 'eucaliptus-admin-appearance'
const ADMIN_THEME_PRESETS = {
  forest: { label: 'Bosque', shellClass: 'admin-theme-forest' },
  sand: { label: 'Arena', shellClass: 'admin-theme-sand' },
  graphite: { label: 'Grafito', shellClass: 'admin-theme-graphite' },
}

const EMPTY_PRODUCT = {
  name: 'Nuevo producto',
  category_key: '',
  brand: '',
  unit: 'unidad',
  price: 0,
}

const PRODUCT_EDITABLE_FIELDS = [
  'name',
  'category_key',
  'brand',
  'unit',
  'price',
  'image_url',
  'featured',
  'sort',
  'active',
]

function productPatch(product) {
  const patch = Object.fromEntries(PRODUCT_EDITABLE_FIELDS.map((field) => [
    field,
    field === 'price' || field === 'sort'
      ? Number(product[field] || 0)
      : field === 'featured' || field === 'active'
        ? Number(product[field] ?? (field === 'active' ? 1 : 0))
        : product[field] || '',
  ]))
  // Altas nuevas: sin sort el server asigna el final de la lista (MAX+1).
  if (product.sort === undefined) delete patch.sort
  return patch
}

// Mismo orden que usa la home y el catalogo publico (ORDER BY sort, name).
function bySortThenName(a, b) {
  return (Number(a.sort) || 0) - (Number(b.sort) || 0) ||
    String(a.name).localeCompare(String(b.name))
}

function changedFields(product, original) {
  const next = productPatch(product)
  if (!original) return next
  return Object.fromEntries(
    Object.entries(next).filter(([field, value]) => value !== productPatch(original)[field]),
  )
}

function hasPendingImageChange(product) {
  return Boolean(product._pendingImageFile || product._removeImage)
}

function mergeSavedProduct(saved, local) {
  if (!hasPendingImageChange(local)) return saved
  return {
    ...saved,
    _pendingImageFile: local._pendingImageFile,
    _pendingImagePreview: local._pendingImagePreview,
    _removeImage: local._removeImage,
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadAdminAppearance() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ADMIN_APPEARANCE_KEY))
    return {
      theme: parsed?.theme && ADMIN_THEME_PRESETS[parsed.theme] ? parsed.theme : 'forest',
      wallpaper: typeof parsed?.wallpaper === 'string' ? parsed.wallpaper : '',
    }
  } catch {
    return { theme: 'forest', wallpaper: '' }
  }
}

function matchesQuery(values, query) {
  if (!query) return true
  return values.filter(Boolean).some((value) => String(value).toLowerCase().includes(query))
}

function LoginView({ onSuccess }) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.login(user.trim(), password)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <h1>Panel de administracion</h1>
        <p className="admin-login-sub">Corralon Los Eucaliptus</p>
        <label>
          Usuario
          <input type="text" value={user} onChange={(event) => setUser(event.target.value)} autoComplete="username" autoFocus />
        </label>
        <label>
          Contrasena
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>
        {error ? <p className="admin-login-error">{error}</p> : null}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
          {busy ? 'Verificando...' : 'Ingresar'}
        </button>
        <a className="admin-login-back" href="#">&larr; Volver al sitio</a>
      </form>
    </div>
  )
}

function UserProfileModal({ user, onClose, onSave, saving }) {
  const dialogRef = useDialogA11y({ onClose })
  const [draft, setDraft] = useState({
    username: user.username || '',
    display_name: user.display_name || '',
    email: user.email || '',
    phone: user.phone || '',
  })
  const setField = (field) => (event) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }))

  return (
    <>
      <div className="admin-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Datos de ${user.username}`}
        tabIndex={-1}
      >
        <div className="admin-modal-head">
          <h3>Datos del usuario</h3>
          <button type="button" className="admin-btn admin-btn-mini admin-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form
          className="admin-modal-form"
          onSubmit={(event) => {
            event.preventDefault()
            onSave(draft)
          }}
        >
          <label>
            Usuario (login)
            <input
              type="text"
              value={draft.username}
              onChange={setField('username')}
              autoComplete="off"
              required
            />
          </label>
          <label>
            Nombre completo
            <input
              type="text"
              value={draft.display_name}
              onChange={setField('display_name')}
              placeholder="ej: Marcos Gonzalez"
            />
          </label>
          <label>
            Email de recuperación
            <input
              type="text"
              value={draft.email}
              onChange={setField('email')}
              placeholder="opcional, ej: ventas@corralon.com"
            />
          </label>
          <small className="admin-modal-hint">
            Si olvida la contraseña, este correo sirve para contactarlo y resetearla desde acá.
          </small>
          <label>
            Teléfono
            <input
              type="text"
              value={draft.phone}
              onChange={setField('phone')}
              placeholder="opcional, ej: 11 5555-5555"
            />
          </label>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar datos'}
          </button>
        </form>
      </div>
    </>
  )
}

function PriceField({ value, onChange, consultLabel = 'Consultar' }) {
  const isConsult = !value || Number(value) <= 0
  return (
    <div className="admin-price-field">
      <input
        type="number"
        min="0"
        step="1"
        value={isConsult ? '' : value}
        placeholder={consultLabel}
        onChange={(event) => {
          const nextValue = event.target.value
          onChange(nextValue === '' ? null : Number(nextValue))
        }}
      />
      <span className="admin-price-hint">{isConsult ? consultLabel : 'ARS'}</span>
    </div>
  )
}

function ImageCell({ item, currentSrc, onUpload, onRemove, disabled = false }) {
  const inputRef = useRef(null)
  const pendingLabel = item._pendingImageFile
    ? 'Nueva imagen pendiente de guardar'
    : item._removeImage
      ? 'La imagen se quitara al guardar'
      : ''

  return (
    <div className="admin-image-cell">
      <div className="admin-image-preview">
        {currentSrc ? <img src={currentSrc} alt="" /> : <span className="admin-image-empty">Sin imagen</span>}
      </div>
      <div className="admin-image-actions">
        <button
          type="button"
          className="admin-btn admin-btn-mini"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          title={disabled ? 'Guarda primero el producto' : undefined}
        >
          {currentSrc ? 'Cambiar' : 'Subir'}
        </button>
        {currentSrc || item._removeImage ? (
          <button type="button" className="admin-btn admin-btn-mini admin-btn-ghost" onClick={onRemove} disabled={disabled}>
            {item._pendingImageFile ? 'Descartar' : item._removeImage ? 'Deshacer' : 'Quitar'}
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (file) onUpload(file)
            event.target.value = ''
          }}
        />
      </div>
      {disabled ? <small className="admin-image-help">Guarda el producto antes de subir una imagen.</small> : null}
      {pendingLabel ? <small className="admin-image-pending">{pendingLabel}</small> : null}
      {item.image_url || item.image ? <code className="admin-image-path">{item.image_url || item.image}</code> : null}
    </div>
  )
}

function EmptyState({ title, body }) {
  return (
    <div className="admin-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}

function ManualSkuLinker({ sku, products, onLink, saving }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const matches = normalizedQuery.length >= 2
    ? products
      .filter((product) => (
        product.id &&
        !product.source_code &&
        matchesQuery([product.name, product.brand, product.id], normalizedQuery)
      ))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .slice(0, 8)
    : []

  return (
    <details className="admin-sku-manual-link">
      <summary>Vincular a otro producto existente</summary>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre o ID..."
        aria-label={`Buscar producto para vincular al SKU ${sku.code}`}
        autoComplete="off"
      />
      {normalizedQuery.length < 2 ? (
        <small>Escribe al menos 2 caracteres.</small>
      ) : matches.length ? (
        <div className="admin-sku-manual-results">
          {matches.map((product) => (
            <button
              className="admin-btn admin-btn-mini"
              type="button"
              key={product.id}
              disabled={saving}
              onClick={() => {
                if (window.confirm(
                  `Vincular el SKU ${sku.code} (${sku.name}) con "${product.name}"? No se creara un producto nuevo.`,
                )) {
                  onLink(sku, product.id)
                }
              }}
            >
              <strong>{product.name}</strong>
              <span>ID: {product.id}{product.active === 0 ? ' - inactivo' : ''}</span>
            </button>
          ))}
        </div>
      ) : (
        <small>No hay productos sin SKU vinculable que coincidan.</small>
      )}
    </details>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => api.isAuthed())
  const [tab, setTab] = useState('products')
  const [toast, setToast] = useState('')
  const [showAppearancePanel, setShowAppearancePanel] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')
  const [productStatusFilter, setProductStatusFilter] = useState('all')
  const [featuredQuery, setFeaturedQuery] = useState('')
  const [featuredCategoryFilter, setFeaturedCategoryFilter] = useState('all')
  const [featuredStatusFilter, setFeaturedStatusFilter] = useState('all')
  const [categoryQuery, setCategoryQuery] = useState('')
  const [reviewQuery, setReviewQuery] = useState('')
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('editor')
  const [editingUser, setEditingUser] = useState(null)
  const [showNewUserPassword, setShowNewUserPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [showAccountPasswords, setShowAccountPasswords] = useState(false)
  const toastTimer = useRef(null)
  const originalProducts = useRef(new Map())
  const originalCategories = useRef(new Map())

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [productConflicts, setProductConflicts] = useState([])
  const [rawSkus, setRawSkus] = useState([])
  const [rawTotal, setRawTotal] = useState(0)
  const [rawSearch, setRawSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [appearance, setAppearance] = useState(() => loadAdminAppearance())

  const flash = (message) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 4000)
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_APPEARANCE_KEY, JSON.stringify(appearance))
    } catch (error) {
      console.warn('No se pudo persistir la apariencia del admin', error)
    }
  }, [appearance])

  useEffect(() => {
    const handleUnauthorized = () => setAuthed(false)
    window.addEventListener('eucaliptus-admin-unauthorized', handleUnauthorized)
    return () => window.removeEventListener('eucaliptus-admin-unauthorized', handleUnauthorized)
  }, [])

  const applyServerData = (prodRes, catRes, meRes, usersRes) => {
    const nextProducts = prodRes.products || []
    const nextCategories = catRes.categories || []
    setProducts(nextProducts)
    setCategories(nextCategories)
    setMe(meRes.user)
    setUsers(usersRes.users || [])
    setProductConflicts([])
    originalProducts.current = new Map(nextProducts.map((product) => [product.id, structuredClone(product)]))
    originalCategories.current = new Map(nextCategories.map((category) => [category.key, structuredClone(category)]))
  }

  const loadPanelData = () =>
    Promise.all([
      api.getProducts({ all: '1' }),
      api.getCategories(),
      api.me().catch(() => ({ user: null })),
      api.getUsers().catch(() => ({ users: [] })),
    ])

  const syncFromServer = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes, meRes, usersRes] = await loadPanelData()
      applyServerData(prodRes, catRes, meRes, usersRes)
    } catch (err) {
      flash(`Error al cargar datos: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authed) return
    let cancelled = false
    loadPanelData()
      .then(([prodRes, catRes, meRes, usersRes]) => {
        if (!cancelled) {
          applyServerData(prodRes, catRes, meRes, usersRes)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          flash(`Error al cargar datos: ${err.message}`)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authed])

  useEffect(() => {
    if (!authed) return undefined
    const term = rawSearch.trim()
    const timer = window.setTimeout(() => {
      api.getRawSkus(term
        ? { q: term, added: '0', candidates: '1', limit: 80 }
        : { added: '0', candidates: '1', limit: 80 })
        .then((res) => {
          setRawSkus(res.skus || [])
          setRawTotal(Number(res.total || 0))
        })
        .catch((err) => flash(`Error al buscar SKUs: ${err.message}`))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [rawSearch, authed])

  const updateProduct = (index, patch) =>
    setProducts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))

  const removeProduct = (index) => {
    const product = products[index]
    if (!product) return
    if (!product.id) {
      setProducts((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
      flash('Producto nuevo descartado')
      return
    }
    updateProduct(index, { active: 0, featured: 0 })
    flash(`"${product.name}" se quitara del catalogo al guardar los cambios`)
  }

  const restoreProduct = (index) => {
    const product = products[index]
    if (!product?.id) return
    updateProduct(index, { active: 1 })
    flash(`"${product.name}" volvera al catalogo al guardar los cambios`)
  }

  const addProduct = () => {
    const key = categories[0]?.key || ''
    setProducts((prev) => [{
      ...EMPTY_PRODUCT,
      category_key: key,
      id: '',
      active: 1,
      featured: 0,
      _clientId: crypto.randomUUID(),
    }, ...prev])
  }

  const stageProductImage = async (index, file) => {
    const item = products[index]
    if (!item?.id) {
      flash('Guarda primero el producto y luego sube la imagen')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      flash('Usa una imagen JPG, PNG o WebP')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      flash('La imagen debe pesar menos de 8 MB')
      return
    }
    try {
      const preview = await readFileAsDataUrl(file)
      updateProduct(index, {
        _pendingImageFile: file,
        _pendingImagePreview: preview,
        _removeImage: false,
      })
      flash('Imagen lista. Pulsa "Guardar cambios" para publicarla.')
    } catch (err) {
      flash(`No se pudo preparar la imagen: ${err.message}`)
    }
  }

  const toggleProductImageRemoval = (index) => {
    const item = products[index]
    if (!item?.id) return
    if (item._pendingImageFile || item._removeImage) {
      updateProduct(index, {
        _pendingImageFile: null,
        _pendingImagePreview: '',
        _removeImage: false,
      })
      flash('Cambio de imagen descartado')
      return
    }
    updateProduct(index, {
      _pendingImageFile: null,
      _pendingImagePreview: '',
      _removeImage: true,
    })
    flash('La imagen se quitara al guardar los cambios')
  }

  const updateCategory = (index, patch) =>
    setCategories((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))

  const removeCategory = async (index) => {
    const category = categories[index]
    if (!category) return
    try {
      await api.deleteCategory(category.key)
      setCategories((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
      flash(`Categoria "${category.name}" eliminada`)
    } catch (err) {
      flash(`Error: ${err.message}`)
    }
  }

  const addCategory = () => {
    const key = prompt('Key (ej: nuevos-materiales):')
    if (!key) return
    const name = prompt('Nombre visible:')
    if (!name) return

    api.createCategory({ key, name })
      .then((res) => {
        setCategories((prev) => [...prev, res.category])
        flash(`Categoria "${name}" creada`)
      })
      .catch((err) => flash(`Error: ${err.message}`))
  }

  const saveProducts = async () => {
    setSaving(true)
    setProductConflicts([])
    try {
      const occupiedIds = new Set(products.map((product) => product.id).filter(Boolean))
      const updates = products
        .filter((product) => product.id)
        .map((product) => ({
          id: product.id,
          version: product.version,
          patch: changedFields(product, originalProducts.current.get(product.id)),
        }))
        .filter((entry) => Object.keys(entry.patch).length)
      const creates = products
        .filter((product) => !product.id)
        .map((product) => ({
          clientId: product._clientId,
          product: {
            ...productPatch(product),
            id: makeUniqueSlug(product.name, occupiedIds),
          },
        }))
      const pendingImages = products.filter((product) => product.id && hasPendingImageChange(product))

      if (!updates.length && !creates.length && !pendingImages.length) {
        flash('No hay cambios pendientes')
        return
      }

      let merged = products
      if (updates.length || creates.length) {
        const response = await api.saveProductsBulk({ updates, creates })
        const savedById = new Map((response.products || []).map((product) => [product.id, product]))
        const createdByClient = new Map((response.created || []).map((entry) => [entry.clientId, entry.product]))
        merged = products.map((product) => {
          const saved = product.id
            ? savedById.get(product.id)
            : createdByClient.get(product._clientId)
          return saved ? mergeSavedProduct(saved, product) : product
        })
        for (const product of [...(response.products || []), ...(response.created || []).map((entry) => entry.product)]) {
          originalProducts.current.set(product.id, structuredClone(product))
        }
      }

      const imageErrors = []
      let savedImages = 0
      for (const product of merged.filter(hasPendingImageChange)) {
        try {
          const response = product._pendingImageFile
            ? await api.uploadProductImage(product.id, product.version, product._pendingImageFile)
            : await api.removeProductImage(product.id, product.version)
          merged = merged.map((item) => (item.id === product.id ? response.product : item))
          originalProducts.current.set(product.id, structuredClone(response.product))
          savedImages += 1
        } catch (err) {
          if (err.status === 409) setProductConflicts(err.details?.conflicts || [])
          imageErrors.push(`${product.name}: ${err.message}`)
        }
      }

      setProducts(merged)
      const savedChanges = updates.length + creates.length + savedImages
      if (imageErrors.length) {
        flash(`${savedChanges} cambio(s) guardado(s). Error en imagen: ${imageErrors.join(', ')}`)
      } else {
        flash(`${savedChanges} cambio(s) guardado(s)`)
      }
    } catch (err) {
      if (err.status === 409) {
        setProductConflicts(err.details?.conflicts || [])
        flash('Hay cambios de otro usuario. Tus ediciones se conservaron.')
      } else {
        flash(`No se pudieron guardar los productos: ${err.message}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const saveCategories = async () => {
    setSaving(true)
    try {
      const updates = categories
        .filter((category) => category.name !== originalCategories.current.get(category.key)?.name)
        .map((category) => ({
          key: category.key,
          version: category.version,
          name: category.name,
        }))
      if (!updates.length) {
        flash('No hay cambios pendientes')
        return
      }
      const response = await api.saveCategoriesBulk(updates)
      const savedByKey = new Map(response.categories.map((category) => [category.key, category]))
      setCategories((current) => current.map((category) => savedByKey.get(category.key) || category))
      response.categories.forEach((category) => {
        originalCategories.current.set(category.key, structuredClone(category))
      })
      flash(`${updates.length} categoria(s) guardada(s)`)
    } catch (err) {
      flash(err.status === 409
        ? 'Otra persona modifico una categoria. Recarga antes de volver a guardar.'
        : `No se pudieron guardar las categorias: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const productStats = {
    total: products.length,
    active: products.filter((product) => product.active !== 0).length,
    consult: products.filter((product) => !product.price || Number(product.price) <= 0).length,
    featured: products.filter((product) => product.featured === 1).length,
  }

  const featuredStats = {
    total: products.length,
    active: products.filter((item) => item.active !== 0).length,
    featured: products.filter((item) => item.featured === 1).length,
  }

  const filteredProducts = products.filter((product) => {
    const query = productQuery.trim().toLowerCase()
    const categoryKey = product.category_key || product.category || ''
    const matchesCategory = productCategoryFilter === 'all' || categoryKey === productCategoryFilter
    const isActive = product.active !== 0
    const matchesStatus =
      productStatusFilter === 'all' ||
      (productStatusFilter === 'active' && isActive) ||
      (productStatusFilter === 'inactive' && !isActive) ||
      (productStatusFilter === 'consult' && (!product.price || Number(product.price) <= 0))

    return matchesQuery([product.name, product.brand, product.id, categoryKey], query) && matchesCategory && matchesStatus
  })

  const filteredFeaturedItems = products.filter((item) => {
    const query = featuredQuery.trim().toLowerCase()
    const categoryKey = item.category_key || item.category || ''
    const matchesCategory = featuredCategoryFilter === 'all' || categoryKey === featuredCategoryFilter
    const isActive = item.active !== 0
    const matchesStatus =
      featuredStatusFilter === 'all' ||
      (featuredStatusFilter === 'featured' && item.featured === 1) ||
      (featuredStatusFilter === 'not_featured' && item.featured !== 1) ||
      (featuredStatusFilter === 'inactive' && !isActive) ||
      (featuredStatusFilter === 'active' && isActive)

    return matchesQuery([item.name, item.brand, item.id, categoryKey], query) && matchesCategory && matchesStatus
  })

  const sortedFeaturedItems = [...filteredFeaturedItems].sort(bySortThenName)
  const featuredHomeOrder = products
    .filter((item) => item.featured === 1 && item.id)
    .sort(bySortThenName)

  const moveFeaturedProduct = (item, direction) => {
    const position = featuredHomeOrder.findIndex((entry) => entry.id === item.id)
    const neighbor = featuredHomeOrder[position + direction]
    if (position < 0 || !neighbor) return
    const itemSort = Number(item.sort) || 0
    const neighborSort = Number(neighbor.sort) || 0
    const itemIndex = products.indexOf(item)
    const neighborIndex = products.indexOf(neighbor)
    if (itemIndex < 0 || neighborIndex < 0) return
    if (itemSort === neighborSort) {
      // Empate de sort: desempata corriendo el elemento movido.
      updateProduct(itemIndex, { sort: neighborSort + direction })
    } else {
      updateProduct(itemIndex, { sort: neighborSort })
      updateProduct(neighborIndex, { sort: itemSort })
    }
  }

  const filteredCategories = categories.filter((category) => {
    const query = categoryQuery.trim().toLowerCase()
    return matchesQuery([category.key, category.name], query)
  })

  const reviewProducts = products
    .map((product) => ({
      ...product,
      quality: getCatalogQualitySummary(product.name),
    }))
    .filter((product) => {
      const categoryKey = product.category_key || product.category || ''
      return product.quality.needsReview && matchesQuery([product.name, product.id, categoryKey], reviewQuery.trim().toLowerCase())
    })

  const reviewStats = {
    flaggedProducts: reviewProducts.length,
    unavailableProducts: products.filter((product) => getCatalogQualitySummary(product.name).unavailable).length,
    pendingRaw: rawTotal,
    productsWithoutCategory: products.filter((product) => !(product.category_key || product.category)).length,
  }

  const promoteRawSku = async (sku) => {
    if (!window.confirm(
      `Promover el SKU ${sku.code} creara un producto nuevo. Continua solo si confirmaste que no existe en el catalogo.`,
    )) return
    setSaving(true)
    try {
      const response = await api.promoteSku(sku.code, { category_key: sku.suggested_category_key })
      flash(`SKU ${sku.code} promovido con categoria sugerida`)
      setRawSkus((prev) => prev.filter((item) => item.code !== sku.code))
      setRawTotal((current) => Math.max(0, current - 1))
      setProducts((current) => [response.product, ...current])
      originalProducts.current.set(response.product.id, structuredClone(response.product))
    } catch (err) {
      flash(`Error al promover SKU ${sku.code}: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const linkRawSku = async (sku, productId) => {
    setSaving(true)
    try {
      const response = await api.linkSku(sku.code, productId)
      setProducts((current) => current.map((product) => (
        product.id === response.product.id
          ? {
              ...product,
              source_code: response.product.source_code,
              version: response.product.version,
              updated_at: response.product.updated_at,
            }
          : product
      )))
      originalProducts.current.set(response.product.id, structuredClone(response.product))
      setRawSkus((current) => current.filter((item) => item.code !== sku.code))
      setRawTotal((current) => Math.max(0, current - 1))
      flash(`SKU ${sku.code} vinculado a ${response.product.name}`)
    } catch (err) {
      flash(`No se pudo vincular el SKU: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const dismissRawSku = async (sku) => {
    if (!window.confirm(
      `Descartar el SKU ${sku.code} (${sku.name})? Desaparecera de pendientes, pero conservara su registro para auditoria.`,
    )) return
    setSaving(true)
    try {
      await api.dismissSku(sku.code)
      setRawSkus((current) => current.filter((item) => item.code !== sku.code))
      setRawTotal((current) => Math.max(0, current - 1))
      flash(`SKU ${sku.code} descartado`)
    } catch (err) {
      flash(`No se pudo descartar el SKU: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const logout = () => {
    api.logout()
    setAuthed(false)
  }

  const createUser = async () => {
    const username = newUserName.trim().toLowerCase()
    const password = newUserPassword
    if (!username || !password) {
      flash('Usuario y contraseña requeridos')
      return
    }

    setSaving(true)
    try {
      const response = await api.createUser({ username, password, role: newUserRole })
      setUsers((current) => [response.user, ...current])
      setNewUserName('')
      setNewUserPassword('')
      setNewUserRole('editor')
      flash(`Usuario creado: ${response.user.username} (${response.user.role})`)
    } catch (err) {
      flash(`Error al crear usuario: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const saveUserProfile = async (draft) => {
    if (!editingUser) return
    setSaving(true)
    try {
      const response = await api.updateUserProfile(editingUser.id, draft)
      setUsers((current) => current.map((item) => (item.id === response.user.id ? response.user : item)))
      if (me && response.user.id === me.id) setMe(response.user)
      setEditingUser(null)
      flash(`Datos de ${response.user.username} actualizados`)
    } catch (err) {
      flash(`Error al guardar datos: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const changeUserRole = async (user, role) => {
    try {
      const response = await api.updateUserRole(user.id, role)
      setUsers((current) => current.map((item) => (item.id === user.id ? response.user : item)))
      flash(`Rol de ${user.username}: ${response.user.role}`)
    } catch (err) {
      flash(`Error al cambiar rol: ${err.message}`)
    }
  }

  const resetUserPassword = async (user) => {
    const newPassword = prompt(`Nueva contraseña para ${user.username} (mínimo 8 caracteres):`)
    if (newPassword === null) return
    try {
      await api.resetUserPassword(user.id, newPassword)
      flash(`Contraseña de ${user.username} actualizada`)
    } catch (err) {
      flash(`Error al resetear contraseña: ${err.message}`)
    }
  }

  const changeOwnPassword = async (event) => {
    event.preventDefault()
    if (!me?.id) return
    if (nextPassword.length < 8) {
      flash('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    setSaving(true)
    try {
      await api.changeOwnPassword(me.id, currentPassword, nextPassword)
      setCurrentPassword('')
      setNextPassword('')
      flash('Contraseña actualizada. Las sesiones anteriores quedaron invalidadas.')
    } catch (err) {
      flash(`No se pudo cambiar la contraseña: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (user) => {
    if (!window.confirm(`Eliminar el usuario "${user.username}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.deleteUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      flash(`Usuario ${user.username} eliminado`)
    } catch (err) {
      flash(`Error al eliminar usuario: ${err.message}`)
    }
  }

  const updateAppearance = (patch) => {
    setAppearance((current) => ({ ...current, ...patch }))
  }

  const uploadWallpaper = async (file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      flash('Usa una imagen JPG, PNG o WebP')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      flash('El wallpaper debe pesar menos de 3 MB')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      updateAppearance({ wallpaper: dataUrl })
      flash(`Wallpaper listo: ${file.name}`)
    } catch {
      flash('No se pudo cargar el wallpaper')
    }
  }

  const currentTheme = ADMIN_THEME_PRESETS[appearance.theme] || ADMIN_THEME_PRESETS.forest
  const shellStyle = appearance.wallpaper
    ? { '--admin-wallpaper': `url("${appearance.wallpaper}")` }
    : { '--admin-wallpaper': 'none' }

  if (!authed) return <LoginView onSuccess={() => { setAuthed(true); syncFromServer() }} />

  return (
    <div className={`admin-shell ${currentTheme.shellClass}`} style={shellStyle}>
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <strong>Panel · Los Eucaliptus</strong>
          {loading ? <span className="admin-badge-changes">Cargando...</span> : null}
        </div>
        <div className="admin-topbar-actions">
          <button
            type="button"
            className={`admin-btn admin-btn-ghost${showAppearancePanel ? ' admin-btn-ghost-active' : ''}`}
            onClick={() => setShowAppearancePanel((current) => !current)}
          >
            Apariencia
          </button>
          <a className="admin-btn admin-btn-ghost" href="#">Ver sitio</a>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={logout}>Salir</button>
        </div>
      </header>

      {showAppearancePanel ? (
        <section className="admin-appearance-panel">
          <div className="admin-appearance-copy">
            <strong>Personalizar turno</strong>
            <p>Este tema se guarda solo en este navegador. No toca el servidor ni afecta al sitio publico.</p>
          </div>
          <div className="admin-appearance-controls">
            <div className="admin-theme-grid">
              {Object.entries(ADMIN_THEME_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  className={`admin-theme-chip${appearance.theme === key ? ' admin-theme-chip-active' : ''}`}
                  onClick={() => updateAppearance({ theme: key })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="admin-wallpaper-actions">
              <label className="admin-btn admin-btn-primary admin-wallpaper-upload">
                Subir wallpaper
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    uploadWallpaper(file)
                    event.target.value = ''
                  }}
                />
              </label>
              {appearance.wallpaper ? (
                <button type="button" className="admin-btn" onClick={() => updateAppearance({ wallpaper: '' })}>
                  Quitar wallpaper
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <nav className="admin-tabs">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Catalogo completo <em>{products.length}</em>
        </button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>
          Categorias <em>{categories.length}</em>
        </button>
        <button className={tab === 'featured' ? 'active' : ''} onClick={() => setTab('featured')}>
          Destacados (home) <em>{products.filter((item) => item.featured === 1).length}</em>
        </button>
        <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>
          Revision <em>{reviewStats.flaggedProducts + reviewStats.pendingRaw}</em>
        </button>
        {me?.role === 'admin' ? (
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
            Usuarios <em>{users.length}</em>
          </button>
        ) : null}
        <button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>
          Mi cuenta
        </button>
      </nav>

      {toast ? <div className="admin-toast">{toast}</div> : null}

      {tab === 'products' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Productos del catalogo. Filtra, edita y guarda; los cambios se persisten directo en el servidor.</p>
            <div className="admin-section-actions">
              <button className="admin-btn admin-btn-ghost" onClick={syncFromServer} disabled={loading}>
                Recargar
              </button>
              <button className="admin-btn admin-btn-primary" onClick={addProduct}>+ Agregar producto</button>
              <button className="admin-btn admin-btn-primary" onClick={saveProducts} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          <div className="admin-howto">
            Quitar del catalogo oculta el articulo de la web sin borrar sus datos ni su historial.
            Puedes restaurarlo desde el filtro Inactivos.
          </div>

          {productConflicts.length ? (
            <div className="admin-conflict-panel" role="alert">
              <strong>No se guardó ningún cambio.</strong>
              <p>Otro administrador modificó estos productos. Tus valores locales siguen en pantalla.</p>
              {productConflicts.map((conflict) => (
                <div key={conflict.id}>
                  <code>{conflict.id}</code>
                  <span>
                    Local: {products.find((product) => product.id === conflict.id)?.name || 'sin fila local'}
                  </span>
                  <span>
                    Servidor: {conflict.current?.name || 'producto eliminado'} · versión {conflict.current?.version || '-'}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="admin-kpi-row">
            <div className="admin-kpi-card">
              <span>Total</span>
              <strong>{productStats.total}</strong>
            </div>
            <div className="admin-kpi-card">
              <span>Activos</span>
              <strong>{productStats.active}</strong>
            </div>
            <div className="admin-kpi-card">
              <span>A consultar</span>
              <strong>{productStats.consult}</strong>
            </div>
            <div className="admin-kpi-card">
              <span>En home</span>
              <strong>{productStats.featured}</strong>
            </div>
            <div className="admin-kpi-card admin-kpi-card-muted">
              <span>En vista</span>
              <strong>{filteredProducts.length}</strong>
            </div>
          </div>

          <div className="admin-filter-bar">
            <input
              className="admin-filter-search"
              type="search"
              placeholder="Buscar por nombre, marca, ID o categoria"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
            />
            <select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)}>
              <option value="all">Todas las categorias</option>
              {categories.map((category) => (
                <option key={category.key} value={category.key}>{category.name}</option>
              ))}
            </select>
            <select value={productStatusFilter} onChange={(event) => setProductStatusFilter(event.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="consult">A consultar</option>
            </select>
            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                setProductQuery('')
                setProductCategoryFilter('all')
                setProductStatusFilter('all')
              }}
            >
              Limpiar filtros
            </button>
          </div>

          {loading ? (
            <p className="admin-note">Cargando productos...</p>
          ) : filteredProducts.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Imagen</th><th>Nombre</th><th>Marca</th><th>Categoria</th><th>Unidad</th><th>Precio</th><th>Home</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const index = products.indexOf(product)
                    return (
                      <tr key={product.id || product._clientId} className={product.active === 0 ? 'admin-row-hidden' : ''}>
                        <td>
                          <ImageCell
                            item={product}
                            currentSrc={product._removeImage ? '' : product._pendingImagePreview || resolveImage(product.image_url || product.image)}
                            onUpload={(file) => stageProductImage(index, file)}
                            onRemove={() => toggleProductImageRemoval(index)}
                            disabled={!product.id}
                          />
                        </td>
                        <td><input value={product.name} onChange={(event) => updateProduct(index, { name: event.target.value })} /></td>
                        <td><input value={product.brand || ''} onChange={(event) => updateProduct(index, { brand: event.target.value })} placeholder="Sin marca" /></td>
                        <td>
                          <select value={product.category_key || product.category || ''} onChange={(event) => updateProduct(index, { category_key: event.target.value })}>
                            <option value="">-</option>
                            {categories.map((category) => <option key={category.key} value={category.key}>{category.name}</option>)}
                          </select>
                        </td>
                        <td><input className="admin-input-sm" value={product.unit || ''} onChange={(event) => updateProduct(index, { unit: event.target.value })} /></td>
                        <td>
                          <PriceField value={product.price} onChange={(value) => updateProduct(index, { price: value ?? 0 })} consultLabel="A consultar" />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`admin-toggle${product.featured === 1 ? ' admin-toggle-on' : ''}`}
                            onClick={() => updateProduct(index, { featured: product.featured === 1 ? 0 : 1 })}
                          >
                            {product.featured === 1 ? 'Visible' : 'Oculto'}
                          </button>
                        </td>
                        <td>
                          <span className={`admin-product-status${product.active !== 0 ? ' admin-product-status-active' : ''}`}>
                            {product.active === 0 ? 'Fuera del catalogo' : 'Publicado'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`admin-btn admin-btn-mini admin-product-catalog-action${product.active === 0 ? ' admin-btn-restore' : ' admin-btn-danger'}`}
                            onClick={() => {
                              if (!product.id) {
                                removeProduct(index)
                                return
                              }
                              if (product.active === 0) {
                                restoreProduct(index)
                                return
                              }
                              if (window.confirm(
                                `Quitar "${product.name}" del catalogo? Dejara de aparecer en la web, pero sus datos se conservaran.`,
                              )) {
                                removeProduct(index)
                              }
                            }}
                          >
                            {!product.id ? 'Descartar' : product.active === 0 ? 'Restaurar' : 'Quitar del catalogo'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Sin resultados" body="No hay productos que coincidan con los filtros actuales." />
          )}
        </section>
      ) : null}

      {tab === 'categories' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Nombres de categorias. La key no se edita para no romper productos existentes.</p>
            <div className="admin-section-actions">
              <button className="admin-btn admin-btn-ghost" onClick={syncFromServer} disabled={loading}>Recargar</button>
              <button className="admin-btn admin-btn-primary" onClick={addCategory}>+ Agregar categoria</button>
              <button className="admin-btn admin-btn-primary" onClick={saveCategories} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          <div className="admin-filter-bar">
            <input
              className="admin-filter-search"
              type="search"
              placeholder="Buscar categoria por key o nombre"
              value={categoryQuery}
              onChange={(event) => setCategoryQuery(event.target.value)}
            />
          </div>

          {filteredCategories.length ? (
            <div className="admin-cats-list">
              {filteredCategories.map((category) => {
                const index = categories.findIndex((item) => item.key === category.key)
                return (
                  <div className="admin-cat-row" key={category.key}>
                    <code>{category.key}</code>
                    <input value={category.name} onChange={(event) => updateCategory(index, { name: event.target.value })} />
                    <span className="admin-cat-count">
                      {products.filter((product) => (product.category_key || product.category) === category.key).length} productos
                    </span>
                    <button className="admin-btn admin-btn-mini admin-btn-ghost" onClick={() => removeCategory(index)}>X</button>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="Sin resultados" body="No hay categorias que coincidan con la busqueda actual." />
          )}
        </section>
      ) : null}

      {tab === 'featured' ? (
        <section className="admin-section">
          <div className="admin-howto">
            Los destacados ahora salen del catalogo real. Solo activas o desactivas que producto va al home.
          </div>

          <div className="admin-section-head">
            <p>Usa esta vista para decidir que productos del catalogo aparecen en portada y ajustar su imagen si hace falta.</p>
            <div className="admin-section-actions">
              <button className="admin-btn admin-btn-ghost" onClick={syncFromServer} disabled={loading}>
                Recargar
              </button>
              <button className="admin-btn admin-btn-primary" onClick={saveProducts} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          <div className="admin-kpi-row">
            <div className="admin-kpi-card">
              <span>Catalogo</span>
              <strong>{featuredStats.total}</strong>
            </div>
            <div className="admin-kpi-card">
              <span>Activos</span>
              <strong>{featuredStats.active}</strong>
            </div>
            <div className="admin-kpi-card">
              <span>En home</span>
              <strong>{featuredStats.featured}</strong>
            </div>
            <div className="admin-kpi-card admin-kpi-card-muted">
              <span>En vista</span>
              <strong>{filteredFeaturedItems.length}</strong>
            </div>
          </div>

          <div className="admin-filter-bar">
            <input
              className="admin-filter-search"
              type="search"
              placeholder="Buscar por nombre, marca, ID o categoria"
              value={featuredQuery}
              onChange={(event) => setFeaturedQuery(event.target.value)}
            />
            <select value={featuredCategoryFilter} onChange={(event) => setFeaturedCategoryFilter(event.target.value)}>
              <option value="all">Todas las categorias</option>
              {categories.map((category) => (
                <option key={category.key} value={category.key}>{category.name}</option>
              ))}
            </select>
            <select value={featuredStatusFilter} onChange={(event) => setFeaturedStatusFilter(event.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="featured">En home</option>
              <option value="not_featured">Fuera del home</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                setFeaturedQuery('')
                setFeaturedCategoryFilter('all')
                setFeaturedStatusFilter('all')
              }}
            >
              Limpiar filtros
            </button>
          </div>

          {loading ? (
            <p className="admin-note">Cargando destacados...</p>
          ) : sortedFeaturedItems.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Imagen</th><th>Producto</th><th>Marca</th><th>Categoria</th><th>Precio</th><th>Home</th><th>Orden</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFeaturedItems.map((item) => {
                    const index = products.indexOf(item)
                    const homePosition = item.featured === 1 && item.id
                      ? featuredHomeOrder.findIndex((entry) => entry.id === item.id)
                      : -1
                    return (
                      <tr key={item.id || index} className={item.active === 0 ? 'admin-row-hidden' : ''}>
                        <td>
                          <ImageCell
                            item={item}
                            currentSrc={item._removeImage ? '' : item._pendingImagePreview || resolveImage(item.image_url || item.image)}
                            onUpload={(file) => stageProductImage(index, file)}
                            onRemove={() => toggleProductImageRemoval(index)}
                            disabled={!item.id}
                          />
                        </td>
                        <td><input value={item.name} onChange={(event) => updateProduct(index, { name: event.target.value })} /></td>
                        <td><input value={item.brand || ''} onChange={(event) => updateProduct(index, { brand: event.target.value })} placeholder="Sin marca" /></td>
                        <td>
                          <select value={item.category_key || ''} onChange={(event) => updateProduct(index, { category_key: event.target.value })}>
                            <option value="">-</option>
                            {categories.map((category) => <option key={category.key} value={category.key}>{category.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <PriceField value={item.price} onChange={(value) => updateProduct(index, { price: value ?? 0 })} consultLabel="A consultar" />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`admin-toggle${item.featured === 1 ? ' admin-toggle-on' : ''}`}
                            onClick={() => updateProduct(index, { featured: item.featured === 1 ? 0 : 1 })}
                          >
                            {item.featured === 1 ? 'Visible' : 'Oculto'}
                          </button>
                        </td>
                        <td>
                          {homePosition >= 0 ? (
                            <div className="admin-order-controls">
                              <button
                                type="button"
                                className="admin-btn admin-btn-mini"
                                aria-label="Subir en el orden del home"
                                disabled={homePosition === 0}
                                onClick={() => moveFeaturedProduct(item, -1)}
                              >
                                &uarr;
                              </button>
                              <span className="admin-order-position">{homePosition + 1}</span>
                              <button
                                type="button"
                                className="admin-btn admin-btn-mini"
                                aria-label="Bajar en el orden del home"
                                disabled={homePosition === featuredHomeOrder.length - 1}
                                onClick={() => moveFeaturedProduct(item, 1)}
                              >
                                &darr;
                              </button>
                            </div>
                          ) : (
                            <span className="admin-order-position admin-order-position-off">-</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`admin-toggle${item.active !== 0 ? ' admin-toggle-on' : ''}`}
                            onClick={() => updateProduct(index, { active: item.active === 0 ? 1 : 0 })}
                          >
                            {item.active === 0 ? 'Inactivo' : 'Activo'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Sin resultados" body="No hay destacados que coincidan con los filtros actuales." />
          )}
        </section>
      ) : null}

      {tab === 'account' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Cambia tu contraseña sin afectar a otros usuarios. Al guardar se invalidan tus sesiones anteriores.</p>
          </div>
          <form className="admin-user-create admin-account-form" onSubmit={changeOwnPassword}>
            <strong>{me?.display_name ? `${me.display_name} (${me.username})` : me?.username}</strong>
            <div className="admin-user-create-grid">
              <label>
                Contraseña actual
                <input
                  type={showAccountPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                Nueva contraseña
                <input
                  type={showAccountPasswords ? 'text' : 'password'}
                  value={nextPassword}
                  onChange={(event) => setNextPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength="8"
                  required
                />
              </label>
            </div>
            <label className="admin-password-toggle">
              <input
                type="checkbox"
                checked={showAccountPasswords}
                onChange={(event) => setShowAccountPasswords(event.target.checked)}
              />
              Mostrar contraseñas
            </label>
            <button className="admin-btn admin-btn-primary" type="submit" disabled={saving}>
              {saving ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>
      ) : null}

      {tab === 'users' && me?.role === 'admin' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>
              Gestion de accesos al panel. Roles: <strong>admin</strong> (todo, incluida esta pantalla) y{' '}
              <strong>editor</strong> (opera el catalogo pero no gestiona usuarios).
            </p>
            <div className="admin-section-actions">
              <button className="admin-btn admin-btn-ghost" onClick={syncFromServer} disabled={loading || saving}>
                Recargar
              </button>
            </div>
          </div>

          <div className="admin-user-create">
            <div className="admin-user-create-grid">
              <label>
                Usuario
                <input
                  type="text"
                  value={newUserName}
                  onChange={(event) => setNewUserName(event.target.value)}
                  placeholder="ej: ventas (sin correo)"
                />
              </label>
              <label>
                Contraseña inicial
                <input
                  type={showNewUserPassword ? 'text' : 'password'}
                  value={newUserPassword}
                  onChange={(event) => setNewUserPassword(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  minLength="8"
                />
              </label>
              <label>
                Rol
                <select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value)}>
                  <option value="editor">editor</option>
                  <option value="admin">admin</option>
                </select>
              </label>
            </div>
            <label className="admin-password-toggle">
              <input
                type="checkbox"
                checked={showNewUserPassword}
                onChange={(event) => setShowNewUserPassword(event.target.checked)}
              />
              Mostrar contraseña
            </label>
            <button className="admin-btn admin-btn-primary" type="button" onClick={createUser} disabled={saving}>
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>

          {users.length ? (
            <div className="admin-users-list">
              {users.map((user) => (
                <article className="admin-user-card" key={user.id}>
                  <strong>
                    {user.display_name || user.username}
                    {me && user.id === me.id ? ' (vos)' : ''}
                  </strong>
                  {user.display_name ? <span className="admin-user-username">Usuario: {user.username}</span> : null}
                  <span className={user.email ? '' : 'admin-user-no-recovery'}>
                    {user.email ? `Recuperación: ${user.email}` : 'Sin email de recuperación'}
                  </span>
                  {user.phone ? <span>Tel: {user.phone}</span> : null}
                  <span className="admin-user-role">
                    Rol:{' '}
                    {me && user.id === me.id ? (
                      user.role
                    ) : (
                      <select value={user.role} onChange={(event) => changeUserRole(user, event.target.value)}>
                        <option value="admin">admin</option>
                        <option value="editor">editor</option>
                      </select>
                    )}
                  </span>
                  <span>Alta: {String(user.created_at || '').replace('T', ' ').slice(0, 16) || 'sin fecha'}</span>
                  <div className="admin-user-actions">
                    <button type="button" className="admin-btn admin-btn-mini" onClick={() => setEditingUser(user)}>
                      Editar datos
                    </button>
                    {me && user.id !== me.id ? (
                      <>
                        <button type="button" className="admin-btn admin-btn-mini" onClick={() => resetUserPassword(user)}>
                          Resetear contraseña
                        </button>
                        <button type="button" className="admin-btn admin-btn-mini admin-btn-ghost" onClick={() => deleteUser(user)}>
                          Eliminar
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin usuarios" body="Todavia no hay usuarios cargados en el sistema." />
          )}

          {editingUser ? (
            <UserProfileModal
              key={editingUser.id}
              user={editingUser}
              onClose={() => setEditingUser(null)}
              onSave={saveUserProfile}
              saving={saving}
            />
          ) : null}
        </section>
      ) : null}

      {tab === 'review' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Cola de revision automatica para nombres sucios, productos no disponibles y altas nuevas desde la base curada.</p>
            <div className="admin-section-actions">
              <button className="admin-btn admin-btn-ghost" onClick={syncFromServer} disabled={loading || saving}>
                Recargar
              </button>
            </div>
          </div>

          <div className="admin-kpi-row">
            <div className="admin-kpi-card">
              <span>Nombres a revisar</span>
              <strong>{reviewStats.flaggedProducts}</strong>
            </div>
            <div className="admin-kpi-card">
              <span>No disponible</span>
              <strong>{reviewStats.unavailableProducts}</strong>
            </div>
            <div className="admin-kpi-card">
              <span>SKUs pendientes</span>
              <strong>{reviewStats.pendingRaw}</strong>
            </div>
            <div className="admin-kpi-card admin-kpi-card-muted">
              <span>Sin categoria</span>
              <strong>{reviewStats.productsWithoutCategory}</strong>
            </div>
          </div>

          <div className="admin-filter-bar">
            <input
              className="admin-filter-search"
              type="search"
              placeholder="Buscar por nombre o codigo"
              value={reviewQuery}
              onChange={(event) => setReviewQuery(event.target.value)}
            />
          </div>

          <div className="admin-review-grid">
            <div className="admin-review-block">
              <h3>Productos con flags</h3>
              {reviewProducts.length ? (
                <div className="admin-review-list">
                  {reviewProducts.slice(0, 120).map((product) => (
                    <article className="admin-review-card" key={product.id}>
                      <strong>{product.quality.displayName}</strong>
                      <span>ID: {product.id}</span>
                      <span>Original: {product.name}</span>
                      <div className="admin-review-tags">
                        {product.quality.flags.map((flag) => <span key={flag}>{flag}</span>)}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sin observaciones" body="No hay productos marcados por las reglas actuales." />
              )}
            </div>

            <div className="admin-review-block">
              <h3>SKUs crudos pendientes</h3>
              <input
                className="admin-filter-search"
                type="search"
                placeholder="Buscar en la pileta por nombre, codigo o rubro..."
                value={rawSearch}
                onChange={(event) => setRawSearch(event.target.value)}
                autoComplete="off"
              />
              {rawSkus.length ? (
                <>
                  <p className="admin-review-hint">
                    Mostrando {Math.min(rawSkus.length, 80)} de {rawTotal}.
                    {rawTotal > rawSkus.length ? ' Afina con la búsqueda para ver otros resultados.' : ''}
                  </p>
                  <div className="admin-review-list">
                  {rawSkus.slice(0, 80).map((sku) => (
                    <article className="admin-review-card" key={sku.code}>
                      <strong>{sku.name}</strong>
                      <span>Codigo: {sku.code}</span>
                      <span>Rubro: {sku.rubro || 'Sin rubro'}</span>
                      <span>Categoria sugerida: {sku.suggested_category_key}</span>
                      <span>Costo interno: {sku.cost ? `$${Number(sku.cost).toLocaleString('es-AR')}` : 'sin dato'}</span>
                      {sku.quality_flags?.length ? (
                        <div className="admin-review-tags">
                          {sku.quality_flags.map((flag) => <span key={flag}>{flag}</span>)}
                        </div>
                      ) : null}
                      {sku.candidates?.length ? (
                        <div className="admin-sku-candidates">
                          <span>Posibles productos ya existentes:</span>
                          {sku.candidates.map((candidate) => (
                            <button
                              className="admin-btn admin-btn-mini"
                              type="button"
                              key={candidate.id}
                              onClick={() => linkRawSku(sku, candidate.id)}
                              disabled={saving}
                            >
                              Vincular a {candidate.name} ({candidate.score}%)
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <ManualSkuLinker
                        sku={sku}
                        products={products}
                        onLink={linkRawSku}
                        saving={saving}
                      />
                      <div className="admin-sku-actions">
                        <button className="admin-btn admin-btn-primary" type="button" onClick={() => promoteRawSku(sku)} disabled={saving}>
                          Promover al catalogo
                        </button>
                        <button className="admin-btn admin-btn-danger" type="button" onClick={() => dismissRawSku(sku)} disabled={saving}>
                          Descartar SKU
                        </button>
                      </div>
                      <small className="admin-sku-promote-warning">
                        Promover crea un producto nuevo. Si ya existe, vinculalo manualmente.
                      </small>
                    </article>
                  ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  title={rawSearch ? 'Sin resultados' : 'Sin pendientes'}
                  body={rawSearch ? `No se encontraron SKUs para "${rawSearch}".` : 'No hay SKUs crudos pendientes de promocion.'}
                />
              )}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="admin-foot">
        Catalogo, categorias y seleccion de destacados se guardan directo al servidor.
      </footer>
    </div>
  )
}
