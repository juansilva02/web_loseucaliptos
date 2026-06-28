import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { db, initSchema } from './db.js'

initSchema()

const app = express()

// Seguridad de headers
app.use(helmet())

// CORS: allowlist por env (CSV). Sin lista => permite todo (solo dev).
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  }),
)

app.use(express.json({ limit: '1mb' }))

// Healthcheck — usado para verificar que el container vive
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'loseucaliptos-api',
    version: '0.1.0',
    time: new Date().toISOString(),
  })
})

// Catalogo publico: categorias + productos activos (mismo shape que el front)
app.get('/api/catalog', (_req, res) => {
  const categories = db.prepare('SELECT key, name FROM categories ORDER BY sort').all()
  const products = db
    .prepare(
      `SELECT id, name, category_key AS category, brand, unit, price, image_url AS image
       FROM products WHERE active = 1 ORDER BY sort`,
    )
    .all()
  res.json({ categories, products, count: products.length })
})

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, () => {
  console.log(`[loseucaliptos-api] escuchando en :${PORT} (env: ${process.env.NODE_ENV || 'development'})`)
})
