# Estado del proyecto

Referencia viva del estado real del sistema. Actualizado al 2026-07-02, con
verificacion en vivo del VPS por SSH (repo, Docker, Nginx, DB y cron).

## 1. Topologia real

Todo corre en el VPS `190.104.252.7`.

```text
Usuario
  -> https://corralonloseucaliptus.com
    -> Nginx
      -> /                      -> /opt/loseucaliptos/dist
      -> /catalogo             -> /opt/loseucaliptos/dist/catalogo/index.html
      -> /api/*                -> 127.0.0.1:3001
      -> /uploads/*            -> 127.0.0.1:3001
```

Piezas:
- dominio: `corralonloseucaliptus.com`
- frontend: React + Vite compilado en `dist/`
- backend: Express en Docker
- DB: SQLite persistida en `server/data/loseucaliptos.sqlite`
- imagenes: `server/uploads/`
- TLS: `acme.sh` + Nginx

## 2. Ubicaciones operativas

| Recurso | Ubicacion |
|---|---|
| Repo local | `E:\\Loseucaliptos2026` |
| Repo en VPS | `/opt/loseucaliptos` |
| Frontend build | `/opt/loseucaliptos/dist` |
| Backend | `/opt/loseucaliptos/server` |
| Nginx site | `/etc/nginx/sites-available/corralon` |
| Certificados TLS | `/etc/nginx/ssl/corralon/fullchain.cer` + `private.key` |
| DB | `/opt/loseucaliptos/server/data/loseucaliptos.sqlite` |
| Uploads | `/opt/loseucaliptos/server/uploads` |
| Deploy | `/opt/loseucaliptos/scripts/deploy.sh` |

El VPS es compartido: Nginx tambien sirve los sites `n8n`, `chatwoot` y `acme`.
Cualquier cambio de Nginx debe cuidar de no pisarlos.

## 3. Estado de datos

Conteos observados en el VPS (verificados 2026-07-02):
- categorias: 7
- productos totales en DB: 64
- productos publicos activos: 62
- `raw_skus`: 1749
- usuarios: 3
- `orders`: 0 y `leads`: 0 (las tablas existen en el esquema pero no hay
  endpoints que escriban en ellas)
- destacados legacy: 18 registros en tabla `featured`, pero el home publico usa
  `products.featured = 1`; el seed sigue poblando esa tabla aunque ya no se lee
- `server/uploads/` en el VPS tiene 1 solo archivo: casi todas las imagenes
  publicadas salen de assets bundleados en el frontend, no de uploads

Fuentes versionadas:
- `server/seed-data/featured-catalog.json`
- `server/seed-data/raw-catalog.json`

Limitacion importante:
- `server/src/seed.js` usa `INSERT OR IGNORE`
- eso sirve para bootstrap, pero no vuelve a alinear la DB con el repo una vez
  que la DB ya existe

## 4. Como funciona el admin

Entrada:
- `/#admin`

Frontend:
- `src/admin/AdminPage.jsx`
- `src/admin/api.js`

Backend:
- `server/src/routes/auth.js`
- `server/src/routes/products.js`
- `server/src/routes/categories.js`
- `server/src/routes/raw-skus.js`
- `server/src/routes/uploads.js`

Flujo:
1. login -> token JWT en `sessionStorage`
2. el panel carga productos, categorias y usuarios
3. los cambios se guardan por endpoint REST
4. las imagenes van a `/api/admin/upload`
5. el sitio publico consume `/api/catalog` y `/api/featured`

## 5. Seguridad implementada hoy

- `helmet()` en backend API
- `trust proxy = 1`
- rate limit global `500/15m`
- rate limit de login `20/15m`
- JWT propio con HMAC SHA-256
- passwords con `scrypt`
- validacion de `JWT_SECRET` en produccion
- uploads con nombre canonico por producto y sanitizacion
- backend Docker como usuario no root

Huecos pendientes (verificados en codigo y VPS):
- Nginx no agrega headers de seguridad al HTML estatico del frontend (el
  `curl -I /` no devuelve CSP, HSTS, X-Content-Type-Options ni X-Frame-Options)
- `GET /api/admin/auth/users` requiere auth, pero no `requireAdmin`; de hecho
  todas las rutas de productos, categorias, raw-skus y uploads usan solo
  `requireAuth` (hoy es equivalente porque todos los usuarios son admin)
- Nginx no define `client_max_body_size` (default 1 MB): la subida de imagenes
  viaja como base64 dentro de JSON, asi que una foto mayor a ~750 KB reales
  devuelve 413 antes de llegar a Express (que si permite 10 MB)
- `gzip on` esta activo pero `gzip_types` esta comentado en `nginx.conf`: los
  bundles JS/CSS se sirven sin comprimir (solo se comprime text/html)
- el `.env` del VPS define `ADMIN_EMAIL`/`ADMIN_PASSWORD`, pero `seed.js` lee
  `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`: en una reconstruccion desde cero el
  seed NO crearia el usuario admin con ese `.env`

## 6. SEO y publicacion

Implementado:
- `robots.txt`
- `sitemap.xml`
- canonical y meta tags en `index.html`
- JSON-LD de Organization, WebSite y FAQ en home
- prerender de `/catalogo` con Breadcrumb + ItemList

Riesgos actuales:
- `sitemap.xml` tiene `lastmod` manual y fijo
- el prerender depende de la API viva o cae al JSON estatico
- hay deuda de calidad y normalizacion de nombres del catalogo, aunque la salida
  publica validada en UTF-8 no mostro un problema real de encoding

## 7. Deploy

Comando:

```bash
ssh loseucaliptus "bash /opt/loseucaliptos/scripts/deploy.sh"
```

El script:
1. `git fetch origin main --prune`
2. `git checkout main`
3. `git reset --hard origin/main`
4. `npm install`
5. `npm run build`
6. `docker compose up -d --build`
7. `nginx -t && systemctl reload nginx`
8. verifica `/` y `/api/catalog`

## 8. Estado operativo del VPS (verificado 2026-07-02)

- container `loseucaliptos-api`: Up, `/health` responde OK
- repo en VPS: `be1b782`, working tree limpio, alineado con `origin/main`
- **no existe ningun backup**: el unico cron es la renovacion de acme.sh; no
  hay `/opt/backups` ni copia del `.sqlite` fuera del VPS
- **disco al 78%**: 4,1 GB libres de 19 GB (el VPS comparte espacio con n8n,
  chatwoot, portainer y sus imagenes Docker)
- DB en modo WAL (`.sqlite` + `-shm` + `-wal`), ~800 KB total

## 9. Pendientes estrategicos

- backups automaticos del `.sqlite` y de `uploads/` (hoy: cero backups)
- vigilar espacio en disco (78% usado; limpiar imagenes Docker huerfanas)
- alinear nombres de variables del `.env` del VPS con lo que lee `seed.js`
- `client_max_body_size` en Nginx para que la subida de imagenes reales funcione
- reconciliacion real entre seed versionado y DB viva
- headers de seguridad en Nginx para frontend
- corregir permisos de usuarios admin (`requireAdmin` en rutas de escritura)
- endpoint real para reset admin de contrasenas
- endpoints `orders` y `leads` (las tablas ya existen vacias)
- observabilidad y alertas basicas del backend (hoy no hay logging de requests)

Ver tambien:
- [Auditoria tecnica 2026-07-02](AUDITORIA-TECNICA-2026-07-02.md)
- [Reconstruccion de arquitectura](RECONSTRUCCION-ARQUITECTURA.md)
