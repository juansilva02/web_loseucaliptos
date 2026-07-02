# Backend API

Backend actual del corralon. Expone catalogo publico, panel admin, uploads y
seed inicial.

## Stack real

- Node 22
- Express
- SQLite con `better-sqlite3`
- auth propia con `node:crypto`
- `sharp` para imagenes
- Docker Compose

## Rutas principales

Publicas:
- `GET /health`
- `GET /api/catalog`
- `GET /api/featured`

Admin:
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- `GET /api/admin/auth/users`
- `POST /api/admin/auth/users`
- `PUT /api/admin/auth/users/:id/password`
- `GET/POST/PUT /api/admin/products`
- `POST /api/admin/products/:id/deactivate`
- `POST /api/admin/products/:id/activate`
- `GET/POST/PUT/DELETE /api/admin/categories`
- `GET /api/admin/raw-skus`
- `POST /api/admin/raw-skus/:code/promote`
- `POST /api/admin/upload`

## Persistencia

Bind mounts:
- `./data` -> `/app/data`
- `./uploads` -> `/app/uploads`

Archivos principales:
- DB: `server/data/loseucaliptos.sqlite`
- uploads: `server/uploads/`
- seed versionado:
  - `server/seed-data/featured-catalog.json`
  - `server/seed-data/raw-catalog.json`

## Docker

Levantar:

```bash
cd server
docker compose up -d --build
```

Ver estado:

```bash
docker compose ps
docker compose logs -f api
```

## Variables de entorno

- `PORT`
- `DB_PATH` opcional
- `JWT_SECRET`
- `CORS_ORIGINS`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `N8N_WEBHOOK_URL` reservado para integraciones futuras

Atencion: el `.env` historico del VPS usa `ADMIN_EMAIL`/`ADMIN_PASSWORD`, pero
`seed.js` solo lee los nombres `SEED_ADMIN_*`. En una DB nueva, con los nombres
viejos el seed no crea ningun usuario admin.

## Seed

El seed vive en `server/src/seed.js`.

Importante:
- es util para bootstrap
- usa `INSERT OR IGNORE`
- no debe considerarse una sincronizacion bidireccional ni una reconciliacion
  completa de la DB viva

## Seguridad actual

- `helmet`
- `trust proxy = 1`
- rate limits
- auth JWT
- passwords con `scrypt`
- uploads con sanitizacion y conversion a WebP
- contenedor no root

## Observaciones

- La documentacion historica que hablaba de Vercel, bcrypt o rutas antiguas ya
  no aplica.
- El frontend sirve HTML estatico desde Nginx; por eso los headers de `helmet`
  solo cubren la API, no el borde completo.
