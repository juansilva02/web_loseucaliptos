import 'dotenv/config'
import { initSchema } from './db.js'
import { createApp } from './app.js'

const PORT = Number(process.env.PORT) || 3001

try {
  initSchema()
} catch (err) {
  console.error('[loseucaliptos-api] Error al inicializar esquema:', err)
  process.exit(1)
}

const app = createApp()
app.listen(PORT, (err) => {
  if (err) {
    console.error(`[loseucaliptos-api] Error al iniciar en puerto ${PORT}:`, err)
    process.exit(1)
  }
  console.log(`[loseucaliptos-api] escuchando en :${PORT} (env: ${process.env.NODE_ENV || 'development'})`)
})
