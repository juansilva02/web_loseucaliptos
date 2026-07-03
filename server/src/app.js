import crypto from 'node:crypto'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { db } from './db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import categoryRoutes from './routes/categories.js'
import rawSkuRoutes from './routes/raw-skus.js'
import uploadRoutes from './routes/uploads.js'
import featuredRoutes from './routes/featured.js'
import catalogRoutes from './routes/catalog.js'
import deliveryRoutes from './routes/delivery.js'

function requestLogger(req, res, next) {
  const startedAt = Date.now()
  const requestId = req.headers['x-request-id'] || crypto.randomUUID()
  req.id = requestId
  res.setHeader('X-Request-Id', requestId)
  res.on('finish', () => {
    console.log(JSON.stringify({
      type: 'http',
      requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.id ?? null,
    }))
  })
  next()
}

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet())

  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  app.use(cors({
    origin: allowedOrigins.length
      ? allowedOrigins
      : process.env.NODE_ENV === 'production'
        ? false
        : true,
  }))
  app.use(requestLogger)

  // Desarrollo local mantiene /uploads; en produccion Nginx lo sirve directo.
  app.use('/uploads', express.static('uploads', { maxAge: '1h', immutable: false }))
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'loseucaliptos-api',
      version: '0.2.0',
      time: new Date().toISOString(),
    })
  })
  app.get('/health/ready', (_req, res) => {
    db.prepare('SELECT 1').get()
    res.json({ status: 'ready' })
  })

  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }))

  app.use('/api/catalog', catalogRoutes)
  app.use('/api/featured', featuredRoutes)
  app.use('/api/delivery', deliveryRoutes)
  app.use('/api/admin/auth', authRoutes)
  app.use('/api/admin/products', productRoutes)
  app.use('/api/admin/categories', categoryRoutes)
  app.use('/api/admin/raw-skus', rawSkuRoutes)
  app.use('/api/admin/upload', uploadRoutes)

  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' })
  })
  app.use((error, req, res, next) => {
    void next
    const status = Number(error.status) || 500
    console.error(JSON.stringify({
      type: 'error',
      requestId: req.id,
      status,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    }))
    res.status(status).json({
      error: status >= 500 ? 'Error interno del servidor' : error.message,
      ...(error.details ? { details: error.details } : {}),
      requestId: req.id,
    })
  })

  return app
}
