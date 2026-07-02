# Corralon Los Eucaliptus

Web catalogo + panel admin para Corralon Los Eucaliptus. Todo corre en un VPS:
frontend estatico servido por Nginx, backend Express en Docker y datos en
SQLite.

Produccion:
- https://corralonloseucaliptus.com

Documentacion clave:
- [Estado del proyecto](docs/ESTADO-PROYECTO.md)
- [Panel admin](ADMIN.md)
- [Auditoria tecnica 2026-07-02](docs/AUDITORIA-TECNICA-2026-07-02.md)
- [Reconstruccion de arquitectura](docs/RECONSTRUCCION-ARQUITECTURA.md)
- [Plan de correcciones](docs/PLAN-CORRECCIONES.md)

## Arquitectura actual

```text
Internet
  -> Nginx en el VPS
    -> /                -> /opt/loseucaliptos/dist
    -> /catalogo        -> /opt/loseucaliptos/dist/catalogo/index.html
    -> /api/*           -> container Express en 127.0.0.1:3001
    -> /uploads/*       -> container Express en 127.0.0.1:3001
```

Stack:
- Frontend: React 19 + Vite
- Backend: Node 22 + Express
- DB: SQLite (`server/data/loseucaliptos.sqlite`)
- Imagenes: `server/uploads/`
- Infra: Debian 12 + Nginx + Docker Compose

## Datos y fuentes

- Catalogo publico: tabla `products`
- Destacados del home: `products.featured = 1`
- Categorias: tabla `categories`
- Pileta administrativa: tabla `raw_skus`
- Seed versionado:
  - `server/seed-data/featured-catalog.json`
  - `server/seed-data/raw-catalog.json`

Dato importante:
- El admin guarda directo en la DB del VPS.
- El seed inicial es idempotente por `INSERT OR IGNORE`; no reconcilia cambios
  posteriores del JSON con la DB ya existente.

## Panel admin

Entrada:
- `https://corralonloseucaliptus.com/#admin`

Funciones actuales:
- editar productos
- activar/desactivar productos
- marcar destacados
- CRUD de categorias
- promover `raw_skus` al catalogo
- subir imagenes de producto
- crear usuarios admin
- elegir tema y wallpaper local del panel

## Deploy

Flujo normal:
1. editar local
2. `git push origin main`
3. `ssh loseucaliptus "bash /opt/loseucaliptos/scripts/deploy.sh"`

El script actual:
- hace `git fetch origin main --prune`
- fuerza `main` a `origin/main`
- builda frontend
- rebuilda backend
- recarga Nginx
- verifica `frontend` y `/api/catalog`

## Desarrollo local

Frontend:
```bash
npm install
npm run dev
```

Backend:
```bash
cd server
npm install
docker compose up -d --build
```

Proxy de desarrollo:
- `/api` -> `http://localhost:3001`
- `/uploads` -> `http://localhost:3001`

## Estado operativo resumido

- Total productos en DB: 64
- Productos publicos activos: 62
- Categorias: 7
- `raw_skus`: 1749
- Usuarios: 3

Riesgos operativos abiertos (ver auditoria para el detalle):
- no hay backups del `.sqlite` ni de `uploads/` (unico cron: renovacion TLS)
- disco del VPS al 78% (compartido con n8n, chatwoot y portainer)
- subida de imagenes limitada a ~750 KB por falta de `client_max_body_size`
- el `.env` del VPS no usa los nombres `SEED_ADMIN_*` que espera el seed

Para detalles de operacion, riesgos y reconstruccion completa, ver los docs en
`docs/`.
