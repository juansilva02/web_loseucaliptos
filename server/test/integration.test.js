import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const tempRoot = mkdtempSync(join(tmpdir(), 'eucaliptus-api-'))
process.env.DB_PATH = join(tempRoot, 'test.sqlite')
process.env.UPLOADS_DIR = join(tempRoot, 'uploads')
process.env.JWT_SECRET = 'integration-test-secret-with-enough-entropy'
process.env.NODE_ENV = 'test'

const { db, initSchema } = await import('../src/db.js')
const { hashPassword } = await import('../src/auth.js')
const { createApp } = await import('../src/app.js')

initSchema()
db.prepare("INSERT INTO categories (key, name, sort) VALUES ('materiales', 'Materiales', 1)").run()
db.prepare(`
  INSERT INTO products (id, name, category_key, unit, price, sort)
  VALUES
    ('producto-a', 'Producto A', 'materiales', 'unidad', 100, 1),
    ('producto-b', 'Producto B', 'materiales', 'unidad', 200, 2),
    ('sin-precio', 'Sin precio', 'materiales', 'unidad', 0, 3)
`).run()
const adminHash = await hashPassword('Admin-test-123')
const editorHash = await hashPassword('Editor-test-123')
const adminId = Number(db.prepare(
  "INSERT INTO users (username, email, password_hash, role) VALUES ('admin', 'admin@test.local', ?, 'admin')",
).run(adminHash).lastInsertRowid)
const editorId = Number(db.prepare(
  "INSERT INTO users (username, email, password_hash, role) VALUES ('editor', 'editor@test.local', ?, 'editor')",
).run(editorHash).lastInsertRowid)

const server = createApp().listen(0, '127.0.0.1')
await new Promise((resolve) => server.once('listening', resolve))
const address = server.address()
const baseUrl = `http://127.0.0.1:${address.port}`

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const requestHeaders = new Headers(headers)
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  if (body != null && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body == null || body instanceof Uint8Array ? body : JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  return { response, data }
}

async function login(email, password) {
  const { response, data } = await request('/api/admin/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  assert.equal(response.status, 200)
  return data.token
}

test('backend estabilizado', async (t) => {
  await t.test('aplica migraciones y responde readiness', async () => {
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n,
      4,
    )
    assert.ok(db.prepare('PRAGMA table_info(products)').all().some((column) => column.name === 'version'))
    const { response } = await request('/health/ready')
    assert.equal(response.status, 200)
  })

  const adminToken = await login('ADMIN@test.local', 'Admin-test-123')

  await t.test('el bulk es atomico ante conflicto y versiona al guardar', async () => {
    const conflict = await request('/api/admin/products/bulk', {
      method: 'PUT',
      token: adminToken,
      body: {
        updates: [
          { id: 'producto-a', version: 1, patch: { price: 150 } },
          { id: 'producto-b', version: 2, patch: { price: 250 } },
        ],
        creates: [],
      },
    })
    assert.equal(conflict.response.status, 409)
    assert.equal(db.prepare("SELECT price FROM products WHERE id = 'producto-a'").get().price, 100)

    const saved = await request('/api/admin/products/bulk', {
      method: 'PUT',
      token: adminToken,
      body: {
        updates: [{ id: 'producto-a', version: 1, patch: { price: 150 } }],
        creates: [],
      },
    })
    assert.equal(saved.response.status, 200)
    assert.equal(saved.data.products[0].version, 2)
  })

  await t.test('quote informa precio cambiado y bloquea productos no comprables', async () => {
    const quote = await request('/api/catalog/quote', {
      method: 'POST',
      body: {
        items: [
          { id: 'producto-a', quantity: 2, seenPrice: 100 },
          { id: 'sin-precio', quantity: 1, seenPrice: 0 },
        ],
      },
    })
    assert.equal(quote.response.status, 200)
    assert.equal(quote.data.subtotal, 300)
    assert.equal(quote.data.changes.length, 1)
    assert.equal(quote.data.blocked[0].reason, 'not_purchasable')
    assert.equal(quote.data.status, 'partial')
  })

  await t.test('busca productos para identificar consultas de WhatsApp', async () => {
    const exact = await request('/api/catalog/search?q=malla%20para%20revoque')
    assert.equal(exact.response.status, 200)
    assert.equal(exact.data.count, 0)
    assert.equal(exact.data.ambiguous, false)

    const broad = await request('/api/catalog/search?q=producto')
    assert.equal(broad.response.status, 200)
    assert.equal(broad.data.count, 2)
    assert.equal(broad.data.ambiguous, true)

    const short = await request('/api/catalog/search?q=ab')
    assert.equal(short.response.status, 400)

    const enriched = await request('/api/admin/products/bulk', {
      method: 'PUT',
      token: adminToken,
      body: {
        updates: [{
          id: 'producto-a',
          version: 2,
          patch: {
            search_aliases: ['malla'],
            search_measurements: ['6', '15x25'],
            search_applications: ['revoque'],
          },
        }],
        creates: [],
      },
    })
    assert.equal(enriched.response.status, 200)
    assert.deepEqual(JSON.parse(enriched.data.products[0].search_applications), ['revoque'])

    const enrichedSearch = await request('/api/catalog/search?q=malla%20para%20revoque')
    assert.equal(enrichedSearch.data.count, 1)
    assert.equal(enrichedSearch.data.results[0].id, 'producto-a')
    assert.ok(enrichedSearch.data.results[0].score > 0)
    assert.match(enrichedSearch.data.results[0].matchReason.join(' '), /revoque: aplicacion/)
  })

  await t.test('persiste consultas de WhatsApp y es idempotente', async () => {
    const payload = {
      idempotencyKey: 'openwa-message-1',
      sessionId: 'session-1',
      chatId: '5491112345678@c.us',
      customerName: 'Juan',
      message: 'Quiero 2 productos A',
      productQuery: 'producto A',
      quantity: 2,
      intent: 'product_quote',
      resolutionStatus: 'resolved',
      response: 'Total: $300',
      details: { subtotal: 300 },
    }
    const created = await request('/api/automation/consultations', {
      method: 'POST',
      body: payload,
    })
    assert.equal(created.response.status, 201)
    assert.equal(created.data.created, true)
    assert.equal(created.data.consultation.customer_phone, '5491112345678')
    assert.equal(created.data.consultation.resolved, true)

    const duplicate = await request('/api/automation/consultations', {
      method: 'POST',
      body: payload,
    })
    assert.equal(duplicate.response.status, 200)
    assert.equal(duplicate.data.created, false)
    assert.equal(duplicate.data.consultation.id, created.data.consultation.id)

    const listed = await request('/api/automation/consultations?limit=10')
    assert.equal(listed.response.status, 200)
    assert.equal(listed.data.count, 1)
  })

  await t.test('imagen binaria reemplaza DB y se elimina sin dejar archivo', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    )
    const uploaded = await request('/api/admin/products/producto-a/image?version=3', {
      method: 'PUT',
      token: adminToken,
      body: png,
      headers: { 'Content-Type': 'image/png' },
    })
    assert.equal(uploaded.response.status, 200)
    assert.match(uploaded.data.product.image_url, /^\/uploads\/producto-a-[a-f0-9]{10}\.webp$/)
    assert.equal(readdirSync(process.env.UPLOADS_DIR).length, 1)

    const removed = await request('/api/admin/products/producto-a/image', {
      method: 'DELETE',
      token: adminToken,
      body: { version: uploaded.data.product.version },
    })
    assert.equal(removed.response.status, 200)
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.equal(readdirSync(process.env.UPLOADS_DIR).length, 0)
  })

  await t.test('vincula un SKU existente sin duplicar producto', async () => {
    db.prepare(`
      INSERT INTO raw_skus (code, name, rubro, price, added)
      VALUES (123, 'Producto B', 'MATERIALES', 200, 0)
    `).run()
    const linked = await request('/api/admin/raw-skus/123/link', {
      method: 'POST',
      token: adminToken,
      body: { productId: 'producto-b' },
    })
    assert.equal(linked.response.status, 200)
    assert.equal(linked.data.product.source_code, 123)
    assert.equal(db.prepare('SELECT added FROM raw_skus WHERE code = 123').get().added, 1)
  })

  await t.test('descarta un SKU sin borrarlo y permite restaurarlo', async () => {
    db.prepare(`
      INSERT INTO raw_skus (code, name, rubro, price, added)
      VALUES (124, 'SKU incorrecto', 'MATERIALES', 300, 0)
    `).run()

    const dismissed = await request('/api/admin/raw-skus/124', {
      method: 'DELETE',
      token: adminToken,
    })
    assert.equal(dismissed.response.status, 200)
    assert.equal(db.prepare('SELECT dismissed FROM raw_skus WHERE code = 124').get().dismissed, 1)

    const pending = await request('/api/admin/raw-skus?added=0', { token: adminToken })
    assert.equal(pending.response.status, 200)
    assert.equal(pending.data.skus.some((sku) => sku.code === 124), false)

    const restored = await request('/api/admin/raw-skus/124/restore', {
      method: 'POST',
      token: adminToken,
    })
    assert.equal(restored.response.status, 200)
    assert.equal(db.prepare('SELECT dismissed FROM raw_skus WHERE code = 124').get().dismissed, 0)
  })

  await t.test('crea usuario sin correo y el login acepta usuario o email', async () => {
    const created = await request('/api/admin/auth/users', {
      method: 'POST',
      token: adminToken,
      body: { username: 'deposito', password: 'Deposito-123' },
    })
    assert.equal(created.response.status, 201)
    assert.equal(created.data.user.username, 'deposito')
    assert.equal(created.data.user.email, null)

    const byUsername = await login('deposito', 'Deposito-123')
    assert.ok(byUsername)
    const byEmail = await login('admin@test.local', 'Admin-test-123')
    assert.ok(byEmail)

    const invalid = await request('/api/admin/auth/users', {
      method: 'POST',
      token: adminToken,
      body: { username: 'no valido!', password: 'Password-123' },
    })
    assert.equal(invalid.response.status, 400)
  })

  await t.test('el perfil completa email de recuperacion y valida duplicados', async () => {
    const user = db.prepare("SELECT id FROM users WHERE username = 'deposito'").get()
    const updated = await request(`/api/admin/auth/users/${user.id}/profile`, {
      method: 'PUT',
      token: adminToken,
      body: {
        display_name: 'Deposito Solano',
        email: 'deposito@corralon.com',
        phone: '11 5555-5555',
      },
    })
    assert.equal(updated.response.status, 200)
    assert.equal(updated.data.user.display_name, 'Deposito Solano')
    assert.equal(updated.data.user.email, 'deposito@corralon.com')

    const duplicated = await request(`/api/admin/auth/users/${user.id}/profile`, {
      method: 'PUT',
      token: adminToken,
      body: { email: 'admin@test.local' },
    })
    assert.equal(duplicated.response.status, 409)

    const cleared = await request(`/api/admin/auth/users/${user.id}/profile`, {
      method: 'PUT',
      token: adminToken,
      body: { email: '' },
    })
    assert.equal(cleared.response.status, 200)
    assert.equal(cleared.data.user.email, null)

    const byEmailAfterClear = await request('/api/admin/auth/login', {
      method: 'POST',
      body: { email: 'deposito@corralon.com', password: 'Deposito-123' },
    })
    assert.equal(byEmailAfterClear.response.status, 401)
  })

  await t.test('cambiar contrasena invalida inmediatamente el token anterior', async () => {
    const oldToken = await login('editor@test.local', 'Editor-test-123')
    const changed = await request(`/api/admin/auth/users/${editorId}/password`, {
      method: 'PUT',
      token: oldToken,
      body: {
        currentPassword: 'Editor-test-123',
        newPassword: 'Editor-test-456',
      },
    })
    assert.equal(changed.response.status, 200)
    assert.ok(changed.data.token)

    const oldSession = await request('/api/admin/auth/me', { token: oldToken })
    const newSession = await request('/api/admin/auth/me', { token: changed.data.token })
    assert.equal(oldSession.response.status, 401)
    assert.equal(newSession.response.status, 200)
  })

  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n >= 4)
  assert.ok(adminId > 0)
})

test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
  db.close()
  rmSync(tempRoot, { recursive: true, force: true })
})
