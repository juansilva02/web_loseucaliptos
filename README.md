# Corralón Los Eucaliptus

Web + catálogo online de **Corralón Los Eucaliptus** (sucursales Solano y Bosques, Zona Sur, Buenos Aires). Venta por WhatsApp, con panel de administración propio.

**En producción:** https://corralonloseucaliptus.com

> 📋 Referencia completa de arquitectura, configuración y operación: **[`docs/ESTADO-PROYECTO.md`](docs/ESTADO-PROYECTO.md)**.

## Arquitectura

Todo corre en un **VPS** (Debian + Docker), detrás de **Nginx**. Frontend y API en el mismo dominio (mismo origen, sin CORS).

```
https://corralonloseucaliptus.com  (Nginx en el VPS)
   ├── /         → frontend estático (React build, dist/)
   ├── /api/*    → backend (Express + SQLite, en Docker, :3001)
   └── /uploads/*→ imágenes subidas desde el admin
```

- **Frontend:** React 19 + Vite, CSS custom con tokens. Código en `src/`.
- **Backend:** Express + SQLite (`better-sqlite3`), auth JWT propia (`node:crypto`), `sharp` para imágenes. Código en `server/`, corre en Docker.
- **TLS:** acme.sh (Let's Encrypt), auto-renovación.
- **Dominio:** `corralonloseucaliptus.com` (DNS en Hostinger).

## Estructura

```
src/                 frontend (React + Vite)
  pages/CatalogPage  catálogo (lee de /api/catalog)
  admin/             panel admin (lee/escribe /api/admin/*)
  context/           carrito global (localStorage)
  components/        verificador de cobertura, mapa Leaflet
server/              backend (Express + SQLite, Docker)
  src/routes/        auth, products, categories, raw-skus, uploads
  src/index.js       app + endpoints públicos (/api/catalog, /api/featured)
  data/              base SQLite (no en git)
  uploads/           imágenes subidas (no en git)
scripts/deploy.sh    deploy del VPS (un comando)
docs/ESTADO-PROYECTO.md  referencia operativa
```

## Datos dinámicos

- **Catálogo** (`/catalogo`) y **destacados** del home leen de la API (`/api/catalog`, `/api/featured`). Lo que se carga/edita en el admin se refleja solo, sin redeploy.
- **Destacados:** productos marcados `featured` en la DB (inicialmente, los que tienen precio). El admin puede cambiar cuáles son destacados.
- Imágenes: se usa la subida del admin si existe; si no, cae a un asset bundleado por id.

## Panel de administración

`https://corralonloseucaliptus.com/#admin` — login con usuario y contraseña (servidor). Gestiona el catálogo (agregar/editar/borrar, agregar desde la pileta de SKUs, subir imágenes) contra la API. Detalle en [`ADMIN.md`](ADMIN.md).

## Deploy / actualizar

Editar local → `git push` → en el VPS:

```bash
ssh <vps> "bash /opt/loseucaliptos/scripts/deploy.sh"
# git pull + build frontend + docker backend + reload nginx + verificación
```

## Desarrollo local

```bash
npm install
npm run dev      # Vite proxya /api y /uploads a localhost:3001 (backend)
```

El backend (`server/`) corre en Docker; para probar el front local contra la API del VPS, usar un túnel SSH a `:3001`.
