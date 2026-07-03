const migrations = [
  {
    version: 1,
    name: 'versionado, auditoria e indices',
    up(db) {
      ensureColumn(db, 'products', 'version', 'INTEGER NOT NULL DEFAULT 1')
      ensureColumn(db, 'categories', 'version', 'INTEGER NOT NULL DEFAULT 1')
      ensureColumn(db, 'users', 'token_version', 'INTEGER NOT NULL DEFAULT 1')

      const duplicateSourceCode = db.prepare(`
        SELECT source_code, COUNT(*) AS count
        FROM products
        WHERE source_code IS NOT NULL
        GROUP BY source_code
        HAVING COUNT(*) > 1
        LIMIT 1
      `).get()
      if (duplicateSourceCode) {
        throw new Error(
          `No se puede crear el indice unico: source_code ${duplicateSourceCode.source_code} esta duplicado`,
        )
      }

      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          actor_id    INTEGER,
          actor_email TEXT,
          action      TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id   TEXT NOT NULL,
          before_json TEXT,
          after_json  TEXT,
          created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_products_public
          ON products(active, featured, sort);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_products_source_code_unique
          ON products(source_code) WHERE source_code IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_audit_entity
          ON audit_log(entity_type, entity_id, created_at);
      `)
    },
  },
]

function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((entry) => entry.version),
  )

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue
    db.transaction(() => {
      migration.up(db)
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)')
        .run(migration.version, migration.name)
    })()
  }
}
