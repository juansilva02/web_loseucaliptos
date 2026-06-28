import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'

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

const PORT = Number(process.env.PORT) || 3001

app.listen(PORT, () => {
  console.log(`[loseucaliptos-api] escuchando en :${PORT} (env: ${process.env.NODE_ENV || 'development'})`)
})
