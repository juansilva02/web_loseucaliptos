#!/usr/bin/env bash
# Deploy del corralon en el VPS: actualiza repo, rebuildea frontend y backend.
# Uso (en el VPS):  bash /opt/loseucaliptos/scripts/deploy.sh
set -euo pipefail

# Ir a la raiz del repo (este script vive en scripts/)
cd "$(dirname "$0")/.."
REPO="$(pwd)"
echo "==> repo: $REPO"

echo "==> git sync origin/main"
GIT_TERMINAL_PROMPT=0 git fetch origin main --prune
git checkout main
git reset --hard origin/main

echo "==> frontend: build"
npm install --no-audit --no-fund
npm run build
chmod -R a+rX dist
echo "    dist actualizado"

echo "==> backend: permisos de bind mounts (container corre como uid 1001)"
# Sin esto SQLite queda en solo lectura y el admin no puede guardar.
mkdir -p server/data server/uploads
chown -R 1001:1001 server/data server/uploads

echo "==> backend: docker compose"
( cd server && docker compose up -d --build )

echo "==> nginx: test + reload"
nginx -t && systemctl reload nginx

echo "==> verificacion (loopback)"
R="--resolve corralonloseucaliptus.com:443:127.0.0.1"
curl -s --max-time 10 $R -o /dev/null -w "    frontend  -> HTTP %{http_code}\n" https://corralonloseucaliptus.com/
curl -s --max-time 10 $R -o /dev/null -w "    /api/catalog -> HTTP %{http_code}\n" https://corralonloseucaliptus.com/api/catalog
echo "==> deploy OK"
