# Panel de administración del catálogo

Sección privada para cambiar precios, agregar/editar/borrar productos, elegir
destacados y subir imágenes — **en vivo, sin tocar código ni redeployar**.

Los cambios se guardan en la base de datos del backend (SQLite en el VPS) y se
reflejan en la web al instante (el catálogo y los destacados leen de la API).

## Cómo entrar

- Agregá `#admin` a la URL: `https://corralonloseucaliptus.com/#admin`
- Login por **usuario + contraseña** (validado en el servidor, JWT).

### Credenciales por defecto

| Usuario | Contraseña |
|---------|------------|
| `admin` | `eucaliptus2026` |

> ⚠️ **Cambialas** (quedaron en historial). Ver "Cambiar la contraseña" más abajo.

## Qué se puede hacer

- **Catálogo:** agregar, editar (nombre, marca, categoría, unidad, precio, imagen)
  y **borrar** productos. El borrado es *soft* (el producto se desactiva, no se
  pierde el dato). Precio vacío / 0 → se muestra como "A consultar".
- **Agregar desde la pileta:** hay 1756 SKUs del Excel disponibles para sumar al
  catálogo desde una búsqueda; al agregarlos pasan a ser productos del sitio.
- **Destacados (home):** marcar/desmarcar productos como `featured`. Lo marcado
  aparece en la grilla de "Productos destacados" del home (vía `/api/featured`).
  Inicialmente están destacados los productos con precio.
- **Imágenes:** subir por producto; el backend las comprime a WebP (`sharp`) y las
  sirve desde `/uploads/`.

## Cómo funciona por detrás

| Acción | Endpoint |
|---|---|
| Login | `POST /api/admin/auth/login` |
| Listar/crear/editar/borrar producto | `GET/POST/PUT/DELETE /api/admin/products` |
| Pileta de SKUs | `GET /api/admin/raw-skus?search=` |
| Categorías | `/api/admin/categories` |
| Subir imagen | `/api/admin/upload` |
| (Público) catálogo / destacados | `GET /api/catalog`, `GET /api/featured` |

Todo lo de `/api/admin/*` requiere el token JWT del login.

## Cambiar la contraseña

La contraseña vive hasheada (scrypt) en la tabla `users` del backend. Para
cambiarla, en el VPS:

```bash
cd /opt/loseucaliptos/server
docker compose exec api node -e "import('./src/auth.js').then(async a=>{const {db}=await import('./src/db.js');db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(a.hashPassword('NUEVA_CLAVE'),'admin');console.log('contraseña actualizada');process.exit(0)})"
```

## Seguridad

Auth real de servidor: contraseña con **scrypt** + login que emite **JWT** (7 días).
Las rutas de administración están protegidas; sin token válido devuelven 401.
El panel `#admin` no aparece en la navegación del sitio.
