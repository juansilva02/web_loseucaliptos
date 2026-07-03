import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import Database from 'better-sqlite3'

test('una DB nueva crea siete categorias, catorce destacados y un admin', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'eucaliptus-seed-'))
  const dbPath = join(tempRoot, 'seed.sqlite')
  const result = spawnSync(process.execPath, ['src/seed.js'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: {
      ...process.env,
      DB_PATH: dbPath,
      JWT_SECRET: 'seed-test-secret-with-enough-entropy',
      SEED_ADMIN_EMAIL: 'admin@seed.local',
      SEED_ADMIN_PASSWORD: 'Seed-admin-123',
      NODE_ENV: 'test',
    },
  })

  assert.equal(result.status, 0, result.stderr || result.stdout)
  const db = new Database(dbPath, { readonly: true })
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM categories').get().n, 7)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM products WHERE featured = 1').get().n, 14)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE email = 'admin@seed.local'").get().n, 1)
  db.close()
  rmSync(tempRoot, { recursive: true, force: true })
})
