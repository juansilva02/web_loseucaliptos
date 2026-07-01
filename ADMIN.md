# Panel de administracion del catalogo

Seccion privada para cambiar precios, agregar/editar/borrar productos, elegir
destacados y subir imagenes en vivo, sin tocar codigo ni redeployar.

Los cambios se guardan en la base de datos del backend (SQLite en el VPS) y se
reflejan en la web al instante (el catalogo y los destacados leen de la API).

## Como entrar

- Agrega `#admin` a la URL: `https://corralonloseucaliptus.com/#admin`
- Login por usuario + contrasena (validado en el servidor, JWT).

### Credenciales por defecto

| Usuario | Contrasena |
|---------|------------|
| `admin` | `eucaliptus2026` |

> Cambialas. Quedaron en historial. Ver "Cambiar la contrasena" mas abajo.

## Que se puede hacer

- **Catalogo:** agregar, editar (nombre, marca, categoria, unidad, precio, imagen)
  y borrar productos. El borrado es soft (el producto se desactiva, no se pierde
  el dato). Precio vacio / 0 -> se muestra como "A consultar".
- **Agregar desde la pileta:** hay 1756 SKUs del Excel disponibles para sumar al
  catalogo desde una busqueda; al agregarlos pasan a ser productos del sitio.
- **Destacados (home):** marcar/desmarcar productos como `featured`. Lo marcado
  aparece en la grilla de "Productos destacados" del home (via `/api/featured`).
  Inicialmente estan destacados los productos con precio.
- **Imagenes:** subir por producto; el backend las comprime a WebP (`sharp`) y las
  sirve desde `/uploads/`.
- **Apariencia del panel:** cada administrador puede elegir un tema visual y subir
  un wallpaper local para su navegador. Esto no toca el servidor ni afecta al
  sitio publico.

## Como funciona por detras

| Accion | Endpoint |
|---|---|
| Login | `POST /api/admin/auth/login` |
| Listar/crear/editar/borrar producto | `GET/POST/PUT/DELETE /api/admin/products` |
| Pileta de SKUs | `GET /api/admin/raw-skus?search=` |
| Categorias | `/api/admin/categories` |
| Subir imagen | `/api/admin/upload` |
| (Publico) catalogo / destacados | `GET /api/catalog`, `GET /api/featured` |

Todo lo de `/api/admin/*` requiere el token JWT del login.

## Cambiar la contrasena

La contrasena vive hasheada (scrypt) en la tabla `users` del backend. Para
cambiarla, en el VPS:

```bash
cd /opt/loseucaliptos/server
docker compose exec api node -e "import('./src/auth.js').then(async a=>{const {db}=await import('./src/db.js');db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(a.hashPassword('NUEVA_CLAVE'),'admin');console.log('contrasena actualizada');process.exit(0)})"
```

## Seguridad

Auth real de servidor: contrasena con scrypt + login que emite JWT (7 dias).
Las rutas de administracion estan protegidas; sin token valido devuelven 401.
El panel `#admin` no aparece en la navegacion del sitio.
