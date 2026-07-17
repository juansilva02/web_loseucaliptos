#!/usr/bin/env bash
# Weekly backup of the SQLite database, uploads and runtime environment.
set -euo pipefail

SERVER_DIR=/opt/loseucaliptos/server
DEST=/opt/backups/corralon

mkdir -p "$DEST"
chmod 700 "$DEST"

TMP_DIR=$(mktemp -d "$DEST/.staging.XXXXXX")

cleanup() {
  rm -rf "$TMP_DIR"
  docker compose -f "$SERVER_DIR/docker-compose.yml" exec -T api rm -f /tmp/backup-tmp.sqlite >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$SERVER_DIR"
docker compose exec -T api node -e "
  require('better-sqlite3')('/app/data/loseucaliptos.sqlite')
    .backup('/tmp/backup-tmp.sqlite')
    .then(() => console.log('[backup] sqlite ok'))
    .catch((error) => { console.error(error); process.exit(1) })
"
docker compose cp api:/tmp/backup-tmp.sqlite "$TMP_DIR/db.sqlite"
tar czf "$TMP_DIR/uploads.tgz" -C "$SERVER_DIR" uploads
install -m 600 "$SERVER_DIR/.env" "$TMP_DIR/env"

# Fixed names intentionally replace the previous weekly snapshot only after
# all source files have been created successfully.
mv -f "$TMP_DIR/db.sqlite" "$DEST/db-latest.sqlite"
mv -f "$TMP_DIR/uploads.tgz" "$DEST/uploads-latest.tgz"
mv -f "$TMP_DIR/env" "$DEST/env-latest"
chmod 600 "$DEST/db-latest.sqlite" "$DEST/uploads-latest.tgz" "$DEST/env-latest"
printf '[backup] OK %s\n' "$(date --iso-8601=seconds)"
