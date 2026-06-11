# Panel de administración del catálogo

Sección privada para que el administrador cambie precios, agregue/elimine/oculte
productos y suba imágenes, **sin tocar código**.

## Cómo entrar

- En el sitio, agregá `#admin` a la URL:
  - Local: `http://localhost:5173/#admin`
  - Producción: `https://loseucaliptus.zuzudev.pro/#admin`
- Login por **usuario + contraseña**.

### Credenciales por defecto

| Usuario | Contraseña |
|---------|------------|
| `admin` | `eucaliptus2026` |

> ⚠️ **Cambialas antes de producción.** Ver "Cambiar credenciales" más abajo.

## Qué se puede hacer

- **Destacados (home):** productos con imagen de la portada — título, subtítulo/marca, categoría, precio e imagen.
- **Catálogo completo:** todos los productos — nombre, marca, categoría, unidad, precio, imagen.
  - **Precio vacío / 0** → se muestra como “A consultar”.
  - **Visible / Oculto** → “quitar” un producto del sitio sin borrarlo.
  - 🗑 → eliminar definitivamente.
- **Categorías:** renombrar las categorías (la `key` interna no se edita).
- **Imágenes:** subir PNG/JPG/WEBP/SVG por producto (vista previa al instante).

El borrador se guarda solo en el navegador, así que podés cerrar y seguir después.

## Cómo se publican los cambios (modelo export / commit)

El sitio es estático (sin base de datos), así que los cambios se publican
exportando y commiteando:

1. Tocá **“Exportar cambios”** en el panel. Se descargan:
   - `featured-catalog.json`
   - las imágenes nuevas (una por una), ya con el nombre correcto.
2. Reemplazá el archivo `src/data/featured-catalog.json` del proyecto por el descargado.
3. Copiá las imágenes descargadas a `public/product-images/`.
4. Commiteá y pusheá:
   ```bash
   git add src/data/featured-catalog.json public/product-images
   git commit -m "Actualiza precios e imágenes del catálogo"
   git push
   ```
5. Vercel redeploya solo. En ~1 minuto los clientes ven los cambios.

> El storefront usa la imagen administrada (`public/product-images/...`) si existe;
> si no, cae a la imagen estática de `src/assets/featured-products/`.

## Cambiar credenciales (sin tocar código)

Definí variables de entorno en Vercel (Project → Settings → Environment Variables):

- `VITE_ADMIN_USER` → usuario.
- `VITE_ADMIN_PASS_HASH` → hash SHA-256 (hex) de la contraseña.

Para generar el hash:

```bash
node -e "import('crypto').then(c=>console.log(c.createHash('sha256').update('TU_CLAVE').digest('hex')))"
# o
python -c "import hashlib;print(hashlib.sha256('TU_CLAVE'.encode()).hexdigest())"
```

Redeployá para que tomen efecto.

## Nota de seguridad

Al ser un sitio 100% estático, el login se valida en el navegador: es una
**barrera disuasoria**, no seguridad fuerte (alguien técnico podría inspeccionar
el bundle). Alcanza para mantener el panel fuera de la vista y administrar el
catálogo. Para seguridad real haría falta un backend con autenticación de servidor.
