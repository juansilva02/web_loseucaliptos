# Estado del proyecto

Actualizado: 2026-07-03.

## Estado de esta rama

La estabilizacion esta implementada en `codex/estabilizacion-escalabilidad` y
verificada localmente. No se considera desplegada hasta mergear a `main` y
ejecutar `scripts/deploy.sh` en el VPS.

Verificaciones realizadas:

- lint sin errores;
- 4 pruebas unitarias frontend;
- 8 pruebas de integracion backend en Node 22;
- 3 flujos E2E aprobados: storefront/checkout desktop, storefront/checkout
  375 px y guardado admin;
- build de produccion correcto;
- chunk principal de 266,67 kB minificado;
- auditorias npm de frontend y backend sin vulnerabilidades conocidas.

## Topologia preparada

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

## Pendiente de operacion

1. Revisar el diff y mergear esta rama.
2. Renombrar `ADMIN_*` a `SEED_ADMIN_*` en el `.env` del VPS.
3. Ejecutar el deploy por fases.
4. Verificar login, upload real y checkout en produccion.
5. Implementar backups en una fase separada.

Backups no fueron modificados por decision explicita.
