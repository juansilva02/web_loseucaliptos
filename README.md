# Corralon Los Eucaliptus

Catalogo web y panel administrativo para Los Eucaliptus. La aplicacion usa un
frontend React, una API Express y SQLite, desplegados en un unico VPS detras de
Nginx.

Produccion: https://corralonloseucaliptus.com

## Arquitectura

```text
Navegador
  -> Nginx
     -> / y /catalogo   -> frontend estatico en /opt/loseucaliptos/dist
     -> /assets/*       -> bundles con cache immutable
     -> /uploads/*      -> archivos en server/uploads, servidos por Nginx
     -> /api/*          -> Express en 127.0.0.1:3001
                            -> SQLite
                            -> Nominatim, solo mediante proxy controlado
```

- Frontend: React 19, React Router y Vite.
- Backend: Node 22, Express, `better-sqlite3` y `sharp`.
- Persistencia: `server/data/loseucaliptos.sqlite`.
- Imagenes administradas: `server/uploads/`.
- Infraestructura: Docker Compose, Nginx y `scripts/deploy.sh`.
- Config compartida de sucursales y entregas: `shared/delivery-config.json`.

## Fuentes de datos

- `products`: unica fuente runtime del catalogo y de los destacados.
- `categories`: categorias publicas.
- `raw_skus`: base curada para revisar, vincular o promover productos.
- `audit_log`: trazabilidad de escrituras administrativas.
- `schema_migrations`: migraciones aditivas aplicadas.
- `server/seed-data/`: bootstrap de una DB nueva, no sincronizacion de la DB
  viva.

`GET /api/featured` se mantiene temporalmente por compatibilidad. El frontend
deriva destacados desde `GET /api/catalog`.

## Busqueda de productos

Los SKU importados se revisan primero en `raw_skus`. Solo los productos activos
de `products` se publican en el catalogo y participan de la busqueda de la API.

En el panel administrativo se puede abrir **Datos de busqueda** para cada
producto y completar:

- Alias y sinonimos, por ejemplo `malla para revoque`, `malla de fibra`.
- Medidas y formatos, por ejemplo `6`, `15x25`, `25 kg`.
- Aplicaciones y usos, por ejemplo `revoque`, `estructura`.

El boton **Autocompletar busquedas** propone esos datos para todos los
productos activos. Las propuestas deben revisarse y guardarse desde el panel.
Los valores pueden escribirse separados por comas o por saltos de linea; los
espacios dentro de un alias se conservan.

Panel: `https://corralonloseucaliptus.com/#admin`

La busqueda publica es:

```http
GET /api/catalog/search?q=malla%20para%20revoque
```

La API exige que coincidan todos los terminos relevantes y devuelve candidatos
con `score`, `matchedTerms` y `matchReason`. La respuesta no incluye SKU crudos;
el workflow de n8n debe consultar este endpoint y usar los productos activos.

## Flujos principales

- `GET /api/catalog` se sirve desde una cache en memoria con ETag: las visitas
  repetidas reciben `304` sin cuerpo. Las escrituras del admin invalidan la
  cache automaticamente.
- El carrito valida precios y disponibilidad con `POST /api/catalog/quote`
  antes de iniciar el checkout.
- El checkout guarda su borrador privado dos horas en `sessionStorage` y
  termina en WhatsApp.
- La cobertura se resuelve mediante `/api/delivery/*`; el navegador no consulta
  Nominatim directamente.
- El admin guarda solo filas modificadas mediante un bulk transaccional con
  control de versiones. Las imagenes y el orden de destacados tambien se
  publican al guardar.
- Los metadatos de busqueda se guardan junto al producto mediante el mismo bulk
  transaccional y se incluyen en la busqueda sin exponerlos en el catalogo
  publico.
- Las imagenes se convierten a WebP y se guardan como
  `<product-id>-<hash>.webp`.
- Los usuarios del panel ingresan con nombre de usuario o email; el email es
  opcional y sirve como contacto de recuperacion.

## Desarrollo

```bash
npm ci
npm --prefix server ci
docker compose -f server/docker-compose.yml up -d --build
npm run dev
```

Controles locales:

```bash
npm run lint
npm test
npm run build
npm --prefix server test
npm run test:e2e
```

Las pruebas del backend corren en Node 22+ (`better-sqlite3` v12 trae binarios
precompilados; en Windows sin toolchain C++, usar `npm rebuild better-sqlite3`
si el binario falta).

## Deploy

```bash
git push origin main
ssh loseucaliptus "bash /opt/loseucaliptos/scripts/deploy.sh"
```

El deploy usa `npm ci`, espera readiness de la DB, exige API viva para
prerender, construye el frontend fuera de `dist`, publica HTML de forma
atomica, conserva assets anteriores durante 30 dias y restaura los HTML
anteriores si falla la verificacion.

## Documentacion

- [Panel admin](ADMIN.md)
- [Estado operativo](docs/ESTADO-PROYECTO.md)
- [Auditoria tecnica](docs/AUDITORIA-TECNICA-2026-07-02.md)
- [Reconstruccion](docs/RECONSTRUCCION-ARQUITECTURA.md)
- [Plan y cierre](docs/PLAN-CORRECCIONES.md)

Los backups siguen fuera de este cambio y se implementaran en una fase
separada.
