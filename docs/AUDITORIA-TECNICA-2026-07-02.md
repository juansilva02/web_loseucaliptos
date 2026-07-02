# Auditoria tecnica 2026-07-02

## Resumen ejecutivo

Estado general:
- la arquitectura actual funciona y el deploy esta operativo
- el flujo admin -> API -> DB esta consolidado
- la documentacion venia parcialmente desactualizada
- hay deuda real en seguridad de borde, reconciliacion de datos y escalabilidad
  del admin

## Hallazgos prioritarios

### 1. `raw_skus` versionado no es fuente de verdad efectiva

- Severidad: alta
- Evidencia: `server/src/seed.js` usa `INSERT OR IGNORE` para `raw_skus`
- Impacto: el repo dice ser la base versionada, pero una DB ya existente no se
  vuelve a alinear sola con `server/seed-data/raw-catalog.json`
- Riesgo: reconstrucciones parciales, drift entre repo y VPS, falsa sensacion de
  reproducibilidad

### 2. Listado de usuarios expuesto a cualquier usuario autenticado

- Severidad: media-alta
- Evidencia: `GET /api/admin/auth/users` usa `requireAuth`, no `requireAdmin`
- Impacto: si en el futuro existen roles no admin, cualquier usuario valido
  podra enumerar emails, roles y fechas de alta

### 3. Reset de contrasena admin no coincide con la expectativa operativa

- Severidad: media
- Evidencia: `PUT /api/admin/auth/users/:id/password` exige `currentPassword`
  incluso cuando el actor es admin
- Impacto: un admin no puede resetear la contrasena de otro usuario sin conocer
  la contrasena actual
- Nota: la documentacion anterior afirmaba lo contrario

### 4. Seguridad de borde incompleta en frontend estatico

- Severidad: media
- Evidencia: `curl -I /` devuelve HTML sin headers de seguridad equivalentes a
  los de la API; Nginx no agrega CSP, HSTS explicito de borde, X-Frame-Options,
  etc. al frontend estatico
- Impacto: la API esta endurecida por `helmet`, pero la pagina principal no

### 5. Prerender SEO dependiente de una fuente inestable

- Severidad: media
- Evidencia: `scripts/prerender.mjs` intenta leer la API viva y si falla cae a
  `src/data/featured-catalog.json`
- Impacto: se puede generar un `/catalogo` indexable con datos distintos del
  catalogo real
- Señal observada: en local el fallback produjo 64 productos; en produccion la
  API publica hoy expone 62 activos

### 6. Calidad y normalizacion de nombres del catalogo

- Severidad: media
- Evidencia: la API publica y la DB validada en UTF-8 responden bien, pero el
  catalogo sigue dependiendo de nombres curados manualmente y de reglas de
  limpieza en frontend para disponibilidad/promos/formatos
- Impacto: el riesgo real no es de encoding en produccion, sino de consistencia
  semantica y calidad editorial en nombres que terminan en UX, filtros, snippets
  y schema

### 7. Escalabilidad limitada del guardado admin

- Severidad: media
- Evidencia: `src/admin/AdminPage.jsx` guarda productos uno por uno y reenvia
  toda la coleccion editable
- Impacto: a medida que crezcan los productos o usuarios simultaneos, el guardado
  sera mas lento y fragil

### 8. Basura de imagenes posible al quitar imagenes

- Severidad: baja-media
- Evidencia: el reemplazo borra la imagen anterior si cambia de nombre, pero
  quitar imagen desde admin solo limpia `image_url`
- Impacto: archivos huerfanos en `uploads/`

### 9. Sin backups y disco al 78% (verificado en el VPS)

- Severidad: alta
- Evidencia: `crontab -l` solo tiene la renovacion de acme.sh; no existe
  `/opt/backups` ni copia externa del `.sqlite`; `df -h` reporta 78% usado
  (4,1 GB libres de 19 GB) en un VPS compartido con n8n, chatwoot y portainer
- Impacto: un fallo de disco o un `rm` accidental pierde usuarios, ediciones
  del admin y uploads sin posibilidad de restore; el disco lleno tumba SQLite
  (WAL no puede escribir) y el resto de los servicios

### 10. Drift de variables de entorno rompe la reconstruccion

- Severidad: alta (solo se manifiesta al reconstruir)
- Evidencia: el `.env` real del VPS define `ADMIN_EMAIL` y `ADMIN_PASSWORD`,
  pero `server/src/seed.js` lee `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`
- Impacto: en un VPS nuevo con ese mismo `.env`, el seed no crea ningun usuario
  admin y el panel queda inaccesible hasta crear uno a mano

### 11. Subida de imagenes limitada por Nginx a ~750 KB reales

- Severidad: media-alta
- Evidencia: no hay `client_max_body_size` en `nginx.conf` ni en el site
  `corralon` (default 1 MB); el upload viaja como base64 en JSON (~+33%)
- Impacto: cualquier foto tipica de celular (2-5 MB) devuelve 413 en Nginx
  antes de llegar a Express, cuyo limite de 10 MB nunca aplica

### 12. Compresion gzip incompleta para el frontend

- Severidad: baja-media
- Evidencia: `nginx.conf` tiene `gzip on` pero `gzip_types` comentado, asi que
  solo se comprime `text/html`; los bundles JS/CSS van sin comprimir
- Impacto: peso de transferencia innecesario en la carga inicial de la SPA

### 13. Escapado de LIKE incompleto en busquedas admin

- Severidad: baja
- Evidencia: `server/src/routes/products.js` escapa `%` y `_` con backslash
  pero el SQL no declara `ESCAPE '\'`, asi que el escape no tiene efecto real;
  `raw-skus.js` directamente no escapa
- Impacto: busquedas con `%` o `_` devuelven resultados incorrectos (no es
  inyeccion SQL: los parametros van bindeados)

### 14. "Quitar" producto en el admin no borra nada en la DB

- Severidad: baja-media
- Evidencia: `removeProduct` en `AdminPage.jsx` solo filtra el estado local;
  al guardar, el producto sigue existiendo en la DB y reaparece al recargar
- Impacto: UX confusa; el operador cree que elimino un producto que sigue vivo

### 15. Codigo legacy activo que confunde el mantenimiento

- Severidad: baja
- Evidencia: `src/admin/catalogStore.js` conserva el modelo viejo
  "exportar JSON + commit + Vercel" (solo se usa su `slugify`); `seed.js` sigue
  poblando la tabla `featured` que ninguna ruta lee; comentarios en
  `src/admin/api.js` citan Vercel y `VITE_API_URL`
- Impacto: induce a error sobre como funciona realmente el sistema

### 16. Regresion en produccion: DB de solo lectura para el container no root

- Severidad: critica (activa al momento de la auditoria)
- Evidencia: logs del container muestran `SqliteError: attempt to write a
  readonly database` en `products.js` (un admin real ya lo sufrio); en el host
  `/opt/loseucaliptos/server/data` y el `.sqlite` pertenecen a root, mientras
  el container corre como uid 1001 (`appuser`)
- Causa: el `chown` del Dockerfile aplica dentro de la imagen, pero los bind
  mounts pisan esa propiedad con la del host; al no poder abrir la DB para
  escritura, SQLite cae a modo solo lectura
- Impacto: desde el deploy del 2026-07-01 ~21:30 el panel admin no puede
  guardar nada (el sitio publico sigue OK porque solo lee); la subida de
  imagenes tambien falla por la misma causa en `uploads/`
- Fix: `chown -R 1001:1001 server/data server/uploads` en el host + restart
  del container; se incorpora a `deploy.sh` para que cada deploy lo garantice

## SEO: ultimo estado revisado

Artefactos presentes:
- `public/robots.txt`
- `public/sitemap.xml`
- canonical y meta tags en `index.html`
- JSON-LD de Organization, WebSite y FAQ
- prerender de `/catalogo` con ItemList y BreadcrumbList

Mejoras recomendadas:
1. generar `sitemap.xml` automaticamente en build o deploy
2. usar una sola fuente para el prerender del catalogo
3. consolidar una politica de nombres curados antes de exponerlos en schema
4. revisar titles y descriptions del home con copy final ya curado
5. considerar pages de sucursal propias si el foco local SEO crece

## Seguridad: mejoras recomendadas

1. mover `GET /api/admin/auth/users` a `requireAdmin` (y evaluar `requireAdmin`
   en todas las rutas de escritura: products, categories, raw-skus, upload usan
   solo `requireAuth`)
2. agregar un endpoint de reset admin sin `currentPassword`
3. agregar headers de seguridad en Nginx para el frontend estatico
4. definir estrategia de backup para DB y uploads
5. auditar politica de CORS en `.env` de produccion
6. agregar logging de requests (morgan o similar) para tener trazabilidad de
   accesos al panel admin

## Arquitectura y durabilidad

Fortalezas:
- mismo origen para front y API
- backend pequeno y entendible
- persistencia separada por bind mounts
- deploy reproducible desde repo

Debilidades:
- seed no reconcilia datos vivos
- SQLite sin backup automatizado documentado
- demasiada logica de edicion centralizada en `AdminPage.jsx`
- documentacion historica convivio con la vigente

## Recomendaciones por horizonte

Corto plazo:
1. **configurar backups diarios de `.sqlite` + `uploads/` fuera del VPS**
2. `client_max_body_size 12m;` en el site de Nginx (desbloquea uploads reales)
3. alinear `.env` del VPS con `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`
4. endurecer permisos de usuarios
5. arreglar reset admin de contrasena
6. agregar headers de seguridad y `gzip_types` en Nginx
7. automatizar `sitemap.xml`
8. liberar espacio en disco (docker system prune de imagenes huerfanas)

Mediano plazo:
1. dirty tracking o guardado por fila en admin
2. endpoint bulk para productos
3. reconciliacion explicita seed -> DB o abandonar la idea de repo como fuente
4. limpieza automatica de uploads huerfanos

Largo plazo:
1. backup y restore formalizados
2. observabilidad minima
3. endpoints `orders` y `leads`
4. separar el admin grande en modulos y hooks
