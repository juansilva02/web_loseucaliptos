# Plan: Backend automático para el panel admin

## Objetivo

Reemplazar el flujo manual (editar → exportar archivos → commit → push → redeploy) por uno automático donde al guardar los cambios en el admin, la página web los refleje inmediatamente.

---

## Arquitectura

```
┌─────────────────┐       PUT /api/catalog       ┌──────────────────┐
│   Admin panel    │       POST /api/images        │   Express API    │
│  (AdminPage.jsx) ├──────────────────────────────►│   (server/)      │
│                  │                               │                  │
│  Guardar cambios │                               │  featured-       │
│  → fetch(API)    │                               │  catalog.json    │
└─────────────────┘                               │  product-images/ │
                                                  │                  │
┌─────────────────┐       GET /api/catalog        └──────┬───────────┘
│   Storefront     │◄──────────────────────────────┘    │
│  (App.jsx)       │                                     │
│                  │            static/images            │
│  Al cargar       │◄────────────────────────────────────┘
│  → fetch(API)    │
└─────────────────┘
```

---

## 1. Backend Express (`server/`)

### Archivos a crear

```
server/
├── index.js            # Entry point: Express app, CORS, rutas, static files
├── package.json        # Dependencias: express, cors, multer, jsonwebtoken
├── data/
│   └── featured-catalog.json   # Copia editable del catálogo (inicial = src/data/featured-catalog.json)
├── uploads/
│   └── product-images/         # Imágenes subidas desde el admin
└── .env                # JWT_SECRET, ADMIN_USER, ADMIN_PASS_HASH
```

### Endpoints

| Método | Ruta | Auth | Body | Respuesta |
|--------|------|------|------|-----------|
| POST | `/api/login` | No | `{ user, password }` | `{ token }` |
| GET | `/api/catalog` | No | — | Catálogo completo JSON |
| PUT | `/api/catalog` | Sí (token) | Catálogo completo JSON | `{ ok }` |
| POST | `/api/images` | Sí (token) | `multipart: file` | `{ filename, path }` |
| DELETE | `/api/images/:filename` | Sí (token) | — | `{ ok }` |

### Detalles de implementación

- **Auth**: JWT simple con `jsonwebtoken`. El token expira en 24h. Se envía como `Authorization: Bearer <token>`.
- **Catalog GET**: Lee `server/data/featured-catalog.json` y lo devuelve como JSON.
- **Catalog PUT**: Recibe el JSON, sobreescribe `server/data/featured-catalog.json`.
- **Images POST**: Usa `multer` para recibir el archivo, lo guarda en `server/uploads/product-images/`.
- **Static files**: Express sirve `server/uploads/` como ruta `/images/` para que el storefront acceda a las imágenes.
- **CORS**: Habilitado para desarrollo (puerto Vite 5173 → Express).

---

## 2. Cambios en el frontend

### 2.1 `vite.config.js` — Proxy de API en desarrollo

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/images': 'http://localhost:3001',
    },
  },
})
```

### 2.2 `src/admin/catalogStore.js` — Reemplazar exportación por API

Reemplazar `exportCatalogJson()` y `exportImages()` con una función `saveToApi()`:

```js
const API = '/api'
const TOKEN_KEY = 'eucaliptus-admin-token'

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export async function saveCatalogToApi(catalog) {
  const clean = cleanCatalogForExport(catalog)
  const res = await fetch(`${API}/catalog`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(clean),
  })
  if (!res.ok) throw new Error('Error al guardar catálogo')
  return res.json()
}

export async function uploadImageToApi(file, filename) {
  const form = new FormData()
  form.append('file', file, filename)
  const res = await fetch(`${API}/images`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: form,
  })
  if (!res.ok) throw new Error('Error al subir imagen')
  return res.json()
}
```

### 2.3 `src/admin/AdminPage.jsx` — Botón "Guardar cambios"

- Reemplazar el botón "Exportar cambios" por "Guardar cambios"
- `handleSave()`:
  1. Limpia el catálogo (quita `_preview`)
  2. Envía `PUT /api/catalog`
  3. Para cada imagen pendiente, la convierte de dataURL a Blob y envía `POST /api/images`
  4. Si todo ok: limpia `pendingImages`, muestra toast "Cambios guardados", recarga el draft base
  5. Si error: muestra toast de error

- Reemplazar el `handleExport` actual y el banner de "cómo publicar" por uno nuevo: "Los cambios se guardan automáticamente en el servidor."

### 2.4 `src/App.jsx` — Catálogo desde API

- Reemplazar `import featuredCatalog from './data/featured-catalog.json'` por un fetch:

```js
const [featuredCatalog, setFeaturedCatalog] = useState(null)

useEffect(() => {
  fetch('/api/catalog')
    .then(r => r.json())
    .then(setFeaturedCatalog)
    .catch(() => {
      // fallback al JSON estático si la API no está disponible
      import('./data/featured-catalog.json').then(setFeaturedCatalog)
    })
}, [])
```

- El `useMemo` de `featuredProducts` depende de `featuredCatalog` en lugar de ser fijo.

### 2.5 `src/Root.jsx` — Sin cambios

El ruteo por hash se mantiene igual.

---

## 3. Scripts en `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "node server/index.js",
    "dev:all": "concurrently \"npm run dev:server\" \"npm run dev\"",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Dependencias nuevas: `express`, `cors`, `multer`, `jsonwebtoken`, `concurrently` (dev), `dotenv`

---

## 4. Flujo de trabajo

### Desarrollo local
```bash
npm run dev:all    # Arranca Express (3001) + Vite (5173)
```

### Admin
1. Ir a `/#admin`
2. Login
3. Editar productos, precios, imágenes
4. Click "Guardar cambios"
5. Los cambios se escriben al instante en `server/data/featured-catalog.json`

### Storefront
1. Ir a `/`
2. Al cargar la página, fetchea `GET /api/catalog`
3. Las imágenes se sirven desde `/images/product-images/`
4. Refrescás y ves los cambios

### Producción (Vercel)
Opción A: Deployar Express como serverless function en Vercel
Opción B: Usar un VPS simple para el backend
Opción C: Mantener el flujo actual para prod y usar el backend solo para dev

---

## 5. Resumen de archivos a modificar/crear

| Archivo | Acción |
|---------|--------|
| `server/index.js` | **CREAR** — Express server |
| `server/package.json` | **CREAR** — Dependencias del backend |
| `server/.env` | **CREAR** — Variables de entorno |
| `server/data/featured-catalog.json` | **CREAR** — Copia inicial del catálogo |
| `vite.config.js` | **MODIFICAR** — Agregar proxy |
| `package.json` | **MODIFICAR** — Agregar scripts y dependencias |
| `src/admin/catalogStore.js` | **MODIFICAR** — Nuevas funciones API |
| `src/admin/AdminPage.jsx` | **MODIFICAR** — Botón guardar, nuevo flujo |
| `src/App.jsx` | **MODIFICAR** — Fetch dinámico del catálogo |
| `src/admin/adminConfig.js` | **SIN CAMBIOS** |
| `src/Root.jsx` | **SIN CAMBIOS** |
| `src/lib/catalog.js` | **SIN CAMBIOS** |
| `src/data/featured-catalog.json` | **SIN CAMBIOS** (se copia a server/data/) |
