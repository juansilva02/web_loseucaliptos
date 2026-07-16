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
  {
    version: 2,
    name: 'users con username y email opcional',
    up(db) {
      // Bases legacy: el login era el email obligatorio. Se reconstruye la
      // tabla (SQLite no permite quitar NOT NULL) copiando email -> username,
      // asi nadie pierde acceso. Bases nuevas ya nacen con la forma final.
      const columns = db.prepare('PRAGMA table_info(users)').all()
      if (!columns.some((entry) => entry.name === 'username')) {
        db.exec(`
          CREATE TABLE users_new (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT UNIQUE NOT NULL,
            email         TEXT,
            display_name  TEXT DEFAULT '',
            phone         TEXT DEFAULT '',
            password_hash TEXT NOT NULL,
            role          TEXT DEFAULT 'admin',
            token_version INTEGER NOT NULL DEFAULT 1,
            created_at    TEXT DEFAULT (datetime('now'))
          );
          INSERT INTO users_new (id, username, email, password_hash, role, token_version, created_at)
            SELECT id, email,
                   CASE WHEN email LIKE '%@%' THEN email ELSE NULL END,
                   password_hash, role, token_version, created_at
            FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `)
      }
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
          ON users(email) WHERE email IS NOT NULL AND email != '';
      `)
    },
  },
  {
    version: 3,
    name: 'raw skus descartables',
    up(db) {
      ensureColumn(db, 'raw_skus', 'dismissed', 'INTEGER NOT NULL DEFAULT 0')
      db.exec('CREATE INDEX IF NOT EXISTS idx_raw_pending ON raw_skus(added, dismissed)')
    },
  },
  {
    version: 4,
    name: 'metadatos de busqueda por producto',
    up(db) {
      ensureColumn(db, 'products', 'search_aliases', "TEXT NOT NULL DEFAULT '[]'")
      ensureColumn(db, 'products', 'search_measurements', "TEXT NOT NULL DEFAULT '[]'")
      ensureColumn(db, 'products', 'search_applications', "TEXT NOT NULL DEFAULT '[]'")
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
