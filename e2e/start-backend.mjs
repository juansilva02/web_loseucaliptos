import { mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const dbPath = process.env.DB_PATH
if (!dbPath) throw new Error('DB_PATH es requerido para E2E')

mkdirSync(dirname(dbPath), { recursive: true })
for (const suffix of ['', '-shm', '-wal']) rmSync(`${dbPath}${suffix}`, { force: true })
rmSync(process.env.UPLOADS_DIR, { recursive: true, force: true })

const result = spawnSync(process.execPath, ['server/src/seed.js'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: process.env,
})
if (result.status !== 0) {
  throw new Error(result.stderr || result.stdout || 'No se pudo preparar la DB E2E')
}

await import('../server/src/index.js')
