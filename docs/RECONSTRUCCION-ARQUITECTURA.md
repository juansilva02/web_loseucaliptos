# Reconstruccion de arquitectura

Informe detallado para reconstruir el sistema completo desde cero. Basado en
una verificacion en vivo del VPS real (2026-07-02): configuracion de Nginx,
`.env`, cron, Docker y DB fueron leidos del servidor, no supuestos.

## 1. Objetivo final

Resultado esperado:
- dominio `corralonloseucaliptus.com` respondiendo por HTTPS
- frontend React servido por Nginx desde `dist/`
- backend Express en Docker sobre `127.0.0.1:3001`
- DB SQLite persistente (modo WAL)
- uploads persistentes
- deploy reproducible por script

## 2. Mapa completo de piezas

```text
Internet
  -> DNS Hostinger: A @ y www -> IP del VPS
    -> Nginx (VPS Debian 12)
      -> 80  -> redirect 301 a https (+ /.well-known/acme-challenge)
      -> 443 www -> redirect 301 al apex
      -> 443 apex
        -> /            -> /opt/loseucaliptos/dist (estatico, SPA fallback)
        -> /catalogo    -> dist/catalogo/index.html (prerender SEO)
        -> /assets/     -> cache 1y immutable
        -> /api/*       -> proxy 127.0.0.1:3001 (Express en Docker)
        -> /uploads/*   -> proxy 127.0.0.1:3001 (express.static)
```

| Recurso | Ubicacion en el VPS |
|---|---|
| Repo | `/opt/loseucaliptos` (clon de github.com/juansilva02/web_loseucaliptos) |
| Frontend build | `/opt/loseucaliptos/dist` |
| Backend | `/opt/loseucaliptos/server` (Docker Compose, container `loseucaliptos-api`) |
| DB | `/opt/loseucaliptos/server/data/loseucaliptos.sqlite` (+ `-wal`, `-shm`) |
| Uploads | `/opt/loseucaliptos/server/uploads/` |
| Env backend | `/opt/loseucaliptos/server/.env` |
| Nginx site | `/etc/nginx/sites-available/corralon` -> symlink en `sites-enabled` |
| Certificados | `/etc/nginx/ssl/corralon/fullchain.cer` y `private.key` |
| TLS renovacion | cron de `acme.sh` en root (`~/.acme.sh`) |
| Deploy | `/opt/loseucaliptos/scripts/deploy.sh` |

Advertencia: el VPS es compartido. Nginx tambien sirve `n8n`, `chatwoot` y
`acme`; Docker corre ademas portainer y tailscale. No pisar esos sites ni
asumir que el VPS es exclusivo del corralon.

## 3. Que reconstruye el repo y que NO

El repo reconstruye:
- el codigo de frontend y backend
- el esquema de la DB (`server/src/schema.sql`, idempotente)
- un estado inicial de datos via seed (`server/seed-data/*.json`)
- el script de deploy

El repo NO reconstruye (hay que restaurar de backup):
- la DB viva (`loseucaliptos.sqlite`): usuarios, ediciones del admin,
  promociones de raw_skus, destacados actuales
- `server/uploads/` (imagenes subidas desde el panel)
- `server/.env` (secretos)
- la config de Nginx y los certificados TLS
- el cron de `acme.sh`

El seed usa `INSERT OR IGNORE`: sirve para bootstrap de una DB vacia, pero
nunca re-alinea una DB existente con el repo. Reconstruir "solo con el repo"
significa volver al estado seed, no al estado vivo.

## 4. Orden recomendado

1. provisionar VPS y paquetes base
2. DNS: apuntar `@` y `www` al VPS en Hostinger
3. clonar repo en `/opt/loseucaliptos`
4. crear `server/.env` (ver seccion 6 — cuidado con los nombres de variables)
5. levantar backend + seed (o restaurar DB de backup)
6. buildar frontend
7. configurar Nginx + TLS
8. validar todo (seccion 10)
9. configurar backups y cron (seccion 11)

## 5. Provision del VPS

Debian 12. Paquetes:

```bash
apt-get update
apt-get install -y git curl nginx docker.io docker-compose-plugin nodejs npm
systemctl enable --now docker nginx
```

Node en el host se usa solo para el build del frontend; el backend usa el Node
de la imagen Docker (node:22-bookworm-slim). Verificar que el Node del host
sea >= 20 para Vite.

Dimensionamiento: el VPS actual tiene 19 GB de disco y esta al 78% (el peso es
de las imagenes Docker de todos los servicios, no del corralon: DB ~800 KB).
Para un VPS dedicado alcanza con 20 GB; si es compartido, planificar mas.

## 6. Backend

### 6.1 `.env`

Crear `/opt/loseucaliptos/server/.env`:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<secreto largo aleatorio, ej: openssl rand -base64 48>
CORS_ORIGINS=https://corralonloseucaliptus.com
SEED_ADMIN_EMAIL=<email del primer admin>
SEED_ADMIN_PASSWORD=<clave inicial fuerte>
# opcional, reservado para integraciones
N8N_WEBHOOK_URL=
```

**Trampa conocida (verificada):** el `.env` del VPS actual usa `ADMIN_EMAIL` y
`ADMIN_PASSWORD`, pero `server/src/seed.js` lee `SEED_ADMIN_EMAIL` y
`SEED_ADMIN_PASSWORD`. Con los nombres viejos el seed NO crea el usuario admin
y el panel queda inaccesible. En una reconstruccion usar siempre los nombres
`SEED_ADMIN_*` (o corregir el `.env` copiado del backup).

Comportamiento de `JWT_SECRET`: en `NODE_ENV=production` el backend se niega a
arrancar sin el; en dev usa un fallback inseguro con warning.

### 6.2 Primer arranque

```bash
mkdir -p /opt/loseucaliptos/server/data /opt/loseucaliptos/server/uploads
# CRITICO: el container corre como uid 1001; los bind mounts deben pertenecerle
# o SQLite queda en solo lectura y el admin no puede guardar (regresion real
# sufrida el 2026-07-01)
chown -R 1001:1001 /opt/loseucaliptos/server/data /opt/loseucaliptos/server/uploads
cd /opt/loseucaliptos/server
docker compose up -d --build
docker compose exec api node src/seed.js
curl -s http://127.0.0.1:3001/health
```

Notas de la infraestructura Docker (tal como esta versionada):
- `docker-compose.yml` publica `127.0.0.1:3001:3001` (nunca expuesto a
  internet) y monta `./data` y `./uploads` como bind mounts
- el Dockerfile es multi-stage (compila `better-sqlite3` con python3/make/g++
  en la etapa build) y corre como usuario no root `appuser` (uid 1001)
- `extra_hosts: host.docker.internal:host-gateway` permite alcanzar servicios
  del host (n8n) si hiciera falta

El seed crea: 7 categorias, ~64 productos, 1749 `raw_skus`, la tabla `featured`
legacy (no la lee ninguna ruta; el home usa `products.featured=1`) y el usuario
admin si no existe ninguno.

### 6.3 Restaurar estado vivo (si hay backup)

Con el container detenido:

```bash
cd /opt/loseucaliptos/server
docker compose down
# restaurar el archivo de DB (si el backup se hizo con sqlite3 .backup alcanza
# con el .sqlite; si fue copia en frio, incluir -wal y -shm si existen)
cp /ruta/backup/loseucaliptos.sqlite data/
rsync -a /ruta/backup/uploads/ uploads/
docker compose up -d
```

Si se restaura DB de backup, no hace falta correr el seed.

## 7. Frontend

```bash
cd /opt/loseucaliptos
npm install --no-audit --no-fund
npm run build
chmod -R a+rX dist
```

El build corre Vite y despues `scripts/prerender.mjs`, que genera
`dist/catalogo/index.html` con title/canonical propios, JSON-LD (ItemList +
BreadcrumbList) y listado `<noscript>`.

**Importante:** el prerender intenta leer `http://127.0.0.1:3001/api/catalog`;
si la API no esta levantada cae al JSON estatico del repo (que puede estar
desactualizado respecto de la DB). Por eso el orden correcto es: backend
primero, frontend despues. El deploy script ya respeta ese orden solo en
re-deploys (buildea frontend antes de rebuildear backend, pero el backend viejo
sigue corriendo y sirve la API durante el build).

## 8. Nginx

Config real del VPS (`/etc/nginx/sites-available/corralon`), con las dos
mejoras pendientes marcadas:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name corralonloseucaliptus.com www.corralonloseucaliptus.com;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://corralonloseucaliptus.com$request_uri; }
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.corralonloseucaliptus.com;
    ssl_certificate /etc/nginx/ssl/corralon/fullchain.cer;
    ssl_certificate_key /etc/nginx/ssl/corralon/private.key;
    return 301 https://corralonloseucaliptus.com$request_uri;
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name corralonloseucaliptus.com;
    ssl_certificate /etc/nginx/ssl/corralon/fullchain.cer;
    ssl_certificate_key /etc/nginx/ssl/corralon/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /opt/loseucaliptos/dist;
    index index.html;

    # PENDIENTE (recomendado): headers de seguridad para el HTML estatico
    # add_header Strict-Transport-Security "max-age=31536000" always;
    # add_header X-Content-Type-Options nosniff always;
    # add_header X-Frame-Options SAMEORIGIN always;
    # add_header Referrer-Policy strict-origin-when-cross-origin always;

    # PENDIENTE (necesario para subir fotos reales desde el admin):
    # client_max_body_size 12m;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
    }
    location = /catalogo {
        try_files /catalogo/index.html /index.html;
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Activar:

```bash
ln -s /etc/nginx/sites-available/corralon /etc/nginx/sites-enabled/corralon
nginx -t && systemctl reload nginx
```

Detalles que importan:
- `trust proxy = 1` en Express asume exactamente un proxy adelante; los headers
  `X-Forwarded-*` de esta config son los que hacen funcionar el rate limiting
  por IP real
- el `location = /catalogo` es lo que hace visible el prerender SEO; sin el,
  `/catalogo` caeria al shell SPA vacio
- en `nginx.conf` global: `gzip on` esta activo pero `gzip_types` comentado
  (pendiente: descomentarlo para comprimir JS/CSS)
- `/uploads/` podria servirse directo del disco con un `alias` en vez de pasar
  por Express (mejora menor de performance)

## 9. TLS

Hoy: `acme.sh` en root, con cron diario de renovacion (`crontab -l` de root).
Los certificados se instalan en `/etc/nginx/ssl/corralon/`.

Para reconstruir:

```bash
curl https://get.acme.sh | sh -s email=<email>
~/.acme.sh/acme.sh --issue -d corralonloseucaliptus.com -d www.corralonloseucaliptus.com \
  -w /var/www/html
mkdir -p /etc/nginx/ssl/corralon
~/.acme.sh/acme.sh --install-cert -d corralonloseucaliptus.com \
  --fullchain-file /etc/nginx/ssl/corralon/fullchain.cer \
  --key-file /etc/nginx/ssl/corralon/private.key \
  --reloadcmd "systemctl reload nginx"
```

(El modo webroot usa el `location /.well-known/acme-challenge/` del server de
puerto 80, que ya esta en la config.)

## 10. Verificaciones finales

```bash
# backend
curl -s http://127.0.0.1:3001/health
curl -s http://127.0.0.1:3001/api/catalog | head -c 300
cd /opt/loseucaliptos/server && docker compose ps && docker compose logs --tail=50 api

# borde
curl -I https://corralonloseucaliptus.com
curl -I https://corralonloseucaliptus.com/api/catalog
curl -s https://corralonloseucaliptus.com/catalogo | grep -c "application/ld+json"

# datos (conteos esperados en una restauracion completa: 7 categorias,
# 64 productos / 62 activos, 1749 raw_skus, 3 usuarios)
docker compose exec -T api node -e "
const db=require('better-sqlite3')('/app/data/loseucaliptos.sqlite');
['categories','products','raw_skus','users'].forEach(t=>
  console.log(t, db.prepare('SELECT COUNT(*) n FROM '+t).get().n))"

# admin end-to-end: login en /#admin y guardar un cambio trivial
```

## 11. Deploy y operacion continua

Deploy normal (desde la maquina local):

```bash
git push origin main
ssh loseucaliptus "bash /opt/loseucaliptos/scripts/deploy.sh"
```

El script (versionado en `scripts/deploy.sh`): fetch + `reset --hard
origin/main`, build de frontend, `docker compose up -d --build`, `nginx -t &&
reload`, y verifica `/` y `/api/catalog` por loopback con `--resolve`.

### Backups (pendiente critico — hoy no existe ninguno)

Minimo aceptable, cron diario en el VPS:

```bash
#!/usr/bin/env bash
# /opt/loseucaliptos/scripts/backup.sh (propuesto)
set -euo pipefail
STAMP=$(date +%F)
DEST=/opt/backups/corralon
mkdir -p "$DEST"
# backup consistente de SQLite en caliente (WAL-safe)
docker compose -f /opt/loseucaliptos/server/docker-compose.yml exec -T api \
  node -e "require('better-sqlite3')('/app/data/loseucaliptos.sqlite').backup('/app/data/backup-tmp.sqlite')"
mv /opt/loseucaliptos/server/data/backup-tmp.sqlite "$DEST/db-$STAMP.sqlite"
tar czf "$DEST/uploads-$STAMP.tgz" -C /opt/loseucaliptos/server uploads
cp /opt/loseucaliptos/server/.env "$DEST/env-$STAMP"
# retencion 14 dias
find "$DEST" -mtime +14 -delete
```

y una copia **fuera del VPS** (rsync/rclone a otra maquina o storage). Sin
copia externa, un fallo de disco pierde todo igual. Probar el restore al menos
una vez (seccion 6.3).

Vigilancia minima:
- espacio en disco (hoy 78% usado; `docker system prune` periodico ayuda)
- `docker compose ps` / `curl /health` (se puede automatizar con n8n, que ya
  corre en el mismo VPS)

## 12. Puntos a no olvidar

- el repo por si solo NO reconstruye el estado vivo: DB, uploads, `.env`,
  Nginx y certificados vienen de backup o se recrean a mano
- usar `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` en el `.env` (el `.env` viejo
  del VPS tiene otros nombres y el seed los ignora)
- levantar el backend ANTES de buildar el frontend para que el prerender de
  `/catalogo` salga de la DB real y no del JSON estatico
- el seed es `INSERT OR IGNORE`: no pisa ni reconcilia una DB existente
- el admin escribe directo en la DB del VPS; no hay export a JSON
- agregar `client_max_body_size 12m;` al site de Nginx o las fotos del admin
  van a fallar con 413
- el VPS es compartido (n8n, chatwoot, portainer): cuidado con Nginx, puertos
  y espacio en disco
