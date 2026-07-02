# Panel de administracion del catalogo

Seccion privada para cambiar precios, agregar/editar/borrar productos, elegir
destacados y subir imagenes en vivo, sin tocar codigo ni redeployar.

Los cambios se guardan en la base de datos del backend (SQLite en el VPS) y se
reflejan en la web al instante (el catalogo y los destacados leen de la API).

## Como entrar

- Agrega `#admin` a la URL: `https://corralonloseucaliptus.com/#admin`
- Login por usuario + contrasena (validado en el servidor, JWT).

### Credenciales por defecto

Definidas por las variables de entorno `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`
(ver `.env` del backend). Si no estan configuradas, el seed salta la creacion
del usuario administrador.

## Que se puede hacer

- **Catalogo:** agregar, editar (nombre, marca, categoria, unidad, precio, imagen)
  y borrar productos. El borrado es soft (el producto se desactiva, no se pierde
  el dato). Precio vacio / 0 -> se muestra como "A consultar".
- **Agregar desde la pileta:** hay SKUs curados y versionados en el repo disponibles
  para sumar al catalogo desde una busqueda; al agregarlos pasan a ser productos del sitio.
- **Destacados (home):** marcar/desmarcar productos como `featured`. Lo marcado
  aparece en la grilla de "Productos destacados" del home (via `/api/featured`).
- **Imagenes:** subir por producto; el backend las comprime a WebP (`sharp`) y las
  sirve desde `/uploads/`. Solo se aceptan formatos webp, jpg y png.
- **Apariencia del panel:** cada administrador puede elegir un tema visual y subir
  un wallpaper local para su navegador. Esto no toca el servidor ni afecta al
  sitio publico.

## Como funciona por detras

| Accion | Endpoint |
|---|---|
| Login (con rate limit: 20 intentos / 15 min) | `POST /api/admin/auth/login` |
| Ver mi usuario | `GET /api/admin/auth/me` |
| Listar usuarios | `GET /api/admin/auth/users` |
| Crear usuario (solo admin) | `POST /api/admin/auth/users` |
| Cambiar contrasena | `PUT /api/admin/auth/users/:id/password` |
| Listar/crear/editar producto | `GET/POST/PUT /api/admin/products` |
| Desactivar/reactivar producto | `POST /api/admin/products/:id/deactivate` / `activate` |
| Pileta de SKUs | `GET /api/admin/raw-skus?search=` |
| Promover SKU a catalogo | `POST /api/admin/raw-skus/:code/promote` |
| Categorias | `GET/POST/PUT/DELETE /api/admin/categories` |
| Subir imagen | `POST /api/admin/upload` |
| (Publico) catalogo / destacados | `GET /api/catalog`, `GET /api/featured` |

Todo lo de `/api/admin/*` requiere el token JWT del login.

## Cambiar la contrasena

Desde el panel no hay opcion todavia, pero la API tiene el endpoint:

```bash
curl -X PUT https://corralonloseucaliptus.com/api/admin/auth/users/1/password \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"actual","newPassword":"nueva"}'
```

Cualquier usuario puede cambiar su propia contrasena. Un admin puede cambiar
la de cualquier usuario.

## Seguridad

- Auth real de servidor: contrasena con scrypt + login que emite JWT (7 dias).
- Las rutas de administracion estan protegidas; sin token valido devuelven 401.
- Crear usuarios requiere rol `admin` (no cualquier usuario autenticado).
- Login con rate limit: 20 intentos cada 15 minutos por IP.
- Las rutas `/api/admin/products`, `/api/admin/categories`, `/api/admin/raw-skus`
  requieren autenticacion.
- El panel `#admin` no aparece en la navegacion del sitio.
- Subida de imagenes: se sanitiza el nombre de archivo (no permite path traversal),
  solo se aceptan formatos webp/jpg/png, y se procesan con sharp (redimensiona y
  convierte a WebP). Los errores no exponen detalles internos.
