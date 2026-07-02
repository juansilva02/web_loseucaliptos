#!/usr/bin/env bash
# Backup diario del corralon: DB SQLite (WAL-safe), uploads y .env.
# Uso (en el VPS, como root):  bash /opt/loseucaliptos/scripts/backup.sh
# Cron sugerido:
#   0 4 * * * bash /opt/loseucaliptos/scripts/backup.sh >> /var/log/corralon-backup.log 2>&1
set -euo pipefail

SERVER_DIR=/opt/loseucaliptos/server
DEST=/opt/backups/corralon
STAMP=$(date +%F)
RETENTION_DAYS=14

mkdir -p "$DEST"

# Copia consistente de la DB en caliente via la API de backup de SQLite.
# Se escribe en /tmp del container (siempre escribible para appuser) y se
# extrae con docker cp: no depende de la propiedad del bind mount.
cd "$SERVER_DIR"
docker compose exec -T api node -e "
require('better-sqlite3')('/app/data/loseucaliptos.sqlite')
  .backup('/tmp/backup-tmp.sqlite')
  .then(() => console.log('[backup] sqlite ok'))
  .catch((e) => { console.error(e); process.exit(1) })"
docker compose cp api:/tmp/backup-tmp.sqlite "$DEST/db-$STAMP.sqlite"
docker compose exec -T api rm -f /tmp/backup-tmp.sqlite

tar czf "$DEST/uploads-$STAMP.tgz" -C "$SERVER_DIR" uploads
cp "$SERVER_DIR/.env" "$DEST/env-$STAMP"
chmod 600 "$DEST/env-$STAMP"

# Retencion local. IMPORTANTE: esto NO reemplaza la copia fuera del VPS
# (rsync/rclone hacia otra maquina), que hay que configurar aparte.
find "$DEST" -type f -mtime +"$RETENTION_DAYS" -delete

echo "[backup] OK $STAMP -> $DEST"
ls -lh "$DEST" | tail -5
