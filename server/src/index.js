import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { db, initSchema } from './db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import categoryRoutes from './routes/categories.js'
import rawSkuRoutes from './routes/raw-skus.js'
import uploadRoutes from './routes/uploads.js'
import featuredRoutes from './routes/featured.js'

initSchema()

const app = express()

// El backend corre detras de un unico proxy reverso (Nginx en el VPS).
// Esto permite usar X-Forwarded-For de forma segura para rate limiting y logs.
app.set('trust proxy', 1)

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

app.use(express.json({ limit: '10mb' }))

// Rate limit global para todas las rutas
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

// Archivos estaticos (imagenes subidas)
app.use('/uploads', express.static('uploads'))

// Healthcheck — usado para verificar que el container vive
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'loseucaliptos-api',
    version: '0.1.0',
    time: new Date().toISOString(),
  })
})

// Catalogo publico: categorias + productos activos
app.get('/api/catalog', (_req, res) => {
  const categories = db.prepare('SELECT key, name FROM categories ORDER BY sort').all()
  const products = db
    .prepare(
      `SELECT id, name, category_key AS category, brand, unit, price, image_url AS image, featured
       FROM products WHERE active = 1 ORDER BY sort`,
    )
    .all()
  res.json({ categories, products, count: products.length })
})

// Destacados publicos: derivados del catalogo activo con featured=1
app.use('/api/featured', featuredRoutes)

// Rutas administrativas (protegidas con JWT)
app.use('/api/admin/auth', authRoutes)
app.use('/api/admin/products', productRoutes)
app.use('/api/admin/categories', categoryRoutes)
app.use('/api/admin/raw-skus', rawSkuRoutes)
app.use('/api/admin/upload', uploadRoutes)

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, () => {
  console.log(`[loseucaliptos-api] escuchando en :${PORT} (env: ${process.env.NODE_ENV || 'development'})`)
})
