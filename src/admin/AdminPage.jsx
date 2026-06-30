import { useEffect, useRef, useState } from 'react'
import { resolveImage } from '../lib/catalog'
import { api } from './api'
import { extensionFromDataUrl, imagePath, slugify } from './catalogStore'
import './AdminPage.css'

const EMPTY_FEATURED = {
  title: '',
  subtitle: '',
  match: '',
  category_key: '',
  price_override: null,
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

/* ------------------------------ Login ------------------------------ */

function LoginView({ onSuccess }) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
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
        <h1>Panel de administración</h1>
        <p className="admin-login-sub">Corralón Los Eucaliptus</p>
        <label>
          Usuario
          <input type="text" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error ? <p className="admin-login-error">{error}</p> : null}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
          {busy ? 'Verificando…' : 'Ingresar'}
        </button>
        <a className="admin-login-back" href="#">← Volver al sitio</a>
      </form>
    </div>
  )
}

/* ----------------------------- Editor ------------------------------ */

function PriceField({ value, onChange, consultLabel = 'Consultar' }) {
  const isConsult = !value || Number(value) <= 0
  return (
    <div className="admin-price-field">
      <input
        type="number" min="0" step="1"
        value={isConsult ? '' : value}
        placeholder={consultLabel}
        onChange={(e) => { const v = e.target.value; onChange(v === '' ? null : Number(v)) }}
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
          <button type="button" className="admin-btn admin-btn-mini admin-btn-ghost" onClick={onRemove}>Quitar</button>
        ) : null}
        <input
          ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden
          onChange={async (e) => { const file = e.target.files?.[0]; if (file) onUpload(await readFileAsDataUrl(file)); e.target.value = '' }}
        />
      </div>
      {item.image ? <code className="admin-image-path">{item.image}</code> : null}
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => api.isAuthed())
  const [tab, setTab] = useState('products')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [featuredItems, setFeaturedItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const flash = (msg) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 4000)
  }

  /* -------- sync desde el servidor -------- */

  const syncFromServer = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes, featRes] = await Promise.all([
        api.getProducts({ all: '1' }),
        api.getCategories(),
        api.getFeatured(),
      ])
      setProducts(prodRes.products)
      setCategories(catRes.categories)
      setFeaturedItems(featRes.featured)
    } catch (err) {
      flash(`Error al cargar datos: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authed) return
    let cancelled = false
    Promise.all([api.getProducts({ all: '1' }), api.getCategories(), api.getFeatured()])
      .then(([prodRes, catRes, featRes]) => {
        if (!cancelled) {
          setProducts(prodRes.products)
          setCategories(catRes.categories)
          setFeaturedItems(featRes.featured)
          setLoading(false)
        }
      })
      .catch((err) => { if (!cancelled) { flash(`Error al cargar datos: ${err.message}`); setLoading(false) } })
    return () => { cancelled = true }
  }, [authed])

  /* -------- helpers de featured (local state) -------- */

  const updateFeaturedItem = (index, patch) =>
    setFeaturedItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))

  const removeFeaturedItem = (index) =>
    setFeaturedItems((prev) => prev.filter((_, i) => i !== index))

  const addFeaturedItem = () => {
    const key = categories[0]?.key || ''
    setFeaturedItems((prev) => [{ ...EMPTY_FEATURED, id: `nuevo-${Date.now()}`, category_key: key }, ...prev])
  }

  const uploadFeaturedImage = async (index, dataUrl) => {
    const item = featuredItems[index]
    const ext = extensionFromDataUrl(dataUrl)
    const base = item.id?.replace(/^nuevo-/, '') || slugify(item.title) || `destacado-${index}`
    const fileName = `${base}.${ext}`
    try {
      await api.uploadImage(fileName, dataUrl)
      updateFeaturedItem(index, { image_url: `product-images/${fileName}`, _preview: dataUrl })
      flash(`Imagen subida: ${fileName}`)
    } catch (err) {
      flash(`Error al subir imagen: ${err.message}`)
    }
  }

  const removeFeaturedImage = (index) => {
    updateFeaturedItem(index, { image_url: '', _preview: undefined })
  }

  const saveFeaturedItems = async () => {
    setSaving(true)
    let ok = 0; let fail = 0
    for (const f of featuredItems) {
      try {
        const body = {
          title: f.title,
          subtitle: f.subtitle || '',
          match: f.match || '',
          category_key: f.category_key || '',
          price_override: f.price_override ?? null,
          image_url: f.image_url || '',
          active: f.active ?? 1,
        }
        const exists = f.id && !f.id.startsWith('nuevo-')
        if (exists) {
          await api.updateFeatured(f.id, body)
        } else {
          const id = f.id || `featured-${Date.now()}`
          await api.createFeatured({ ...body, id })
        }
        ok++
      } catch (err) {
        fail++
        console.error(`Error guardando destacado ${f.id || f.title}:`, err)
      }
    }
    setSaving(false)
    flash(`${ok} destacado(s) guardado(s)${fail ? `, ${fail} error(es)` : ''}`)
    if (ok) syncFromServer()
  }

  /* -------- helpers de productos (local state) -------- */

  const updateProduct = (index, patch) =>
    setProducts((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))

  const removeProduct = (index) =>
    setProducts((prev) => prev.filter((_, i) => i !== index))

  const addProduct = () => {
    const key = categories[0]?.key || ''
    setProducts((prev) => [{ ...EMPTY_PRODUCT, category_key: key, id: `nuevo-${Date.now()}` }, ...prev])
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

  /* -------- helpers de categorías (local state) -------- */

  const updateCategory = (index, patch) =>
    setCategories((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))

  const removeCategory = async (index) => {
    const cat = categories[index]
    if (!cat) return
    try {
      await api.deleteCategory(cat.key)
      setCategories((prev) => prev.filter((_, i) => i !== index))
      flash(`Categoría "${cat.name}" eliminada`)
    } catch (err) {
      flash(`Error: ${err.message}`)
    }
  }

  const addCategory = () => {
    const key = prompt('Key (ej: nuevos-materiales):')
    if (!key) return
    const name = prompt('Nombre visible:')
    if (!name) return
    api.createCategory({ key, name }).then((res) => {
      setCategories((prev) => [...prev, res.category])
      flash(`Categoría "${name}" creada`)
    }).catch((err) => flash(`Error: ${err.message}`))
  }

  /* -------- guardar al servidor -------- */

  const saveProducts = async () => {
    setSaving(true)
    let ok = 0; let fail = 0
    for (const p of products) {
      try {
        const body = {
          name: p.name,
          category: p.category_key,
          brand: p.brand || '',
          unit: p.unit || '',
          price: p.price ?? 0,
          active: p.active ?? 1,
        }
        const exists = p.id && (p.id.startsWith('nuevo-') ? false : true)
        if (exists) {
          await api.updateProduct(p.id, body)
        } else {
          body.id = p.id || slugify(p.name) || `prod-${Date.now()}`
          await api.createProduct(body)
        }
        ok++
      } catch (err) {
        fail++
        console.error(`Error guardando ${p.id || p.name}:`, err)
      }
    }
    setSaving(false)
    flash(`${ok} producto(s) guardado(s)${fail ? `, ${fail} error(es)` : ''}`)
    if (ok) syncFromServer()
  }

  const saveCategories = async () => {
    setSaving(true)
    let ok = 0; let fail = 0
    for (const c of categories) {
      try {
        await api.updateCategory(c.key, { name: c.name })
        ok++
      } catch (err) {
        fail++
        console.error(`Error guardando categoría ${c.key}:`, err)
      }
    }
    setSaving(false)
    flash(`${ok} categoría(s) guardada(s)${fail ? `, ${fail} error(es)` : ''}`)
  }

  /* -------- logout -------- */

  const logout = () => { api.logout(); setAuthed(false) }

  if (!authed) return <LoginView onSuccess={() => { setAuthed(true); syncFromServer() }} />

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <strong>Panel · Los Eucaliptus</strong>
          {loading ? <span className="admin-badge-changes">Cargando…</span> : null}
        </div>
        <div className="admin-topbar-actions">
          <a className="admin-btn admin-btn-ghost" href="#">Ver sitio</a>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={logout}>Salir</button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Catálogo completo <em>{products.length}</em>
        </button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>
          Categorías <em>{categories.length}</em>
        </button>
        <button className={tab === 'featured' ? 'active' : ''} onClick={() => setTab('featured')}>
          Destacados (home) <em>{featuredItems.length}</em>
        </button>
      </nav>

      {toast ? <div className="admin-toast">{toast}</div> : null}

      {/* -------------------- CATALOGO COMPLETO (API) -------------------- */}
      {tab === 'products' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Productos del catálogo. Editá y guardá — los cambios se persisten en el servidor.</p>
            <div className="admin-section-actions">
              <button className="admin-btn admin-btn-ghost" onClick={syncFromServer} disabled={loading}>
                ↻ Recargar
              </button>
              <button className="admin-btn admin-btn-primary" onClick={addProduct}>+ Agregar producto</button>
              <button className="admin-btn admin-btn-primary" onClick={saveProducts} disabled={saving}>
                {saving ? 'Guardando…' : '💾 Guardar cambios'}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="admin-note">Cargando productos…</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Imagen</th><th>Nombre</th><th>Marca</th><th>Categoría</th><th>Unidad</th><th>Precio</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, index) => (
                    <tr key={p.id || index} className={p.active === 0 ? 'admin-row-hidden' : ''}>
                      <td>
                        <ImageCell
                          item={p}
                          currentSrc={p._preview || resolveImage(p.image_url || p.image)}
                          onUpload={(dataUrl) => uploadProductImage(index, dataUrl)}
                          onRemove={() => removeProductImage(index)}
                        />
                      </td>
                      <td><input value={p.name} onChange={(e) => updateProduct(index, { name: e.target.value })} /></td>
                      <td><input value={p.brand || ''} onChange={(e) => updateProduct(index, { brand: e.target.value })} placeholder="Sin marca" /></td>
                      <td>
                        <select value={p.category_key || p.category || ''} onChange={(e) => updateProduct(index, { category_key: e.target.value })}>
                          <option value="">—</option>
                          {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                        </select>
                      </td>
                      <td><input className="admin-input-sm" value={p.unit || ''} onChange={(e) => updateProduct(index, { unit: e.target.value })} /></td>
                      <td>
                        <PriceField value={p.price} onChange={(v) => updateProduct(index, { price: v ?? 0 })} consultLabel="A consultar" />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`admin-toggle${p.active !== 0 ? ' admin-toggle-on' : ''}`}
                          onClick={() => updateProduct(index, { active: p.active === 0 ? 1 : 0 })}
                        >
                          {p.active === 0 ? 'Inactivo' : 'Activo'}
                        </button>
                      </td>
                      <td>
                        <button className="admin-card-delete" onClick={() => {
                          if (window.confirm(`¿Desactivar "${p.name}"?`)) removeProduct(index)
                        }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {/* -------------------- CATEGORIAS (API) -------------------- */}
      {tab === 'categories' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Nombres de categorías. La key no se edita para no romper productos existentes.</p>
            <div className="admin-section-actions">
              <button className="admin-btn admin-btn-ghost" onClick={syncFromServer} disabled={loading}>↻ Recargar</button>
              <button className="admin-btn admin-btn-primary" onClick={addCategory}>+ Agregar categoría</button>
              <button className="admin-btn admin-btn-primary" onClick={saveCategories} disabled={saving}>
                {saving ? 'Guardando…' : '💾 Guardar cambios'}
              </button>
            </div>
          </div>
          <div className="admin-cats-list">
            {categories.map((c, index) => (
              <div className="admin-cat-row" key={c.key}>
                <code>{c.key}</code>
                <input value={c.name} onChange={(e) => updateCategory(index, { name: e.target.value })} />
                <span className="admin-cat-count">
                  {products.filter((p) => (p.category_key || p.category) === c.key).length} productos
                </span>
                <button className="admin-btn admin-btn-mini admin-btn-ghost" onClick={() => removeCategory(index)}>🗑</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* -------------------- DESTACADOS (API) -------------------- */}
      {tab === 'featured' ? (
        <section className="admin-section">
          <div className="admin-howto">
            Los destacados son los productos que aparecen en la portada con imagen.
            Se editan y <strong>se guardan directo al servidor</strong> (ya no requieren export/commit).
          </div>

          <div className="admin-section-head">
            <p>Productos con imagen que aparecen en la portada. El precio puede sobrescribir al del catálogo.</p>
            <div className="admin-section-actions">
              <button className="admin-btn admin-btn-ghost" onClick={syncFromServer} disabled={loading}>
                ↻ Recargar
              </button>
              <button className="admin-btn admin-btn-primary" onClick={addFeaturedItem}>+ Agregar destacado</button>
              <button className="admin-btn admin-btn-primary" onClick={saveFeaturedItems} disabled={saving}>
                {saving ? 'Guardando…' : '💾 Guardar cambios'}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="admin-note">Cargando destacados…</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Imagen</th><th>Título</th><th>Subtítulo</th><th>Match</th><th>Categoría</th><th>Precio</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {featuredItems.map((f, index) => (
                    <tr key={f.id || index} className={f.active === 0 ? 'admin-row-hidden' : ''}>
                      <td>
                        <ImageCell
                          item={f}
                          currentSrc={f._preview || resolveImage(f.image_url)}
                          onUpload={(dataUrl) => uploadFeaturedImage(index, dataUrl)}
                          onRemove={() => removeFeaturedImage(index)}
                        />
                      </td>
                      <td><input value={f.title} onChange={(e) => updateFeaturedItem(index, { title: e.target.value })} /></td>
                      <td><input value={f.subtitle || ''} onChange={(e) => updateFeaturedItem(index, { subtitle: e.target.value })} placeholder="Sin marca" /></td>
                      <td><input value={f.match || ''} onChange={(e) => updateFeaturedItem(index, { match: e.target.value })} placeholder="Ej: HIERRO 8" /></td>
                      <td>
                        <select value={f.category_key || ''} onChange={(e) => updateFeaturedItem(index, { category_key: e.target.value })}>
                          <option value="">—</option>
                          {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <PriceField value={f.price_override} onChange={(v) => updateFeaturedItem(index, { price_override: v })} consultLabel="Usar catálogo" />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`admin-toggle${f.active !== 0 ? ' admin-toggle-on' : ''}`}
                          onClick={() => updateFeaturedItem(index, { active: f.active === 0 ? 1 : 0 })}
                        >
                          {f.active === 0 ? 'Inactivo' : 'Activo'}
                        </button>
                      </td>
                      <td>
                        <button className="admin-card-delete" onClick={() => {
                          if (window.confirm(`¿Desactivar "${f.title}"?`)) removeFeaturedItem(index)
                        }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <footer className="admin-foot">
        Catálogo, categorías y destacados se guardan directo al servidor.
      </footer>
    </div>
  )
}
