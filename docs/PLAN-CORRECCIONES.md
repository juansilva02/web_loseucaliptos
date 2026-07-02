# Plan de correcciones — flujo de trabajo

Flujo ordenado desde el commit de documentacion hasta cerrar los hallazgos de
la [auditoria 2026-07-02](AUDITORIA-TECNICA-2026-07-02.md). Cada paso indica
donde se ejecuta (local/VPS), que commit genera y como se verifica.

Regla general del flujo:
1. un hallazgo (o grupo afin) = un commit
2. cambios de codigo se prueban local antes de pushear
3. deploy siempre igual: `git push` + `ssh loseucaliptus "bash /opt/loseucaliptos/scripts/deploy.sh"`
4. verificacion despues de cada deploy, no al final de todo

---

## Fase 0 — Commit de la documentacion (local, hoy)

- [ ] Commit unico con los `.md` actualizados y `.env.example`:
  `docs: auditoria 2026-07-02, informe de reconstruccion y estado verificado del VPS`
- [ ] Push a `main` (no requiere deploy: los docs no afectan el build)

## Fase 1 — Operacion urgente en el VPS (sin tocar codigo)

Ningun paso de esta fase requiere build ni redeploy de la app.

### 1.1 Backups (hallazgo 9 — critico)

- [ ] Crear `scripts/backup.sh` en el repo (version propuesta en
  [RECONSTRUCCION-ARQUITECTURA.md](RECONSTRUCCION-ARQUITECTURA.md) seccion 11)
  — commit: `feat: script de backup diario de DB, uploads y .env`
- [ ] Deploy (para que el script llegue al VPS) y crear el cron:
  `0 4 * * * bash /opt/loseucaliptos/scripts/backup.sh >> /var/log/corralon-backup.log 2>&1`
- [ ] Configurar copia externa (rclone/rsync hacia fuera del VPS)
- [ ] Verificar: correr el script a mano, confirmar que aparece
  `/opt/backups/corralon/db-<fecha>.sqlite` y **probar un restore** en local
  (abrir el .sqlite y contar productos)

### 1.2 Nginx: body size, headers y gzip (hallazgos 4, 11, 12)

- [ ] Versionar la config en el repo (`deploy/nginx-corralon.conf`) para que
  Nginx deje de ser estado no reproducible —
  commit: `feat: versiona config de Nginx del corralon`
- [ ] En el VPS, editar `/etc/nginx/sites-available/corralon`:
  - `client_max_body_size 12m;` en el server 443 del apex
  - headers: HSTS, `X-Content-Type-Options nosniff`,
    `X-Frame-Options SAMEORIGIN`, `Referrer-Policy`
- [ ] En `/etc/nginx/nginx.conf`: descomentar `gzip_types` (y `gzip_vary`)
- [ ] `nginx -t && systemctl reload nginx`
- [ ] Verificar:
  - `curl -I https://corralonloseucaliptus.com/` muestra los headers nuevos
  - `curl -H "Accept-Encoding: gzip" -I https://corralonloseucaliptus.com/assets/<bundle>.js`
    devuelve `content-encoding: gzip`
  - subir desde el admin una foto de ~3 MB y confirmar que ya no da 413

### 1.3 Env del VPS (hallazgo 10)

- [ ] En `/opt/loseucaliptos/server/.env`: renombrar `ADMIN_EMAIL` →
  `SEED_ADMIN_EMAIL` y `ADMIN_PASSWORD` → `SEED_ADMIN_PASSWORD`
- [ ] `docker compose up -d` (recrea el container con el env nuevo)
- [ ] Verificar: `/health` OK y login admin sigue funcionando

### 1.4 Disco (hallazgo 9)

- [ ] `docker system prune -f` (imagenes huerfanas de builds anteriores)
- [ ] Verificar: `df -h /` — objetivo quedar debajo de 70%

## Fase 2 — Seguridad backend (local → deploy)

### 2.1 Permisos de rutas (hallazgo 2)

- [ ] `GET /api/admin/auth/users` pasa a `requireAdmin`
- [ ] Rutas de escritura (products POST/PUT/DELETE, categories, raw-skus
  promote, upload) pasan a `requireAdmin`; las de lectura pueden quedar en
  `requireAuth`
- [ ] Probar local: login, CRUD completo desde el panel
- [ ] Commit: `fix(seguridad): requireAdmin en listado de usuarios y rutas de escritura`
- [ ] Deploy + verificar CRUD en produccion

### 2.2 Reset de contrasena por admin (hallazgo 3)

- [ ] Nuevo endpoint `PUT /api/admin/auth/users/:id/reset-password`
  (`requireAdmin`, sin `currentPassword`, prohibido sobre uno mismo) y UI
  minima en la pestana Usuarios
- [ ] El endpoint viejo queda para cambio de la propia contrasena
- [ ] Commit: `feat: reset de contrasena por admin sin clave actual`
- [ ] Deploy + verificar reseteando la clave de un usuario de prueba

### 2.3 Higiene menor (hallazgo 13 + logging)

- [ ] Arreglar escape de `LIKE` (agregar `ESCAPE '\'` en products.js y
  escapar tambien en raw-skus.js)
- [ ] Agregar logging de requests (morgan `combined` o formato corto) para
  trazabilidad del panel
- [ ] Commit: `fix: escape de LIKE y logging de requests`
- [ ] Deploy + verificar: buscar `%` en el admin devuelve vacio (no todo),
  `docker compose logs api` muestra requests

## Fase 3 — Admin frontend (local → deploy)

### 3.1 "Quitar" producto honesto (hallazgo 14)

- [ ] `removeProduct` deja de filtrar estado local: pasa a llamar
  `deactivateProduct` (o se elimina el boton y queda solo activar/desactivar)
- [ ] Commit: `fix: quitar producto desactiva en DB en vez de ocultar local`

### 3.2 Guardado por fila / dirty tracking (hallazgo 7)

- [ ] Trackear filas modificadas (comparar contra snapshot al cargar) y que
  `saveProducts` solo envie las cambiadas
- [ ] Opcional siguiente: endpoint `PUT /api/admin/products/bulk` transaccional
- [ ] Commit: `feat: guardado admin solo de filas modificadas`
- [ ] Verificar: editar 2 productos de 64 y confirmar en el log del backend
  que solo salen 2 PUT

### 3.3 Limpieza de legacy (hallazgo 15)

- [ ] Borrar el modelo export/JSON de `catalogStore.js` (mover `slugify` a
  `src/lib/`), borrar comentarios Vercel en `api.js`
- [ ] Dejar de seedear la tabla `featured` (y documentar que la tabla queda
  muerta hasta un DROP futuro)
- [ ] Commit: `chore: elimina codigo legacy del modelo export/Vercel`
- [ ] Deploy de fases 3.1-3.3 juntas si se prefiere; verificar panel completo

## Fase 4 — Datos y SEO (local → deploy)

### 4.1 Prerender con fuente unica (hallazgo 5)

- [ ] `scripts/prerender.mjs`: si la API no responde, **fallar el build** en el
  VPS (env `PRERENDER_REQUIRE_API=1` que setea deploy.sh) en vez de caer al
  JSON estatico; el fallback queda solo para dev local
- [ ] Commit: `fix(seo): prerender exige API viva en deploy`

### 4.2 Sitemap automatico (hallazgo SEO)

- [ ] Generar `sitemap.xml` en el build con `lastmod` real (fecha de build)
- [ ] Commit: `feat(seo): sitemap generado en build`
- [ ] Deploy + verificar `curl https://corralonloseucaliptus.com/sitemap.xml`

### 4.3 Huerfanos de uploads (hallazgo 8)

- [ ] Al quitar imagen desde admin, borrar el archivo si esta bajo `/uploads/`
  (endpoint `DELETE /api/admin/upload/:fileName` con sanitizacion existente)
- [ ] Commit: `fix: elimina archivo de upload al quitar imagen`

### 4.4 Decision sobre el seed (hallazgo 1)

No es un fix de codigo sino una decision. Opciones:
- A) declarar la DB como unica fuente de verdad y degradar `seed-data/` a
  "bootstrap historico" (solo documentacion — barato, recomendado)
- B) construir reconciliacion explicita seed→DB con reglas de conflicto (caro)
- [ ] Decidir, documentar en ESTADO-PROYECTO.md y cerrar el hallazgo

## Fase 5 — Cierre

- [ ] Actualizar ESTADO-PROYECTO.md y AUDITORIA (marcar hallazgos resueltos)
- [ ] Commit: `docs: estado post-correcciones`
- [ ] Backup manual extra post-cambios y verificacion final completa
  (seccion 10 del informe de reconstruccion)

## Orden y dependencias

```text
Fase 0 (docs) ──> Fase 1 (VPS: backup PRIMERO, despues todo lo demas)
                     └─> Fase 2 (seguridad) ─> Fase 3 (admin) ─> Fase 4 (SEO/datos) ─> Fase 5
```

La unica dependencia dura: **backups antes que cualquier otro cambio** — todo
lo demas modifica el sistema y hoy no hay red de seguridad. Dentro de cada
fase los pasos son independientes entre si.
