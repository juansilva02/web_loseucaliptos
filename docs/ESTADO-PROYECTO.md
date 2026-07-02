# Estado del proyecto — Corralón Los Eucaliptus

> Referencia viva. Última actualización: 2026-07-01.

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
  - `A @ → 190.104.252.7`, `CNAME www → corralonloseucaliptus.com`.
  - El email (MX/SPF/DKIM/DMARC de Hostinger) **no se toca**.
- **VPS:** `190.104.252.7`, Debian 12. SSH alias local `loseucaliptus`.
- **TLS:** emitido con **acme.sh** (Let's Encrypt). Cert en `/etc/nginx/ssl/corralon/`. Auto-renueva y recarga Nginx solo.

## 2. Configuración — para hacer una actualización

**Flujo de update:** editás local → `git push` → en el VPS corrés el deploy.

```bash
ssh loseucaliptus "bash /opt/loseucaliptos/scripts/deploy.sh"
```

| Qué | Dónde |
|---|---|
| Repo (GitHub) | https://github.com/juansilva02/web_loseucaliptos (rama `main`) |
| Repo en el VPS | `/opt/loseucaliptos` |
| Frontend (código) | `src/` (React + Vite). Build → `dist/` (lo sirve Nginx) |
| Backend (código) | `server/` (Express + SQLite, en Docker) |
| Nginx site | `/etc/nginx/sites-available/corralon` |
| Cert TLS | `/etc/nginx/ssl/corralon/` (acme.sh) |
| Script de deploy | `scripts/deploy.sh` |
| Backup del backend | rama `backend-vps-backup` en GitHub |

**Backend (container `loseucaliptos-api`):**
- Definido en `server/docker-compose.yml` + `server/Dockerfile`. Escucha en `127.0.0.1:3001`.
- DB SQLite: `server/data/loseucaliptos.sqlite` (bind-mount, persistente, NO en git).
- Imágenes subidas: `server/uploads/` (bind-mount, NO en git).
- Variables: `server/.env` (NO en git). Claves: `JWT_SECRET`, `CORS_ORIGINS`, `PORT=3001`,
  `N8N_WEBHOOK_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- Stack: `better-sqlite3`, auth JWT propia con `node:crypto` (`server/src/auth.js`), `sharp` para imágenes.
- Comandos útiles (en `server/`): `docker compose up -d --build`, `docker compose logs -f`,
  `docker compose exec api node src/seed.js` (re-seed idempotente).

**Datos:** 64 productos curados (catálogo vivo) · 1749 SKUs crudos (pileta `raw_skus`,
curados y versionados en `server/seed-data/raw-catalog.json`) · 7 categorías
(se agregó `otros-materiales`).

## 3. Cómo funciona el panel admin

- **Acceso:** `https://corralonloseucaliptus.com/#admin` (ruta por hash).
- **Login:** usuario y contraseña definidos por `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
  (variables de entorno). Rate limit: 20 intentos cada 15 minutos.
- **Frontend admin:** `src/admin/` (`AdminPage.jsx`, `api.js`). `api.js` pega a `/api` relativo (mismo origen).
- **Roles:** existe el campo `role` en la tabla `users`. Solo usuarios con `role='admin'`
  pueden crear otros usuarios. El middleware `requireAdmin` verifica esto.
- **Endpoints (backend, protegidos con JWT salvo login):**
  - `POST /api/admin/auth/login` → devuelve token. `GET /api/admin/auth/me`.
  - `GET/POST/PUT /api/admin/products` → CRUD del catálogo.
  - `POST /api/admin/products/:id/deactivate` y `.../activate` → soft delete/reactivar.
  - `GET /api/admin/raw-skus?search=` → pileta de SKUs para agregar.
  - `POST /api/admin/raw-skus/:code/promote` → promover SKU a producto (valida que la categoría exista).
  - `GET/POST/PUT/DELETE /api/admin/categories` → CRUD de categorías.
  - `POST /api/admin/upload` → subir imagen (solo webp/jpg/png, sanitiza path, convierte a WebP).
  - `PUT /api/admin/auth/users/:id/password` → cambiar contraseña.
- **Público:** `GET /api/catalog` (categorías + productos activos), `GET /api/featured` (destacados).
- **Imágenes:** resolución en cadena: 1) image_url de la DB, 2) asset bundleado por ID, 3) asset bundleado
  por nombre, 4) fallback texto.

## 4. Seguridad implementada

| Medida | Detalle |
|---|---|
| Path traversal en uploads | `sanitizeFileName()` elimina `../` y solo permite `[\w.\-]+` |
| Solo imágenes en upload | Se rechazan formatos no soportados; sharp procesa todo |
| Error details ocultos | No se expone `err.message` al cliente |
| Rate limit en login | 20 intentos / 15 min por IP |
| Rate limit global | 500 req / 15 min |
| CORS restrictivo | En producción requiere `CORS_ORIGINS` configurado |
| JWT_SECRET | Falla en producción si no está configurado |
| Token revocado si user eliminado | `requireAuth` verifica existencia en DB |
| Creación de usuarios | Solo usuarios con `role='admin'` |
| Cambio de contraseña | Endpoint protegido, requiere contraseña actual |
| Contenedor no-root | Docker corre como `appuser` (uid 1001) |
| LIKE wildcards escapados | Búsquedas escapan `%` y `_` |
| Validación de parámetros | `req.params.code` validado como entero positivo |

## 5. Pasos restantes — automatización con n8n

1. **Backend (falta):** crear `POST /api/orders` y `POST /api/leads` que:
   - guarden en las tablas `orders` / `leads` (ya existen en el esquema),
   - disparen un webhook a n8n, best-effort (no bloquear la respuesta).
2. **n8n:** crear un workflow con nodo **Webhook** (trigger) → copiar la URL →
   ponerla en `server/.env` como `N8N_WEBHOOK_URL` → conectar un nodo de **WhatsApp**
   para mandar el mensaje automático.
3. **Frontend (falta):** que el carrito (al "Enviar pedido") y el verificador de
   cobertura (lead) hagan el `POST` además del WhatsApp actual.
4. **Probar** end-to-end: pedido en la web → guardado en DB → n8n recibe → WhatsApp sale.

## 6. Mejoras a futuro

- Dashboard de orders/leads cuando esté la automatización.
- Edición inline de precio/stock; acciones masivas (actualizar precios por %).
- Unificar las dos fuentes de categorías (`featured-catalog.json` vs `lib/catalog.js`).
- Google Business Profile de las 2 sucursales.
- Backup automático del `.sqlite` (cron).
- Inferir categoría desde el nombre del producto en raw SKUs (fallback cuando el rubro está vacío).
