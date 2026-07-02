# Panel admin

Panel privado del catalogo. Guarda cambios directo en la DB del VPS; no exporta
JSON ni requiere redeploy para reflejar cambios de productos/categorias.

Acceso:
- `https://corralonloseucaliptus.com/#admin`

## Que hace hoy

- CRUD de productos del catalogo
- activacion y desactivacion logica (`active`)
- seleccion de destacados (`featured`)
- CRUD de categorias
- promocion de `raw_skus` al catalogo real
- subida y reemplazo de imagenes por producto
- creacion de usuarios admin
- tema y wallpaper local del panel

## Flujo de datos

```text
AdminPage.jsx
  -> src/admin/api.js
    -> /api/admin/*
      -> Express
        -> SQLite
        -> uploads/
```

Pantallas principales:
- `Catalogo completo`
- `Categorias`
- `Destacados`
- `Usuarios`
- `Revision`

## Endpoints usados

| Accion | Endpoint |
|---|---|
| Login | `POST /api/admin/auth/login` |
| Usuario actual | `GET /api/admin/auth/me` |
| Listar usuarios (solo admin) | `GET /api/admin/auth/users` |
| Crear usuario (solo admin) | `POST /api/admin/auth/users` |
| Cambiar contrasena propia | `PUT /api/admin/auth/users/:id/password` |
| Resetear contrasena ajena (solo admin) | `PUT /api/admin/auth/users/:id/reset-password` |
| Cambiar rol (solo admin) | `PUT /api/admin/auth/users/:id/role` |
| Eliminar usuario (solo admin) | `DELETE /api/admin/auth/users/:id` |
| Listar productos | `GET /api/admin/products` |
| Crear producto | `POST /api/admin/products` |
| Editar producto | `PUT /api/admin/products/:id` |
| Desactivar producto | `POST /api/admin/products/:id/deactivate` |
| Reactivar producto | `POST /api/admin/products/:id/activate` |
| Listar categorias | `GET /api/admin/categories` |
| Crear categoria | `POST /api/admin/categories` |
| Editar categoria | `PUT /api/admin/categories/:key` |
| Eliminar categoria | `DELETE /api/admin/categories/:key` |
| Pileta de SKUs | `GET /api/admin/raw-skus` |
| Promover SKU | `POST /api/admin/raw-skus/:code/promote` |
| Subir imagen | `POST /api/admin/upload` |

## Imagenes

Funcionamiento actual:
- el frontend envia `productId`, `dataUrl` y `currentImageUrl`
- el backend normaliza el nombre
- la imagen final se guarda como `/uploads/<product-id>.webp`
- si la imagen previa tenia otro nombre bajo `/uploads/`, se elimina

Limites actuales:
- si se quita una imagen desde admin sin subir otra, se limpia `image_url` pero
  no se borra el archivo huerfano del disco
- Nginx no define `client_max_body_size` (default 1 MB) y la imagen viaja como
  base64 dentro de JSON: fotos mayores a ~750 KB reales fallan con 413 antes de
  llegar al backend

Comportamiento del boton X (quitar) en el catalogo:
- producto ya guardado: desactiva en la DB (borrado logico, `active = 0`); la
  fila queda visible como inactiva y se puede reactivar
- fila nueva sin guardar: se descarta solo del estado local

## Usuarios y roles

Roles del sistema:
- `admin`: todo, incluida la gestion de usuarios (crear, cambiar rol, resetear
  contrasena, eliminar)
- `editor`: opera el catalogo (productos, categorias, destacados, pileta,
  imagenes) pero no ve ni gestiona usuarios

Reglas de la gestion de usuarios (todas solo-admin):
- la pestana Usuarios solo aparece para admins; para editores el listado
  devuelve 403 y el panel carga igual
- un admin puede resetear la contrasena de otro usuario sin conocer la actual;
  la propia se cambia con `currentPassword`
- nadie puede cambiar su propio rol ni eliminarse a si mismo
- no se puede degradar ni eliminar al ultimo admin del sistema
- el rol se lee de la DB en cada request (no del token): un cambio de rol o una
  baja aplican de inmediato aunque el JWT viejo siga vigente

## Seguridad actual

- JWT firmado con `node:crypto`
- passwords con `scrypt`
- rate limit especifico para login
- rate limit global
- `trust proxy = 1`
- upload con nombre canonico y sanitizacion
- conversion de imagenes a WebP con `sharp`
- backend corriendo como usuario no root en Docker

## Limitaciones operativas

- el guardado de productos es secuencial y reenvia toda la tabla desde el panel
- no hay dirty tracking por fila
- no hay endpoint bulk ni transaccion por lote para la edicion masiva
- `raw_skus` se consulta server-side, pero el catalogo editable completo se baja
  entero

## Archivos clave

- `src/admin/AdminPage.jsx`
- `src/admin/api.js`
- `server/src/routes/auth.js`
- `server/src/routes/products.js`
- `server/src/routes/categories.js`
- `server/src/routes/raw-skus.js`
- `server/src/routes/uploads.js`
