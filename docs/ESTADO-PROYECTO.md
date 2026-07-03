# Estado del proyecto

Actualizado: 2026-07-03.

## Estado desplegado

La estabilizacion fue integrada a `main` y desplegada en produccion el
2026-07-03. Commit de aplicacion desplegado: `49263d6`.

Verificaciones realizadas:

- lint sin errores;
- 4 pruebas unitarias frontend;
- 8 pruebas de integracion backend en Node 22;
- 3 flujos E2E aprobados: storefront/checkout desktop, storefront/checkout
  375 px y guardado admin;
- build de produccion correcto;
- chunk principal de 266,67 kB minificado;
- auditorias npm de frontend y backend sin vulnerabilidades conocidas;
- workflow `quality` de GitHub finalizado en `success`;
- smoke test real de home, catalogo y login admin en desktop y 375 px.

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
- Nginx reproducible y deploy con publicacion/rollback de HTML.

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

- aplicacion desplegada desde `49263d6`;
- container API: healthy;
- migracion 1 aplicada;
- productos: 64 totales, 62 activos y 14 destacados;
- Nginx: CSP, HSTS, gzip y uploads directos activos;
- `/catalogo/` redirige a `/catalogo`;
- sitemap generado el dia del build;
- proxy geografico responde y asigna Solano correctamente;
- variables del VPS renombradas a `SEED_ADMIN_*`.

## Pendiente de operacion

1. Probar con credenciales reales el cambio de una fila y una imagen.
2. Implementar backups en una fase separada.

Backups no fueron modificados por decision explicita.
