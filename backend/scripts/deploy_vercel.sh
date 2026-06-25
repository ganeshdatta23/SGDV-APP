#!/usr/bin/env bash
# Deploy the FastAPI app to Vercel and sync the required environment variables.
#
# Requires a VALID, full-access Vercel token (the limited VERCEL_API_KEY in .env
# is not sufficient — `vercel` reports "token not valid" / cannot list teams).
# Create one at https://vercel.com/account/tokens.
#
# Usage:
#   VERCEL_TOKEN=xxxx ./scripts/deploy_vercel.sh            # preview deploy
#   VERCEL_TOKEN=xxxx ./scripts/deploy_vercel.sh --prod     # production deploy
#
# It reads connection/secret values from .env (repo root).
set -euo pipefail

cd "$(dirname "$0")/.."

: "${VERCEL_TOKEN:?Set VERCEL_TOKEN to a valid full-access Vercel token}"

PROD_FLAG=""
TARGET="preview"
if [[ "${1:-}" == "--prod" || "${1:-}" == "production" ]]; then
  PROD_FLAG="--prod"
  TARGET="production"
fi

VC="npx --yes vercel@latest"

# When the token belongs to a team, the CLI needs an explicit scope in
# non-interactive mode. Set VERCEL_SCOPE to the team slug (e.g. VERCEL_SCOPE=sgdv).
SCOPE_FLAG=""
if [[ -n "${VERCEL_SCOPE:-}" ]]; then
  SCOPE_FLAG="--scope=${VERCEL_SCOPE}"
fi

# Load KEY=VALUE pairs from an env file (ignores comments/blank lines).
load_env() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  while IFS='=' read -r key value; do
    key="$(echo "$key" | xargs)"
    [[ -z "$key" || "$key" == \#* ]] && continue
    export "$key=$(echo "$value" | sed -e 's/^ *//' -e 's/ *$//')"
  done < "$f"
}
load_env .env

# Project name must be lowercase; the directory (SGVD-Backend) isn't valid.
VERCEL_PROJECT="${VERCEL_PROJECT:-sgvd-backend}"

echo ">> Linking project (creates it if missing)..."
$VC link --yes --project "$VERCEL_PROJECT" $SCOPE_FLAG --token="$VERCEL_TOKEN"

# Env vars the app needs at runtime. DB_BACKEND=turso forces the libSQL path.
set_env() {
  local name="$1" val="$2"
  [[ -z "$val" ]] && { echo "   skip $name (empty)"; return; }
  # Remove then add so re-runs update the value.
  echo "$val" | $VC env rm "$name" "$TARGET" --yes $SCOPE_FLAG --token="$VERCEL_TOKEN" >/dev/null 2>&1 || true
  printf '%s' "$val" | $VC env add "$name" "$TARGET" $SCOPE_FLAG --token="$VERCEL_TOKEN"
}

echo ">> Setting environment variables ($TARGET)..."
set_env DB_BACKEND "turso"
set_env TURSO_DATABASE_URL "${TURSO_DATABASE_URL:-}"
set_env TURSO_AUTH_TOKEN "${TURSO_AUTH_TOKEN:-}"
set_env SECRET_KEY "${SECRET_KEY:-}"
set_env ADMIN_EMAIL "${ADMIN_EMAIL:-admin@example.com}"
set_env ADMIN_PASSWORD "${ADMIN_PASSWORD:-ChangeMe123!}"

echo ">> Deploying ($TARGET)..."
$VC deploy $PROD_FLAG --yes $SCOPE_FLAG --token="$VERCEL_TOKEN"
echo ">> Done."
