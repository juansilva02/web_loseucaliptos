import { useMemo, useRef, useState } from 'react'
import { resolveImage } from '../lib/catalog'
import { SESSION_KEY, validateCredentials } from './adminConfig'
import {
  createDraft,
  loadDraft,
  saveDraft,
  clearDraft,
  loadBaseCatalog,
  makeProductId,
  slugify,
  extensionFromDataUrl,
  imagePath,
  exportCatalogJson,
  exportImages,
} from './catalogStore'
import './AdminPage.css'

const EMPTY_FEATURED = {
  title: 'Nuevo destacado',
  subtitle: 'Sin marca',
  match: '',
  categoryKey: '',
  priceOverride: null,
}

const EMPTY_PRODUCT = {
  id: '',
  name: 'Nuevo producto',
  category: '',
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
    const ok = await validateCredentials(user.trim(), password)
    setBusy(false)
    if (ok) {
      try {
        window.sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* ignore */
      }
      onSuccess()
    } else {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <h1>Panel de administración</h1>
        <p className="admin-login-sub">Corralón Los Eucaliptus</p>
        <label>
          Usuario
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="admin-login-error">{error}</p> : null}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
          {busy ? 'Verificando…' : 'Ingresar'}
        </button>
        <a className="admin-login-back" href="#">
          ← Volver al sitio
        </a>
      </form>
    </div>
  )
}

/* ----------------------------- Editor ------------------------------ */

function PriceField({ value, onChange, consultLabel = 'Consultar' }) {
  // value 0/null/undefined => "Consultar"
  const isConsult = !value || Number(value) <= 0
  return (
    <div className="admin-price-field">
      <input
        type="number"
        min="0"
        step="1"
        value={isConsult ? '' : value}
        placeholder={consultLabel}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? null : Number(v))
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
        {currentSrc ? (
          <img src={currentSrc} alt="" />
        ) : (
          <span className="admin-image-empty">Sin imagen</span>
        )}
      </div>
      <div className="admin-image-actions">
        <button
          type="button"
          className="admin-btn admin-btn-mini"
          onClick={() => inputRef.current?.click()}
        >
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
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(await readFileAsDataUrl(file))
            e.target.value = ''
          }}
        />
      </div>
      {item.image ? <code className="admin-image-path">{item.image}</code> : null}
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      return false
    }
  })
  const [draft, setDraft] = useState(() => loadDraft() || createDraft())
  const [tab, setTab] = useState('featured')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const catalog = draft.catalog
  const categories = catalog.categories || []

  const hasChanges = useMemo(
    () => JSON.stringify(catalog) !== JSON.stringify(loadBaseCatalog()),
    [catalog],
  )

  const pendingImageCount = Object.keys(draft.pendingImages || {}).length

  const flash = (msg) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 4000)
  }

  /* -------- helpers de mutacion -------- */

  const updateCatalog = (mutator) => {
    const next = {
      ...draft,
      catalog: { ...draft.catalog },
      pendingImages: { ...draft.pendingImages },
    }
    mutator(next)
    setDraft(next)
    // Persistimos el borrador en el navegador en cada cambio (sobrevive recargas).
    if (!saveDraft(next)) {
      flash('⚠️ El borrador es muy grande para guardarse completo. Exportá pronto.')
    }
  }

  const updateFeatured = (index, patch) =>
    updateCatalog((d) => {
      d.catalog.featured = d.catalog.featured.map((it, i) => (i === index ? { ...it, ...patch } : it))
    })

  const updateProduct = (index, patch) =>
    updateCatalog((d) => {
      d.catalog.products = d.catalog.products.map((it, i) => (i === index ? { ...it, ...patch } : it))
    })

  const removeFeatured = (index) =>
    updateCatalog((d) => {
      d.catalog.featured = d.catalog.featured.filter((_, i) => i !== index)
    })

  const removeProduct = (index) =>
    updateCatalog((d) => {
      d.catalog.products = d.catalog.products.filter((_, i) => i !== index)
    })

  const addFeatured = () =>
    updateCatalog((d) => {
      d.catalog.featured = [
        { ...EMPTY_FEATURED, categoryKey: d.catalog.categories?.[0]?.key || '' },
        ...d.catalog.featured,
      ]
    })

  const addProduct = () =>
    updateCatalog((d) => {
      const ids = new Set(d.catalog.products.map((p) => p.id))
      const id = makeProductId('nuevo producto', ids)
      d.catalog.products = [
        { ...EMPTY_PRODUCT, id, category: d.catalog.categories?.[0]?.key || '' },
        ...d.catalog.products,
      ]
    })

  // Subir imagen para destacado/producto.
  const uploadImage = (kind, index, dataUrl) =>
    updateCatalog((d) => {
      const key = kind === 'featured' ? 'featured' : 'products'
      const item = d.catalog[key][index]
      const ext = extensionFromDataUrl(dataUrl)
      const base =
        kind === 'featured'
          ? slugify(item.match || item.title) || `destacado-${index}`
          : item.id || slugify(item.name) || `producto-${index}`
      const fileName = `${base}.${ext}`
      d.catalog[key] = d.catalog[key].map((it, i) =>
        i === index ? { ...it, image: imagePath(fileName), _preview: dataUrl } : it,
      )
      d.pendingImages[fileName] = dataUrl
    })

  const removeImage = (kind, index) =>
    updateCatalog((d) => {
      const key = kind === 'featured' ? 'featured' : 'products'
      const item = d.catalog[key][index]
      if (item.image) delete d.pendingImages[item.image.split('/').pop()]
      d.catalog[key] = d.catalog[key].map((it, i) => {
        if (i !== index) return it
        const copy = { ...it }
        delete copy.image
        delete copy._preview
        return copy
      })
    })

  /* -------- acciones globales -------- */

  const handleExport = () => {
    exportCatalogJson(catalog)
    const names = exportImages(draft.pendingImages)
    flash(
      names.length
        ? `Exportado: featured-catalog.json + ${names.length} imagen(es).`
        : 'Exportado: featured-catalog.json',
    )
  }

  const handleDiscard = () => {
    if (!window.confirm('¿Descartar todos los cambios del borrador y volver a lo publicado?')) return
    clearDraft()
    setDraft(createDraft())
    flash('Borrador descartado. Se volvió a lo publicado.')
  }

  const logout = () => {
    try {
      window.sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    setAuthed(false)
  }

  if (!authed) return <LoginView onSuccess={() => setAuthed(true)} />

  const categoryName = (key) => categories.find((c) => c.key === key)?.name || key

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <strong>Panel · Los Eucaliptus</strong>
          {hasChanges ? <span className="admin-badge-changes">Cambios sin exportar</span> : <span className="admin-badge-clean">Sin cambios</span>}
        </div>
        <div className="admin-topbar-actions">
          <a className="admin-btn admin-btn-ghost" href="#">Ver sitio</a>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={handleDiscard}>
            Descartar
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleExport}>
            Exportar cambios{pendingImageCount ? ` (+${pendingImageCount} img)` : ''}
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <div className="admin-howto">
        <strong>¿Cómo se publican los cambios?</strong> Editá acá, tocá <em>Exportar cambios</em>, y vas a
        descargar <code>featured-catalog.json</code> (y las imágenes nuevas). Reemplazá{' '}
        <code>src/data/featured-catalog.json</code>, copiá las imágenes a{' '}
        <code>public/product-images/</code>, hacé <code>commit</code> y <code>push</code>: Vercel redeploya y
        los clientes ven los nuevos precios e imágenes.
      </div>

      <nav className="admin-tabs">
        <button className={tab === 'featured' ? 'active' : ''} onClick={() => setTab('featured')}>
          Destacados (home) <em>{catalog.featured?.length || 0}</em>
        </button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Catálogo completo <em>{catalog.products?.length || 0}</em>
        </button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>
          Categorías <em>{categories.length}</em>
        </button>
      </nav>

      {toast ? <div className="admin-toast">{toast}</div> : null}

      {/* -------------------- DESTACADOS -------------------- */}
      {tab === 'featured' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Productos con imagen que aparecen en la portada. El precio puede sobrescribir al del catálogo.</p>
            <button className="admin-btn admin-btn-primary" onClick={addFeatured}>+ Agregar destacado</button>
          </div>
          <div className="admin-cards">
            {catalog.featured?.map((item, index) => (
              <article className="admin-card" key={`${item.match}-${index}`}>
                <ImageCell
                  item={item}
                  currentSrc={item._preview || resolveImage(item.image)}
                  onUpload={(dataUrl) => uploadImage('featured', index, dataUrl)}
                  onRemove={() => removeImage('featured', index)}
                />
                <div className="admin-card-fields">
                  <label>Título
                    <input value={item.title} onChange={(e) => updateFeatured(index, { title: e.target.value })} />
                  </label>
                  <label>Subtítulo / marca
                    <input value={item.subtitle} onChange={(e) => updateFeatured(index, { subtitle: e.target.value })} />
                  </label>
                  <label>Texto de match (en catálogo)
                    <input value={item.match} onChange={(e) => updateFeatured(index, { match: e.target.value })} placeholder="Ej: HIERRO 8" />
                  </label>
                  <label>Categoría
                    <select value={item.categoryKey} onChange={(e) => updateFeatured(index, { categoryKey: e.target.value })}>
                      <option value="">—</option>
                      {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                    </select>
                  </label>
                  <label>Precio
                    <PriceField value={item.priceOverride} onChange={(v) => updateFeatured(index, { priceOverride: v })} />
                  </label>
                </div>
                <button className="admin-card-delete" title="Eliminar" onClick={() => removeFeatured(index)}>🗑 Eliminar</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* -------------------- CATALOGO -------------------- */}
      {tab === 'products' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Todos los productos del catálogo. Precio en 0 (vacío) se muestra como “A consultar”. “Ocultar” lo saca del sitio sin borrarlo.</p>
            <button className="admin-btn admin-btn-primary" onClick={addProduct}>+ Agregar producto</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Imagen</th><th>Nombre</th><th>Marca</th><th>Categoría</th><th>Unidad</th><th>Precio</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {catalog.products?.map((p, index) => (
                  <tr key={p.id || index} className={p.hidden ? 'admin-row-hidden' : ''}>
                    <td>
                      <ImageCell
                        item={p}
                        currentSrc={p._preview || resolveImage(p.image)}
                        onUpload={(dataUrl) => uploadImage('products', index, dataUrl)}
                        onRemove={() => removeImage('products', index)}
                      />
                    </td>
                    <td><input value={p.name} onChange={(e) => updateProduct(index, { name: e.target.value })} /></td>
                    <td><input value={p.brand} onChange={(e) => updateProduct(index, { brand: e.target.value })} placeholder="Sin marca" /></td>
                    <td>
                      <select value={p.category} onChange={(e) => updateProduct(index, { category: e.target.value })}>
                        <option value="">—</option>
                        {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                      </select>
                    </td>
                    <td><input className="admin-input-sm" value={p.unit} onChange={(e) => updateProduct(index, { unit: e.target.value })} /></td>
                    <td><PriceField value={p.price} onChange={(v) => updateProduct(index, { price: v ?? 0 })} consultLabel="A consultar" /></td>
                    <td>
                      <button
                        type="button"
                        className={`admin-toggle${p.hidden ? '' : ' admin-toggle-on'}`}
                        onClick={() => updateProduct(index, { hidden: !p.hidden })}
                      >
                        {p.hidden ? 'Oculto' : 'Visible'}
                      </button>
                    </td>
                    <td><button className="admin-card-delete" onClick={() => removeProduct(index)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* -------------------- CATEGORIAS -------------------- */}
      {tab === 'categories' ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <p>Nombres de las categorías que se muestran como filtros. La clave (key) no se edita para no romper productos existentes.</p>
          </div>
          <div className="admin-cats-list">
            {categories.map((c, index) => (
              <div className="admin-cat-row" key={c.key}>
                <code>{c.key}</code>
                <input
                  value={c.name}
                  onChange={(e) =>
                    updateCatalog((d) => {
                      d.catalog.categories = d.catalog.categories.map((it, i) =>
                        i === index ? { ...it, name: e.target.value } : it,
                      )
                    })
                  }
                />
                <span className="admin-cat-count">
                  {catalog.products?.filter((p) => p.category === c.key).length || 0} productos
                </span>
              </div>
            ))}
          </div>
          <p className="admin-note">Categoría de un producto: {categoryName(categories[0]?.key)}…</p>
        </section>
      ) : null}

      <footer className="admin-foot">
        Borrador guardado automáticamente en este navegador. Recordá <strong>Exportar</strong> para publicar.
      </footer>
    </div>
  )
}
