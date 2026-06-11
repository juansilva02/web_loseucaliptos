// Configuracion del panel de administracion.
//
// IMPORTANTE — sobre la seguridad de este login:
// El sitio es 100% estatico (no hay backend), por lo tanto la validacion de
// usuario/contraseña ocurre en el navegador. Esto funciona como una barrera
// disuasoria para que la seccion no quede a la vista, pero NO es seguridad
// fuerte: alguien con conocimientos podria inspeccionar el bundle. Para datos
// criticos haria falta un backend real. Para administrar el catalogo de este
// corralon (precios e imagenes que luego se commitean al repo) es suficiente.
//
// Para cambiar las credenciales sin tocar codigo, defini variables de entorno
// al compilar/deployar en Vercel:
//   VITE_ADMIN_USER        -> nombre de usuario
//   VITE_ADMIN_PASS_HASH   -> hash SHA-256 (hex) de la contraseña
//
// Para generar el hash de una contraseña nueva, en una terminal:
//   node -e "import('crypto').then(c=>console.log(c.createHash('sha256').update('TU_CLAVE').digest('hex')))"
// o en Python:
//   python -c "import hashlib;print(hashlib.sha256('TU_CLAVE'.encode()).hexdigest())"

// Credenciales por defecto (cambialas antes de poner el sitio en produccion):
//   usuario:    admin
//   contraseña: eucaliptus2026
const DEFAULT_USER = 'admin'
const DEFAULT_PASS_HASH = '012ed83e8b5f4b8bf0b361cce22599440eef6878746f21c5c8d8bb285da5f868'

export const adminUser = import.meta.env.VITE_ADMIN_USER || DEFAULT_USER
export const adminPassHash = (import.meta.env.VITE_ADMIN_PASS_HASH || DEFAULT_PASS_HASH).toLowerCase()

// Ruta (hash) por la que se accede al panel: https://tusitio/#admin
export const ADMIN_HASH = '#admin'

// Clave de sesion y de borrador en el navegador.
export const SESSION_KEY = 'eucaliptus-admin-session'
export const DRAFT_KEY = 'eucaliptus-admin-draft'

// Carpeta (dentro de /public) donde se guardan las imagenes de producto.
export const IMAGES_DIR = 'product-images'

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function validateCredentials(user, password) {
  if (user !== adminUser) return false
  const hash = await sha256Hex(password)
  return hash === adminPassHash
}
