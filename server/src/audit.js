import { db } from './db.js'

export function writeAudit({
  actor,
  action,
  entityType,
  entityId,
  before = null,
  after = null,
  database = db,
}) {
  database.prepare(`
    INSERT INTO audit_log (
      actor_id, actor_email, action, entity_type, entity_id, before_json, after_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    actor?.id ?? null,
    actor?.username ?? actor?.email ?? null,
    action,
    entityType,
    String(entityId),
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after),
  )
}
