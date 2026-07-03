# Reconstruccion de arquitectura

Guia para reconstruir la aplicacion en un VPS Debian 12 compatible. Esta guia
describe codigo, servicios y datos, pero no implementa backups ni restore.

## 1. Resultado esperado

```text
corralonloseucaliptus.com:443
  -> Nginx
     -> /                     frontend React
     -> /catalogo             HTML prerenderizado + React
     -> /assets               archivos Vite versionados
     -> /uploads              alias directo al disco
     -> /api                  Express en Docker
        -> SQLite WAL
        -> filesystem uploads
        -> Nominatim
```

No se necesita Vercel, una DB remota ni un servicio de autenticacion externo.

## 2. Requisitos

- Debian 12 o equivalente.
- DNS del dominio apuntando al VPS.
- Git, curl, Nginx, Docker Engine y Docker Compose Plugin.
- Node 22 y npm para construir el frontend en el host.
- Certificados en:
  - `/etc/nginx/ssl/corralon/fullchain.cer`
  - `/etc/nginx/ssl/corralon/private.key`

```bash
apt-get update
apt-get install -y git curl nginx docker.io docker-compose-plugin nodejs npm
systemctl enable --now docker nginx
```

La version de Node debe comprobarse con `node --version`. El backend se compila
en Docker con Node 22 aunque el host solo construye el frontend.

## 3. Layout

```text
/opt/loseucaliptos/
  deploy/nginx-corralon.conf
  dist/
  scripts/deploy.sh
  shared/delivery-config.json
  server/
    data/loseucaliptos.sqlite
    uploads/
    src/
    docker-compose.yml
```

```bash
git clone <URL_DEL_REPO> /opt/loseucaliptos
cd /opt/loseucaliptos
mkdir -p server/data server/uploads
chown -R 1001:1001 server/data server/uploads
```

UID 1001 es `appuser` dentro del container. Los permisos del Dockerfile no
alcanzan para bind mounts: deben existir tambien en el host.

## 4. Configuracion

Crear `/opt/loseucaliptos/server/.env`:

```dotenv
PORT=3001
NODE_ENV=production
JWT_SECRET=<secreto-aleatorio-largo>
JWT_EXPIRES=12h
CORS_ORIGINS=https://corralonloseucaliptus.com
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=<clave-inicial-segura>
GEOCODER_EMAIL=operaciones@example.com
GEOCODER_USER_AGENT=LosEucaliptosCorralon/1.0
```

Reglas:

- no commitear `.env`;
- `JWT_SECRET` es obligatorio;
- `SEED_ADMIN_*` solo interviene si no existe ningun usuario;
- `ADMIN_*` funciona temporalmente, pero debe migrarse;
- sucursales y radios se editan en `shared/delivery-config.json`, no en `.env`.

## 5. Base de datos

El arranque ejecuta:

1. `schema.sql`, idempotente;
2. migraciones no registradas;
3. insercion en `schema_migrations`.

Las migraciones actuales agregan:

- versiones en productos y categorias;
- `token_version` en usuarios;
- `audit_log`;
- indices de catalogo;
- indice unico parcial de `products.source_code`.

Antes de aplicar el indice en una DB existente:

```sql
SELECT source_code, COUNT(*) AS cantidad
FROM products
WHERE source_code IS NOT NULL
GROUP BY source_code
HAVING COUNT(*) > 1;
```

La consulta debe devolver cero filas.

Para una DB nueva:

```bash
cd /opt/loseucaliptos/server
docker compose build api
docker compose run --rm api node src/seed.js
```

El seed es bootstrap. No vuelve a sincronizar productos ya existentes.

## 6. Backend

El compose se ejecuta desde `server/`, pero construye con contexto raiz para
copiar la configuracion compartida a `/shared`. Los mounts conservan las rutas
historicas `/app/data` y `/app/uploads`.

```bash
cd /opt/loseucaliptos/server
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:3001/health/ready
```

Propiedades operativas:

- puerto publicado solo en loopback;
- container no root;
- healthcheck de DB;
- logs Docker limitados a 5 archivos de 10 MB;
- `restart: unless-stopped`.

## 7. Nginx

La configuracion canonica vive en `deploy/nginx-corralon.conf`.

```bash
install -m 0644 \
  /opt/loseucaliptos/deploy/nginx-corralon.conf \
  /etc/nginx/sites-available/corralon
ln -sfn /etc/nginx/sites-available/corralon /etc/nginx/sites-enabled/corralon
nginx -t
systemctl reload nginx
```

Incluye:

- redirect HTTP a HTTPS y `www` al apex;
- HSTS, CSP, `nosniff`, frame y referrer policy;
- `client_max_body_size 12m`;
- gzip para CSS, JS, JSON y SVG;
- cache immutable para `/assets`;
- alias de `/uploads` al disco;
- todos los `X-Forwarded-*` hacia Express;
- redirect `/catalogo/` a `/catalogo`;
- bloqueo de archivos ocultos.

El VPS comparte Nginx con otros servicios. Solo reemplazar el site `corralon`;
no borrar otros archivos de `sites-enabled`.

## 8. Frontend y SEO

Desarrollo:

```bash
cd /opt/loseucaliptos
npm ci
npm run build
```

Produccion exige API:

```bash
BUILD_OUT_DIR=/tmp/corralon-build \
PRERENDER_REQUIRE_API=1 \
npm run build
node scripts/verify-assets.mjs /tmp/corralon-build
```

El prerender genera:

- `catalogo/index.html`;
- JSON-LD de productos y breadcrumb;
- `sitemap.xml` con fecha actual.

Los productos sin precio o no disponibles no publican `Offer/InStock`.

## 9. Deploy normal

```bash
ssh loseucaliptus \
  "bash /opt/loseucaliptos/scripts/deploy.sh"
```

Secuencia:

1. alinea `main` con `origin/main`;
2. garantiza permisos de DB/uploads;
3. construye y recrea backend;
4. espera `/health/ready`;
5. ejecuta `npm ci`;
6. construye frontend en `.deploy/build-<fecha>`;
7. verifica referencias de assets;
8. copia assets sin borrar los anteriores;
9. reemplaza atomico `index.html` y `catalogo/index.html`;
10. instala y valida Nginx;
11. verifica frontend, API y assets por HTTPS;
12. restaura HTML anterior si falla;
13. elimina assets no usados de mas de 30 dias;
14. ejecuta solo `docker image prune -f`.

No ejecutar `docker system prune`: el VPS aloja mas servicios.

## 10. Flujos de datos

### Catalogo y checkout

```text
React -> GET /api/catalog -> products/categories
Carrito -> POST /api/catalog/quote -> precios/version vigente
Checkout -> POST /api/delivery/search -> Nominatim proxy
Checkout -> URL de WhatsApp de sucursal efectiva
```

No se crea una orden en DB en esta etapa.

### Admin

```text
Login -> JWT en sessionStorage
Admin -> GET productos/categorias
Edicion -> snapshot local
Guardar -> PUT bulk con version
Backend -> transaccion SQLite + audit_log
409 -> cero escrituras + valores actuales
```

### Imagen

```text
File binario -> PUT image
sharp -> WebP temporal
rename -> archivo final
transaccion -> image_url + version
commit -> borrar archivo anterior
```

## 11. Verificacion

```bash
curl -I https://corralonloseucaliptus.com/
curl -fsS https://corralonloseucaliptus.com/health/ready
curl -fsS https://corralonloseucaliptus.com/api/catalog
curl -I https://corralonloseucaliptus.com/catalogo
curl -fsS https://corralonloseucaliptus.com/sitemap.xml
```

En el repo:

```bash
npm ci
npm --prefix server ci
npm run lint
npm test
npm --prefix server test
npm run build
npm run test:e2e
npm audit --audit-level=high
npm --prefix server audit --audit-level=high
```

## 12. Escalamiento

El diseno actual soporta un catalogo moderado y pocos administrativos
concurrentes. Migrar componentes cuando aparezcan estas senales:

- multiples instancias API: mover SQLite a PostgreSQL;
- varias replicas de geocoding: mover cache/cola a Redis o proveedor dedicado;
- catalogo grande: paginacion, ETag y cache HTTP;
- pedidos que no pueden perderse: persistir orden antes de abrir WhatsApp;
- auditoria creciente: retencion y exportacion;
- operacion 24/7: metricas, alertas y logs centralizados.

Backups y restore quedan deliberadamente fuera de esta guia hasta la siguiente
fase del proyecto.
