import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// El archivo de la base vive en el bind-mount /app/data (persistente).
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'data', 'loseucaliptos.sqlite')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Aplica el esquema (idempotente) al iniciar.
export function initSchema() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  db.exec(sql)
}
