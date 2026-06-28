# Los Eucaliptus — API (backend)

Backend del corralón: catálogo, pedidos, leads y panel admin. Node + Express + SQLite, en Docker.

Corre en el VPS detrás de Nginx (`api.loseucaliptus.zuzudev.pro` → `127.0.0.1:3001`). El frontend (Vercel) le consume la API.

## Stack

- Node 22 + Express
- SQLite (`better-sqlite3`) — se agrega en el paso de esquema
- Auth admin con bcrypt + JWT — se agrega en el paso de auth
- Docker + docker compose

## Desarrollo

El código vive en este repo (`/server`). Flujo: editar local → `git push` → en el VPS `git pull` + `docker compose up -d --build`.

## Levantar en el VPS

```bash
cd /opt/loseucaliptos/server
cp .env.example .env        # y completar JWT_SECRET, etc.
docker compose up -d --build
curl -s localhost:3001/health
```

## Endpoints (estado actual)

| Método | Ruta       | Estado |
|--------|------------|--------|
| GET    | `/health`  | ✅ esqueleto |

Próximos: `/api/catalog`, `/api/featured` (públicos), CRUD admin (JWT), `/api/orders`, `/api/leads`, subida de imágenes.

## Datos persistentes (bind-mounts, no van al repo)

- `./data` → archivo SQLite
- `./uploads` → imágenes de productos (las sirve Nginx)
