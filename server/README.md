# Backend API

API Express del catalogo, checkout y panel admin.

## Inicio

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api
```

El compose usa el contexto raiz para incluir `shared/delivery-config.json`.
Los bind mounts son:

- `./data` -> `/app/data`
- `./uploads` -> `/app/uploads`

El container corre como UID 1001, publica solo `127.0.0.1:3001` y tiene
healthcheck y rotacion de logs.

## Variables

- `PORT`, default `3001`
- `DB_PATH`, opcional
- `UPLOADS_DIR`, opcional y usado por tests
- `JWT_SECRET`, obligatorio en produccion
- `JWT_EXPIRES`, default `12h`
- `CORS_ORIGINS`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `GEOCODER_EMAIL`, recomendado para Nominatim
- `GEOCODER_USER_AGENT`

`ADMIN_EMAIL` y `ADMIN_PASSWORD` son aliases temporales del seed y generan una
advertencia.

## Rutas publicas

- `GET /health`
- `GET /health/ready`
- `GET /api/catalog`
- `POST /api/catalog/quote`
- `GET /api/featured`, compatibilidad temporal
- `POST /api/delivery/search`
- `POST /api/delivery/reverse`

## Persistencia

`initSchema()` aplica `schema.sql` y luego migraciones registradas en
`schema_migrations`. Las migraciones son aditivas para permitir rollback del
frontend y backend anterior.

Una DB nueva se prepara con:

```bash
SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_PASSWORD='cambiar-esta-clave' \
npm run seed
```

El seed crea siete categorias y marca explicitamente catorce productos como
destacados. Usa `INSERT OR IGNORE`: no reconcilia una DB ya operativa.

## Seguridad y trazabilidad

- JWT HMAC con expiracion configurable y `token_version`.
- `scrypt` asincrono para contrasenas.
- rate limit global, de login y de geocodificacion.
- schemas de validacion para productos, IDs, cantidades y paginacion.
- logs JSON con request ID, sin bodies ni datos privados.
- `audit_log` para acciones administrativas, sin hashes ni contrasenas.
- imagenes binarias convertidas por `sharp`.

## Pruebas

```bash
npm test
```

Las pruebas usan SQLite y uploads temporales. Cubren migraciones, bulk
atomico, quote, imagenes, SKUs, revocacion de token y seed.
