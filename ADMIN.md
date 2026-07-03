# Panel admin

Panel privado disponible en `/#admin`. Los cambios se escriben directamente en
SQLite y no requieren redeploy.

## Usuarios y roles

- `admin`: catalogo, categorias, SKUs y gestion de usuarios.
- `editor`: catalogo, categorias, destacados, SKUs e imagenes.

Los usuarios se crean solo con nombre de usuario, contrasena y rol; el correo
no es obligatorio. El login acepta usuario o email indistintamente. Desde la
tarjeta de cada usuario, `Editar datos` abre un flotante donde el admin
completa nombre, email de recuperacion y telefono. El email de recuperacion es
el contacto para resetear la contrasena si el usuario la olvida (el reset lo
ejecuta un admin desde el panel; no hay envio automatico de correos).

El rol y `token_version` se verifican contra la DB en cada request. Cambiar o
resetear una contrasena invalida inmediatamente los tokens anteriores.

## Flujo de trabajo

1. `Catalogo completo`: filtrar y editar productos.
2. `Destacados`: activar o desactivar `products.featured` y mover el orden en
   que aparecen en la home con las flechas de la columna `Orden`.
3. `Categorias`: editar nombres sin cambiar keys existentes.
4. `Revision`: revisar nombres y resolver `raw_skus`.
5. `Usuarios`: alta, datos, roles, reset y baja, solo para admins.
6. `Mi cuenta`: cambiar la contrasena propia.

El panel conserva un snapshot al cargar. `Guardar cambios` envia unicamente
filas distintas mediante:

```text
PUT /api/admin/products/bulk
{ updates: [{ id, version, patch }], creates: [{ clientId, product }] }
```

El lote es atomico. Si otro administrador modifico una fila, responde `409`,
no escribe ninguna fila y la UI conserva las ediciones locales mostrando el
valor vigente del servidor.

Los productos nuevos reciben un ID derivado del nombre. Primero se guarda el
producto y despues se habilita su imagen.

Las imagenes y el orden de destacados se preparan localmente (preview
inmediato) y recien se publican al pulsar `Guardar cambios`, junto con el
resto de la fila.

## Imagenes

```text
PUT /api/admin/products/:id/image?version=N
Content-Type: image/jpeg | image/png | image/webp

DELETE /api/admin/products/:id/image
{ version: N }
```

El backend:

1. valida tipo, tamano y cantidad de pixeles;
2. reduce a un maximo de 800 px;
3. convierte a WebP;
4. escribe `<product-id>-<hash>.webp`;
5. actualiza DB con control de version;
6. elimina la imagen anterior solo despues del commit.

Quitar una imagen limpia DB y elimina el archivo administrado. Los assets
bundleados conocidos pueden seguir apareciendo como fallback visual.

## SKUs crudos

Un SKU pendiente no implica que falte el producto. Puede corresponder a un
producto que ya existe:

- `Vincular`: asigna `source_code` al producto existente y marca el SKU como
  resuelto.
- `Promover`: crea un producto nuevo inactivo.
- `Descartar`: oculta el SKU de la cola sin borrarlo; se puede restaurar. Un
  SKU vinculado o promovido no se puede descartar, y un SKU descartado no se
  puede vincular ni promover sin restaurarlo antes.

La promocion bloquea coincidencias exactas y `source_code` tiene indice unico
parcial. La lista devuelve total real, paginacion y candidatos de coincidencia.

## Endpoints vigentes

| Accion | Endpoint |
|---|---|
| Login (usuario o email) | `POST /api/admin/auth/login` |
| Cuenta actual | `GET /api/admin/auth/me` |
| Usuarios | `GET/POST /api/admin/auth/users` |
| Datos de usuario | `PUT /api/admin/auth/users/:id/profile` |
| Contrasena propia | `PUT /api/admin/auth/users/:id/password` |
| Reset de otro usuario | `PUT /api/admin/auth/users/:id/reset-password` |
| Rol | `PUT /api/admin/auth/users/:id/role` |
| Productos | `GET /api/admin/products` |
| Bulk de productos | `PUT /api/admin/products/bulk` |
| Imagen | `PUT/DELETE /api/admin/products/:id/image` |
| Categorias | `GET/POST/DELETE /api/admin/categories` |
| Bulk de categorias | `PUT /api/admin/categories/bulk` |
| SKUs | `GET /api/admin/raw-skus` |
| Vincular SKU | `POST /api/admin/raw-skus/:code/link` |
| Promover SKU | `POST /api/admin/raw-skus/:code/promote` |
| Descartar SKU | `DELETE /api/admin/raw-skus/:code` |
| Restaurar SKU | `POST /api/admin/raw-skus/:code/restore` |

Los endpoints individuales y el upload JSON anterior quedan temporalmente por
compatibilidad, pero la UI vigente no los utiliza.
