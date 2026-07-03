# Estado del proyecto

Actualizado: 2026-07-03.

## Estado desplegado

Commit de aplicacion desplegado: `b6e77e2` (2026-07-03). Incluye la
estabilizacion previa mas: cache del catalogo publico con ETag/304, publicacion
diferida de imagenes, usuarios sin correo obligatorio con perfil editable,
orden de destacados desde el admin y SKUs descartables.

Verificaciones realizadas:

- lint sin errores;
- 4 pruebas unitarias frontend;
- 11 pruebas de integracion backend;
- 3 flujos E2E aprobados: storefront/checkout desktop, storefront/checkout
  375 px y guardado admin (incluye imagen diferida);
- build de produccion correcto;
- auditorias npm de frontend y backend sin vulnerabilidades conocidas;
- smoke test real de home, catalogo y login admin en desktop y 375 px;
- en produccion: `GET /api/catalog` condicional responde `304`, login con
  credenciales invalidas responde `401`, migraciones 1-3 aplicadas y los 3
  usuarios existentes conservaron su nombre de login tras la migracion;
- backup de DB, uploads y `.env` tomado antes de la migracion de usuarios
  (`/opt/backups/corralon/db-2026-07-03.sqlite`).

## Topologia actual

```text
Internet
  -> Nginx
     -> /, /catalogo       -> /opt/loseucaliptos/dist
     -> /assets            -> dist/assets
     -> /uploads           -> /opt/loseucaliptos/server/uploads
     -> /api               -> 127.0.0.1:3001
                                -> Express
                                -> SQLite WAL
                                -> Nominatim
```

| Recurso | Ubicacion |
|---|---|
| Repo local | `E:\Loseucaliptos2026` |
| Repo VPS | `/opt/loseucaliptos` |
| DB | `/opt/loseucaliptos/server/data/loseucaliptos.sqlite` |
| Uploads | `/opt/loseucaliptos/server/uploads` |
| Nginx versionado | `deploy/nginx-corralon.conf` |
| Nginx activo | `/etc/nginx/sites-available/corralon` |
| Deploy | `/opt/loseucaliptos/scripts/deploy.sh` |

## Cambios funcionales preparados

- catalogo publico como unica fuente runtime;
- destacados derivados de `products.featured`;
- quote de carrito antes del checkout;
- checkout de entrega en tres pasos con borrador de dos horas;
- proxy geografico con cache, timeout y limite global;
- admin con dirty tracking, bulk atomico y conflictos por version;
- vinculo explicito entre `raw_skus` y productos;
- imagenes binarias versionadas por hash;
- sesiones revocables por `token_version`;
- cambio de contrasena propia;
- rutas declarativas y admin lazy;
- modales accesibles, controles tactiles y reduced motion;
- prerender dependiente de API en produccion y sitemap automatico;
- Nginx reproducible y deploy con publicacion/rollback de HTML;
- cache en memoria del catalogo publico con ETag/304 e invalidacion al
  escribir desde el admin;
- imagenes y orden de destacados diferidos hasta `Guardar cambios`;
- usuarios con nombre de login propio, email opcional de recuperacion y
  flotante de datos (nombre, email, telefono);
- login por usuario o email;
- SKUs crudos descartables y restaurables.

## Datos

Una DB nueva queda validada con:

- 7 categorias;
- 14 productos destacados;
- admin creado desde `SEED_ADMIN_*`;
- migracion registrada en `schema_migrations`.

La DB viva sigue siendo la fuente de verdad. `server/seed-data` solo sirve para
bootstrap y no pisa ediciones administrativas.

Tablas legacy `featured`, `orders` y `leads`, y endpoints individuales
compatibles, se conservan hasta la segunda limpieza.

## Estado de produccion verificado

- aplicacion desplegada desde `b6e77e2`;
- container API: healthy;
- migraciones 1, 2 y 3 aplicadas (`schema_migrations`);
- usuarios migrados: `admin`, `pri` y `mel` conservan su login;
- productos: 64 totales, 62 activos y 14 destacados;
- Nginx: CSP, HSTS, gzip y uploads directos activos;
- `/catalogo/` redirige a `/catalogo`;
- sitemap generado el dia del build;
- proxy geografico responde y asigna Solano correctamente;
- variables del VPS renombradas a `SEED_ADMIN_*`.

## Pendiente de operacion

1. Probar con credenciales reales el flotante de datos de usuario y el orden
   de destacados desde el panel.
2. Cargar email de recuperacion a los usuarios existentes desde el flotante.
3. Copia de backups fuera del VPS (rsync/rclone) y cron diario de
   `scripts/backup.sh`. El backup manual pre-migracion ya existe en
   `/opt/backups/corralon`.
4. Fase 2 opcional: recuperacion de contrasena automatica por correo
   (requiere contratar/configurar SMTP y una pagina publica de reset).
5. Segunda limpieza: tablas legacy `featured`, `orders` y `leads`, y
   endpoints individuales compatibles.
