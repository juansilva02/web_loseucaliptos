import { useEffect, useRef, useState } from 'react'
import { resolveImage } from '../lib/catalog'
import { getCatalogQualitySummary } from '../lib/catalog-quality'
import { api } from './api'
import { extensionFromDataUrl, imagePath, slugify } from './catalogStore'
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

function ImageCell({ item, currentSrc, onUpload, onRemove }) {
  const inputRef = useRef(null)

  return (
    <div className="admin-image-cell">
      <div className="admin-image-preview">
        {currentSrc ? <img src={currentSrc} alt="" /> : <span className="admin-image-empty">Sin imagen</span>}
      </div>
      <div className="admin-image-actions">
        <button type="button" className="admin-btn admin-btn-mini" onClick={() => inputRef.current?.click()}>
          {currentSrc ? 'Cambiar' : 'Subir'}
        </button>
        {currentSrc ? (
          <button type="button" className="admin-btn admin-btn-mini admin-btn-ghost" onClick={onRemove}>
            Quitar
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (file) onUpload(await readFileAsDataUrl(file))
            event.target.value = ''
          }}
        />
      </div>
      {item.image ? <code className="admin-image-path">{item.image}</code> : null}
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
  const [users, setUsers] = useState([])
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const toastTimer = useRef(null)

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [rawSkus, setRawSkus] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [appearance, setAppearance] = useState(() => loadAdminAppearance())

  const flash = (message) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 4000)
  }

  useEffect(() => {
    window.localStorage.setItem(ADMIN_APPEARANCE_KEY, JSON.stringify(appearance))
  }, [appearance])

  const syncFromServer = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes, usersRes] = await Promise.all([
        api.getProducts({ all: '1' }),
        api.getCategories(),
        api.getUsers(),
      ])
      const rawRes = await api.getRawSkus({ added: '0' })
      setProducts(prodRes.products)
      setCategories(catRes.categories)
      setUsers(usersRes.users || [])
      setRawSkus(rawRes.skus || [])
    } catch (err) {
      flash(`Error al cargar datos: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authed) return
    let cancelled = false
    Promise.all([api.getProducts({ all: '1' }), api.getCategories(), api.getUsers(), api.getRawSkus({ added: '0' })])
      .then(([prodRes, catRes, usersRes, rawRes]) => {
        if (!cancelled) {
          setProducts(prodRes.products)
          setCategories(catRes.categories)
          setUsers(usersRes.users || [])
          setRawSkus(rawRes.skus || [])
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

  const updateProduct = (index, patch) =>
    setProducts((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))

  const removeProduct = (index) =>
    setProducts((prev) => prev.filter((_, itemIndex) => itemIndex !== index))

  const addProduct = () => {
    const key = categories[0]?.key || ''
    setProducts((prev) => [{ ...EMPTY_PRODUCT, category_key: key, id: `nuevo-${prev.length + 1}` }, ...prev])
  }

  const uploadProductImage = async (index, dataUrl) => {
    const item = products[index]
    const ext = extensionFromDataUrl(dataUrl)
    const base = item.id || slugify(item.name) || `producto-${index}`
    const fileName = `${base}.${ext}`
    try {
      await api.uploadImage(fileName, dataUrl)
      updateProduct(index, { image_url: imagePath(fileName), _preview: dataUrl })
      flash(`Imagen subida: ${fileName}`)
    } catch (err) {
      flash(`Error al subir imagen: ${err.message}`)
    }
  }

  const removeProductImage = (index) => {
    updateProduct(index, { image_url: '', _preview: undefined })
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
    let ok = 0
    let fail = 0
    for (const [index, product] of products.entries()) {
      try {
        const body = {
          name: product.name,
          category: product.category_key,
          brand: product.brand || '',
          unit: product.unit || '',
          price: product.price ?? 0,
          image_url: product.image_url || '',
          featured: product.featured ? 1 : 0,
          active: product.active ?? 1,
        }
        const exists = product.id && !product.id.startsWith('nuevo-')
        if (exists) {
          await api.updateProduct(product.id, body)
        } else {
          body.id = product.id || slugify(product.name) || `prod-${index + 1}`
          await api.createProduct(body)
        }
        ok++
      } catch (err) {
        fail++
        console.error(`Error guardando ${product.id || product.name}:`, err)
      }
    }
    setSaving(false)
    flash(`${ok} producto(s) guardado(s)${fail ? `, ${fail} error(es)` : ''}`)
    if (ok) syncFromServer()
  }

  const saveCategories = async () => {
    setSaving(true)
    let ok = 0
    let fail = 0
    for (const category of categories) {
      try {
        await api.updateCategory(category.key, { name: category.name })
        ok++
      } catch (err) {
        fail++
        console.error(`Error guardando categoria ${category.key}:`, err)
      }
    }
    setSaving(false)
    flash(`${ok} categoria(s) guardada(s)${fail ? `, ${fail} error(es)` : ''}`)
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
    pendingRaw: rawSkus.length,
    productsWithoutCategory: products.filter((product) => !(product.category_key || product.category)).length,
  }

  const promoteRawSku = async (sku) => {
    setSaving(true)
    try {
      await api.promoteSku(sku.code, { category_key: sku.suggested_category_key })
      flash(`SKU ${sku.code} promovido con categoria sugerida`)
      syncFromServer()
    } catch (err) {
      flash(`Error al promover SKU ${sku.code}: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const logout = () => {
    api.logout()
    setAuthed(false)
  }

  const createUser = async () => {
    const email = newUserEmail.trim()
    const password = newUserPassword
    if (!email || !password) {
      flash('Email y contraseña requeridos')
      return
    }

    setSaving(true)
    try {
      const response = await api.createUser({ email, password, role: 'admin' })
      setUsers((current) => [response.user, ...current])
      setNewUserEmail('')
      setNewUserPassword('')
      flash(`Usuario creado: ${response.user.email}`)
    } catch (err) {
      flash(`Error al crear usuario: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const updateAppearance = (patch) => {
    setAppearance((current) => ({ ...current, ...patch }))
  }

  const uploadWallpaper = async (file) => {
    if (!file) return
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
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
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
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Usuarios <em>{users.length}</em>
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
                    <th>Imagen</th><th>Nombre</th><th>Marca</th><th>Categoria</th><th>Unidad</th><th>Precio</th><th>Home</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const index = products.findIndex((item) => item.id === product.id)
                    return (
                      <tr key={product.id || index} className={product.active === 0 ? 'admin-row-hidden' : ''}>
                        <td>
                          <ImageCell
                            item={product}
                            currentSrc={product._preview || resolveImage(product.image_url || product.image)}
                            onUpload={(dataUrl) => uploadProductImage(index, dataUrl)}
                            onRemove={() => removeProductImage(index)}
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
                          <button
                            type="button"
                            className={`admin-toggle${product.active !== 0 ? ' admin-toggle-on' : ''}`}
                            onClick={() => updateProduct(index, { active: product.active === 0 ? 1 : 0 })}
                          >
                            {product.active === 0 ? 'Inactivo' : 'Activo'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="admin-card-delete"
                            onClick={() => {
                              if (window.confirm(`Desactivar "${product.name}"?`)) removeProduct(index)
                            }}
                          >
                            X
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
          ) : filteredFeaturedItems.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Imagen</th><th>Producto</th><th>Marca</th><th>Categoria</th><th>Precio</th><th>Home</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeaturedItems.map((item) => {
                    const index = products.findIndex((entry) => entry.id === item.id)
                    return (
                      <tr key={item.id || index} className={item.active === 0 ? 'admin-row-hidden' : ''}>
                        <td>
                          <ImageCell
                            item={item}
                            currentSrc={item._preview || resolveImage(item.image_url || item.image)}
                            onUpload={(dataUrl) => uploadProductImage(index, dataUrl)}
                            onRemove={() => removeProductImage(index)}
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

      {tab === 'users' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Crea accesos nuevos para administrativos. Se generan como usuarios admin y pueden entrar al panel con email y contraseña.</p>
            <div className="admin-section-actions">
              <button className="admin-btn admin-btn-ghost" onClick={syncFromServer} disabled={loading || saving}>
                Recargar
              </button>
            </div>
          </div>

          <div className="admin-user-create">
            <div className="admin-user-create-grid">
              <label>
                Email / usuario
                <input
                  type="text"
                  value={newUserEmail}
                  onChange={(event) => setNewUserEmail(event.target.value)}
                  placeholder="ej: ventas.solano"
                />
              </label>
              <label>
                Contraseña inicial
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(event) => setNewUserPassword(event.target.value)}
                  placeholder="Minimo 6 caracteres"
                />
              </label>
            </div>
            <button className="admin-btn admin-btn-primary" type="button" onClick={createUser} disabled={saving}>
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>

          {users.length ? (
            <div className="admin-users-list">
              {users.map((user) => (
                <article className="admin-user-card" key={user.id}>
                  <strong>{user.email}</strong>
                  <span>Rol: {user.role}</span>
                  <span>Alta: {String(user.created_at || '').replace('T', ' ').slice(0, 16) || 'sin fecha'}</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin usuarios" body="Todavia no hay usuarios cargados en el sistema." />
          )}
        </section>
      ) : null}

      {tab === 'review' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Cola de revision automatica para nombres sucios, productos no disponibles y altas nuevas desde el Excel.</p>
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
              {rawSkus.length ? (
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
                      <button className="admin-btn admin-btn-primary" type="button" onClick={() => promoteRawSku(sku)} disabled={saving}>
                        Promover al catalogo
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sin pendientes" body="No hay SKUs crudos pendientes de promocion." />
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
