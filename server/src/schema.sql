-- Esquema de la base del corralon. Idempotente (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS categories (
  key  TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER DEFAULT 0
);

-- Catalogo vivo: lo que ve el cliente. Arranca con los 64 curados.
CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category_key TEXT REFERENCES categories(key),
  brand        TEXT DEFAULT '',
  unit         TEXT DEFAULT '',
  price        INTEGER DEFAULT 0,
  image_url    TEXT DEFAULT '',
  featured     INTEGER DEFAULT 0,
  sort         INTEGER DEFAULT 0,
  active       INTEGER DEFAULT 1,
  source_code  INTEGER,                 -- code del raw_sku si vino de la pileta
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

-- Pileta de SKUs crudos curados y versionados en el repo. El admin agrega de aca al catalogo.
CREATE TABLE IF NOT EXISTS raw_skus (
  code       INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  rubro      TEXT DEFAULT '',
  price      INTEGER DEFAULT 0,
  cost       INTEGER,
  stock      INTEGER,
  added      INTEGER DEFAULT 0,          -- 1 si ya se promovio al catalogo
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'admin',
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  items            TEXT NOT NULL,         -- JSON [{id,name,price,quantity}]
  subtotal         INTEGER NOT NULL,
  customer_name    TEXT,
  customer_phone   TEXT,
  customer_address TEXT,
  payment_method   TEXT,
  branch           TEXT,
  status           TEXT DEFAULT 'nuevo',
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  source     TEXT,                        -- ej 'cobertura', 'contacto'
  label      TEXT,
  lat        REAL,
  lng        REAL,
  zone       TEXT,
  message    TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Destacados: admin los edita desde el panel y se sirven por API (ya no requiere export/commit)
CREATE TABLE IF NOT EXISTS featured (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  subtitle       TEXT DEFAULT '',
  match          TEXT DEFAULT '',
  category_key   TEXT DEFAULT '',
  price_override INTEGER,
  image_url      TEXT DEFAULT '',
  sort           INTEGER DEFAULT 0,
  active         INTEGER DEFAULT 1,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_key);
CREATE INDEX IF NOT EXISTS idx_raw_added ON raw_skus(added);
