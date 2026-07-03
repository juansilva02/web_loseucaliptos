#!/usr/bin/env bash
# Deploy del corralon en el VPS: actualiza repo, rebuildea frontend y backend.
# Uso (en el VPS):  bash /opt/loseucaliptos/scripts/deploy.sh
set -euo pipefail

# Todo el deploy vive dentro de main() y se invoca en la ultima linea: asi
# bash parsea el archivo completo antes de ejecutar nada. Sin esto, el
# `git reset --hard` de abajo reescribe ESTE archivo a mitad de corrida y
# bash puede terminar ejecutando bytes de la version nueva (corrupcion real
# observada: el deploy del 2026-07-02 corrio la verificacion vieja).
main() {
  # Ir a la raiz del repo (este script vive en scripts/)
  cd "$(dirname "$0")/.."
  REPO="$(pwd)"
  echo "==> repo: $REPO"

  echo "==> git sync origin/main"
  GIT_TERMINAL_PROMPT=0 git fetch origin main --prune
  git checkout main
  git reset --hard origin/main

  echo "==> backend: permisos de bind mounts (container corre como uid 1001)"
  # Sin esto SQLite queda en solo lectura y el admin no puede guardar.
  mkdir -p server/data server/uploads
  chown -R 1001:1001 server/data server/uploads

  echo "==> backend: docker compose"
  # --force-recreate: garantiza que el container tome permisos/env frescos
  # aunque la imagen no haya cambiado (la conexion SQLite se abre al iniciar).
  ( cd server && docker compose up -d --build --force-recreate )

  echo "==> backend: readiness"
  for i in 1 2 3 4 5 6 7 8 9 10; do
    curl -fsS --max-time 5 http://127.0.0.1:3001/health/ready >/dev/null && break
    sleep 2
  done
  curl -fsS --max-time 5 http://127.0.0.1:3001/health/ready >/dev/null

  if grep -Eq '^(ADMIN_EMAIL|ADMIN_PASSWORD)=' server/.env 2>/dev/null; then
    echo "AVISO: renombrar ADMIN_* a SEED_ADMIN_*; la compatibilidad es temporal."
  fi

  echo "==> frontend: build aislado"
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  BUILD_DIR="$REPO/.deploy/build-$STAMP"
  LIVE_DIR="$REPO/dist"
  mkdir -p "$BUILD_DIR" "$LIVE_DIR"
  npm ci --no-audit --no-fund
  BUILD_OUT_DIR="$BUILD_DIR" PRERENDER_REQUIRE_API=1 npm run build
  node scripts/verify-assets.mjs "$BUILD_DIR"
  chmod -R a+rX "$BUILD_DIR"

  echo "==> frontend: publicacion acumulativa"
  mkdir -p "$LIVE_DIR/assets" "$LIVE_DIR/catalogo" "$REPO/.deploy/rollback-$STAMP"
  cp -a "$BUILD_DIR/assets/." "$LIVE_DIR/assets/"
  for path in "$BUILD_DIR"/*; do
    case "$(basename "$path")" in
      assets|catalogo|index.html) ;;
      *) cp -a "$path" "$LIVE_DIR/" ;;
    esac
  done
  [ ! -f "$LIVE_DIR/index.html" ] || cp -a "$LIVE_DIR/index.html" "$REPO/.deploy/rollback-$STAMP/index.html"
  [ ! -f "$LIVE_DIR/catalogo/index.html" ] || cp -a "$LIVE_DIR/catalogo/index.html" "$REPO/.deploy/rollback-$STAMP/catalogo-index.html"
  install -m 0644 "$BUILD_DIR/index.html" "$LIVE_DIR/.index.html.new"
  mv -f "$LIVE_DIR/.index.html.new" "$LIVE_DIR/index.html"
  install -m 0644 "$BUILD_DIR/catalogo/index.html" "$LIVE_DIR/catalogo/.index.html.new"
  mv -f "$LIVE_DIR/catalogo/.index.html.new" "$LIVE_DIR/catalogo/index.html"

  echo "==> nginx: instalar config versionada"
  install -m 0644 deploy/nginx-corralon.conf /etc/nginx/sites-available/corralon
  nginx -t
  systemctl reload nginx

  echo "==> verificacion (loopback)"
  R="--resolve corralonloseucaliptus.com:443:127.0.0.1"
  FRONT_CODE=$(curl -s --max-time 10 $R -o /dev/null -w "%{http_code}" https://corralonloseucaliptus.com/ || true)
  echo "    frontend  -> HTTP $FRONT_CODE"
  # La API tarda unos segundos en aceptar conexiones tras el recreate del
  # container: reintentar antes de dar el veredicto.
  CODE=000
  for i in 1 2 3 4 5 6; do
    CODE=$(curl -s --max-time 10 $R -o /dev/null -w "%{http_code}" https://corralonloseucaliptus.com/api/catalog || true)
    [ "$CODE" = "200" ] && break
    sleep 2
  done
  echo "    /api/catalog -> HTTP $CODE (intento $i)"
  if [ "$FRONT_CODE" != "200" ] || [ "$CODE" != "200" ]; then
    echo "ERROR: la verificacion HTTP fallo; restaurando HTML anterior"
    [ ! -f "$REPO/.deploy/rollback-$STAMP/index.html" ] || cp -a "$REPO/.deploy/rollback-$STAMP/index.html" "$LIVE_DIR/index.html"
    [ ! -f "$REPO/.deploy/rollback-$STAMP/catalogo-index.html" ] || cp -a "$REPO/.deploy/rollback-$STAMP/catalogo-index.html" "$LIVE_DIR/catalogo/index.html"
    exit 1
  fi

  if ! node scripts/verify-assets.mjs "$LIVE_DIR" "https://corralonloseucaliptus.com"; then
    echo "ERROR: un asset nuevo no responde; restaurando HTML anterior"
    [ ! -f "$REPO/.deploy/rollback-$STAMP/index.html" ] || cp -a "$REPO/.deploy/rollback-$STAMP/index.html" "$LIVE_DIR/index.html"
    [ ! -f "$REPO/.deploy/rollback-$STAMP/catalogo-index.html" ] || cp -a "$REPO/.deploy/rollback-$STAMP/catalogo-index.html" "$LIVE_DIR/catalogo/index.html"
    exit 1
  fi

  find "$LIVE_DIR/assets" -type f -mtime +30 -delete
  docker image prune -f
  echo "==> deploy OK"
}

main "$@"
