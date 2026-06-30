# Estado del proyecto — Corralón Los Eucaliptus

> Referencia viva. Última actualización: 2026-06-30. Commit de referencia: `dc2ef78`.

## 1. Arquitectura — dónde apunta cada cosa

**TODO corre en el VPS** (no hay Vercel). Frontend + backend bajo el mismo dominio, con Nginx adelante.

```
Usuario → https://corralonloseucaliptus.com  (DNS A → 190.104.252.7)
            │
          NGINX (en el VPS)
            ├── /            → frontend estático  /opt/loseucaliptos/dist  (SPA, fallback index.html)
            ├── /api/*       → proxy → backend container 127.0.0.1:3001
            └── /uploads/*   → proxy → backend container (imágenes subidas)
```

- **Dominio:** `corralonloseucaliptus.com` (registrado en **Hostinger**, DNS en Hostinger).
  - `A @ → 190.104.252.7`, `CNAME www → corralonloseucaliptus.com`. Existe `A api → 190.104.252.7` pero **no se usa** (la API va en `/api` del mismo dominio).
  - El email (MX/SPF/DKIM/DMARC de Hostinger) **no se toca**.
- **VPS:** `190.104.252.7`, Debian 12. SSH alias local `loseucaliptus` (user root, clave `~/.ssh/id_ed25519`). Otros servicios en Docker: n8n (`:5678`), n8n-postgres, portainer (`:9443`), tailscale.
- **TLS:** emitido con **acme.sh** (Let's Encrypt). Cert en `/etc/nginx/ssl/corralon/`. Auto-renueva y recarga Nginx solo.

## 2. Configuración — para hacer una actualización

**Flujo de update:** editás local → `git push` → en el VPS corrés el deploy.

```bash
# En el VPS (un comando hace todo: pull + build front + docker backend + reload nginx):
ssh loseucaliptus "bash /opt/loseucaliptos/scripts/deploy.sh"
```

| Qué | Dónde |
|---|---|
| Repo (GitHub) | https://github.com/juansilva02/web_loseucaliptos (rama `main`) |
| Repo en el VPS | `/opt/loseucaliptos` |
| Frontend (código) | `src/` (React + Vite). Build → `dist/` (lo sirve Nginx) |
| Backend (código) | `server/` (Express + SQLite, en Docker) |
| Nginx site | `/etc/nginx/sites-available/corralon` (+ `acme`, `n8n`) |
| Cert TLS | `/etc/nginx/ssl/corralon/` (acme.sh) |
| Script de deploy | `scripts/deploy.sh` |
| Backup del backend | rama `backend-vps-backup` en GitHub |

**Backend (container `loseucaliptos-api`):**
- Definido en `server/docker-compose.yml` + `server/Dockerfile`. Escucha en `127.0.0.1:3001`.
- DB SQLite: `server/data/loseucaliptos.sqlite` (bind-mount, persistente, NO en git).
- Imágenes subidas: `server/uploads/` (bind-mount, NO en git).
- Variables: `server/.env` (NO en git). Claves: `JWT_SECRET`, `CORS_ORIGINS`, `PORT=3001`, `N8N_WEBHOOK_URL`.
- Stack: `better-sqlite3`, auth JWT propia con `node:crypto` (`server/src/auth.js`), `sharp` para imágenes.
- Comandos útiles (en `server/`): `docker compose up -d --build`, `docker compose logs -f`, `docker compose exec api node src/seed.js` (re-seed idempotente).

**Datos:** 64 productos curados (catálogo vivo) · 1756 SKUs crudos (pileta `raw_skus`, para agregar desde el admin) · 6 categorías.

## 3. Cómo funciona el panel admin

- **Acceso:** `https://corralonloseucaliptus.com/#admin` (ruta por hash).
- **Login:** usuario `admin`, contraseña `eucaliptus2026` (creada por el seed). ⚠️ **Cambiarla** — está en el historial del chat.
- **Frontend admin:** `src/admin/` (`AdminPage.jsx`, `api.js`). `api.js` pega a `/api` relativo (mismo origen).
- **Endpoints (backend, protegidos con JWT salvo login):**
  - `POST /api/admin/auth/login` → devuelve token. `GET /api/admin/auth/me`.
  - `GET/POST/PUT/DELETE /api/admin/products` → CRUD del catálogo. DELETE es **soft** (marca `active=0`).
  - `GET /api/admin/raw-skus?search=` → pileta de SKUs para agregar.
  - `/api/admin/categories`, `/api/admin/upload` (imágenes, con sharp).
- **Público:** `GET /api/catalog` (categorías + productos activos) → lo consume el storefront.
- **Flujo:** agregás/editás/borrás productos en el admin → se reflejan en `/api/catalog` → el catálogo de la web los muestra (cutover ya hecho).

## 4. Pasos restantes — automatización con n8n (tarea #5)

1. **Backend (falta):** crear `POST /api/orders` y `POST /api/leads` que:
   - guarden en las tablas `orders` / `leads` (ya existen en el esquema),
   - disparen un webhook a n8n (`http://host.docker.internal:5678/webhook/...`), best-effort (no bloquear la respuesta).
2. **n8n (vos):** crear un workflow con nodo **Webhook** (trigger) → copiar la URL → ponerla en `server/.env` como `N8N_WEBHOOK_URL` → conectar un nodo de **WhatsApp** (WhatsApp Business Cloud API, Evolution API o Twilio) para mandar el mensaje automático.
3. **Frontend (falta):** que el carrito (al "Enviar pedido") y el verificador de cobertura (lead) hagan el `POST` además del WhatsApp actual.
4. **Probar** end-to-end: pedido en la web → guardado en DB → n8n recibe → WhatsApp sale.

## 5. Mejoras a futuro

**Admin / seguridad:**
- Cambiar la contraseña admin (y idealmente usar email real en vez de `admin`).
- Aplicar el lote de accesibilidad del storefront al admin (foco visible, targets 44px, contraste).
- Edición inline de precio/stock; acciones masivas (actualizar precios por % a varios productos).
- Toggle "destacado" para elegir qué va al home (hoy `featured=0` en todos → `/api/featured` vacío).
- Verificar la subida de imágenes con compresión WebP (sharp) end-to-end.
- Dashboard de orders/leads cuando esté la automatización.

**Storefront / negocio:**
- Cutover de los "destacados" del home a la API (hoy siguen leyendo del JSON estático).
- Cargar precios reales a los productos "A consultar" desde el admin.
- Unificar las dos fuentes de categorías (`featured-catalog.json` vs `lib/catalog.js`).
- Google Business Profile de las 2 sucursales (lo que más mueve el ranking local).
- Backup automático del `.sqlite` (cron).
