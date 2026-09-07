#!/usr/bin/env bash
# Despliega apps/web a Netlify desde un contenedor Linux.
# Por qué: en Windows sin administrador, el build "standalone" que exige el runtime de Netlify falla al crear symlinks
# (EPERM). En Linux funciona. El contenedor clona el repo (no toca node_modules ni el servidor de desarrollo local)
# y usa la sesión ya autenticada del CLI de Netlify del host, montada de solo lectura; el token nunca se imprime.
#
# Uso (Git Bash, desde la raíz del repo, con Docker Desktop corriendo y `netlify login` hecho):
#   bash scripts/deploy-web-docker.sh
# Variables opcionales: NETLIFY_SITE_ID (por defecto el sitio bitacora-aromante), REPO (ruta del repo).
set -euo pipefail
REPO="${REPO:-$(cd "$(dirname "$0")/.." && pwd -W 2>/dev/null || pwd)}"
SITE="${NETLIFY_SITE_ID:-9a543e76-f3cf-4bc9-b750-38871a198bcb}"
NCFG="${NETLIFY_CONFIG_DIR:-$APPDATA/netlify/Config}"
[ -f "$NCFG/config.json" ] || { echo "No hay sesión del CLI de Netlify en $NCFG (corre 'netlify login')"; exit 1; }

INNER='set -euo pipefail
export CI=1
mkdir -p /root/.config/netlify && cp /netlify-host/config.json /root/.config/netlify/config.json
git clone -q /work /src && cd /src && git log --oneline -1
corepack enable >/dev/null 2>&1 || true
corepack pnpm install --frozen-lockfile --reporter=silent
npm install -g --silent netlify-cli@27 >/dev/null 2>&1
netlify deploy --prod --filter @agentes-meta/web --site "$NETLIFY_SITE_ID" --message "deploy $(git rev-parse --short HEAD)" </dev/null 2>&1 | grep -vE "^\s*$" | grep -viE "token"'

MSYS_NO_PATHCONV=1 docker run --rm \
  -e NETLIFY_SITE_ID="$SITE" \
  -v "$REPO:/work:ro" \
  -v "$NCFG:/netlify-host:ro" \
  node:24-bookworm bash -c "$INNER"
