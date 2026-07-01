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

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

// Aplica el esquema (idempotente) al iniciar.
export function initSchema() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  db.exec(sql)
  ensureColumn('raw_skus', 'rubro', "TEXT DEFAULT ''")
  ensureColumn('raw_skus', 'cost', 'INTEGER')
}
