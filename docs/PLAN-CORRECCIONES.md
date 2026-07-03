# Plan de correcciones - estado

Actualizado: 2026-07-03.

## Implementado en la rama

- [x] Config unica de sucursales, cobertura, WhatsApp y agenda.
- [x] Agenda de siete dias calendario sin domingos.
- [x] Checkout con borrador de sesion y quote de precios.
- [x] Proxy Nominatim con cache, timeout, cola y cancelacion cliente.
- [x] Migraciones, versiones, indices y `audit_log`.
- [x] Dirty tracking y bulk atomico de productos/categorias.
- [x] Vinculo/promocion segura de `raw_skus`.
- [x] Upload binario WebP con hash y limpieza.
- [x] `scrypt` asincrono, JWT 12h y revocacion por version.
- [x] Cambio de contrasena propia y password inputs protegidos.
- [x] Catalogo runtime unico y destacados derivados.
- [x] Lazy loading y chunk principal menor a 300 kB.
- [x] Accesibilidad de modales, carouseles y controles tactiles.
- [x] Nginx versionado, uploads directos y gzip.
- [x] Deploy aislado, assets acumulativos, rollback HTML y healthchecks.
- [x] Seed con 14 destacados.
- [x] Prerender con API obligatoria y sitemap automatico.
- [x] Limpieza de `catalogStore.js`, catalogo estatico y `vercel.json`.
- [x] CI con lint, pruebas, build y auditorias.

## Produccion

- [x] Merge controlado a `main`.
- [x] Validar duplicados actuales de `source_code`.
- [x] Renombrar variables del VPS a `SEED_ADMIN_*`.
- [x] Ejecutar `scripts/deploy.sh`.
- [x] Smoke test publico de catalogo, checkout y carga del login admin.
- [ ] Prueba manual autenticada de escritura e imagen con credenciales reales.

## Diferido

- [ ] Backups y prueba de restore.
- [ ] Eliminar tablas/endpoints legacy despues del backup.
- [ ] Persistencia real de pedidos fuera de WhatsApp.
- [ ] Observabilidad externa y alertas.

No usar `docker system prune`. El deploy solo ejecuta
`docker image prune -f`.
