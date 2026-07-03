# Auditoria tecnica - cierre de estabilizacion

Revision original: 2026-07-02. Estado actualizado: 2026-07-03.

## Resultado

La rama de estabilizacion resuelve los hallazgos de codigo, seguridad de borde,
checkout, admin, SEO y deploy. Backups permanece abierto por decision del
proyecto y no debe interpretarse como resuelto.

| Area | Estado | Resolucion |
|---|---|---|
| Catalogo duplicado | Resuelto | `/api/catalog` es fuente runtime; se elimino el catalogo JS de 1.700 filas |
| Destacados separados | Resuelto | se derivan de `products.featured`; endpoint legacy compatible |
| Precio desactualizado | Resuelto | `POST /api/catalog/quote` antes del checkout |
| Geocoding directo | Resuelto | proxy backend con cache, cola 1 req/s, timeout y limite |
| Agenda incorrecta | Resuelto | siete dias calendario desde manana, sin domingos |
| PII persistente | Resuelto | borrador en `sessionStorage`, TTL dos horas |
| Guardado admin completo | Resuelto | dirty tracking y bulk transaccional |
| Edicion concurrente | Resuelto | versiones y respuesta `409` sin escrituras parciales |
| SKUs duplicados | Resuelto | vinculo explicito, candidatos e indice unico parcial |
| Upload base64 | Resuelto | binario, WebP con hash y eliminacion post-commit |
| JWT prolongado | Resuelto | 12 horas configurable y `token_version` |
| Password sync | Resuelto | `scrypt` asincrono |
| Logging sensible | Resuelto | JSON con request ID, sin body |
| Sin migraciones | Resuelto | `schema_migrations` y migracion aditiva |
| Rutas manuales | Resuelto | React Router y canonicalizacion de `/catalogo/` |
| Bundle inicial | Resuelto | admin y overlays lazy; main 266,67 kB |
| Accesibilidad modal | Resuelto | foco, Escape, restauracion y scroll lock |
| SEO con fallback en prod | Resuelto | `PRERENDER_REQUIRE_API=1` |
| Sitemap fijo | Resuelto | generado con fecha de build |
| Headers/gzip/uploads | Resuelto | config Nginx versionada y aplicada en produccion |
| Deploy no atomico | Resuelto | build aislado, HTML atomico, verificacion y rollback |
| Backups | Diferido | fuera de alcance de esta fase |

## Seguridad residual

- SQLite sigue siendo una base de un solo nodo y un solo writer. Es adecuada
  para el volumen actual, pero no para multiples instancias de escritura.
- La cache y cola de geocodificacion viven en memoria. Con mas de una replica
  se necesitara Redis o un proveedor geografico con cuota propia.
- El checkout termina en WhatsApp y no crea un pedido durable en DB.
- Los roles son `admin` y `editor`; no existe autorizacion por sucursal.
- Las tablas y endpoints legacy siguen presentes hasta contar con backup y una
  ventana de limpieza segura.

## Arquitectura y escalabilidad

Fortalezas:

- mismo origen para frontend y API;
- catalogo unico y quote autoritativo;
- migraciones aditivas;
- concurrencia optimista en admin;
- uploads desacoplados del rate limiter de Express;
- CI con lint, unitarias, integracion, E2E, build y audit;
- deploy verificable con rollback del frontend.

Limites a vigilar:

- `GET /api/catalog` entrega el catalogo completo; incorporar paginacion o
  cache HTTP si crece de forma significativa;
- `AdminPage.jsx` sigue siendo grande aunque su persistencia ya es segura;
- no hay metricas, alertas externas ni agregador de logs;
- `audit_log` no tiene politica de retencion;
- el indice unico de `source_code` exige que produccion no tenga duplicados
  previos.

## SEO

El build genera:

- canonical para home y catalogo;
- JSON-LD Breadcrumb e ItemList;
- sitemap con `lastmod` de build;
- listado `noscript`;
- `Offer/InStock` solo para productos comprables.

El prerender de produccion falla si `/api/catalog` no responde, evitando
publicar HTML con datos distintos de la DB.

## Criterio de salida a produccion

Controles ejecutados antes del deploy:

1. confirmar que no existen `source_code` duplicados;
2. cambiar variables a `SEED_ADMIN_*`;
3. ejecutar CI completa;
4. revisar que el Nginx versionado no interfiera con otros sites del VPS.

Controles ejecutados despues del deploy:

1. `/health/ready`, `/api/catalog`, `/catalogo` y `sitemap.xml` en 200;
2. assets referenciados en 200;
3. home, catalogo y login admin cargan sin errores de navegador;
4. geocodificacion real asigna cobertura de Solano;
5. upload existente se sirve directo desde Nginx.

Queda pendiente una prueba manual autenticada de escritura e imagen con
credenciales operativas.
