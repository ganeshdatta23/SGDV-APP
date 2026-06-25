#!/usr/bin/env bash
# Deploy the SGVD reverse-proxy Worker to Cloudflare and expose a STABLE
# workers.dev URL in front of the backend (currently the Vercel deployment).
#
# Requires an API token with **Workers Scripts: Edit** (plus Account Settings
# Read). Easiest: create one from the "Edit Cloudflare Workers" template at
# https://dash.cloudflare.com/profile/api-tokens — that bundles Workers
# Scripts:Edit, Workers KV:Edit, Workers Routes:Edit and workers.dev rights.
#
# Reads the token from CLOUDFLARE_API_TOKEN, else CLOUDFLARE_API_KEY in the
# repo-root .env. Tunables via env: WORKER_NAME, ORIGIN, CACHE_TTL,
# CACHE_PATHS, BROWSER_TTL, PROGRAMS_TIMEZONE.
#
# Usage:
#   ./cloudflare/deploy_worker.sh
#   ORIGIN=https://new-backend.example.app ./cloudflare/deploy_worker.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$TOKEN" && -f .env ]]; then
  TOKEN="$(grep -E '^CLOUDFLARE_API_KEY=' .env | head -1 | cut -d= -f2- | xargs)"
fi
: "${TOKEN:?Set CLOUDFLARE_API_TOKEN or put CLOUDFLARE_API_KEY in .env}"

NAME="${WORKER_NAME:-sgvd-api}"
ORIGIN="${ORIGIN:-https://sgvd-backend-ten.vercel.app}"
CACHE_TTL="${CACHE_TTL:-3600}"
CACHE_PATHS="${CACHE_PATHS:-/sgvd/locations,/sgvd/events}"
BROWSER_TTL="${BROWSER_TTL:-0}"
PROGRAMS_TIMEZONE="${PROGRAMS_TIMEZONE:-Asia/Kolkata}"
API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer $TOKEN")

ACCT="$(curl -s "${AUTH[@]}" "$API/accounts" \
  | python3 -c "import sys,json;print((json.load(sys.stdin).get('result') or [{}])[0].get('id',''))")"
: "${ACCT:?Could not resolve account id (token lacks account access?)}"
echo ">> account=$ACCT  worker=$NAME  origin=$ORIGIN  cache_ttl=${CACHE_TTL}s  paths=$CACHE_PATHS"

META="$(python3 - "$ORIGIN" "$CACHE_TTL" "$CACHE_PATHS" "$BROWSER_TTL" "$PROGRAMS_TIMEZONE" <<'PY'
import json,sys
origin,ttl,paths,bttl,programs_tz=sys.argv[1:6]
print(json.dumps({
  "main_module":"worker-proxy.js",
  "compatibility_date":"2024-11-01",
  "bindings":[
    {"type":"plain_text","name":"ORIGIN","text":origin},
    {"type":"plain_text","name":"CACHE_TTL","text":ttl},
    {"type":"plain_text","name":"CACHE_PATHS","text":paths},
    {"type":"plain_text","name":"BROWSER_TTL","text":bttl},
    {"type":"plain_text","name":"PROGRAMS_TIMEZONE","text":programs_tz},
  ],
}))
PY
)"

echo ">> uploading worker script..."
curl -s -X PUT "${AUTH[@]}" "$API/accounts/$ACCT/workers/scripts/$NAME" \
  -F "metadata=$META;type=application/json" \
  -F "worker-proxy.js=@cloudflare/worker-proxy.js;type=application/javascript+module" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('   upload:',d.get('success'),d.get('errors') or '')"

SUB="$(curl -s "${AUTH[@]}" "$API/accounts/$ACCT/workers/subdomain" \
  | python3 -c "import sys,json;print((json.load(sys.stdin).get('result') or {}).get('subdomain',''))")"
if [[ -z "$SUB" ]]; then
  echo "!! No workers.dev subdomain on this account yet."
  echo "   Set one once (global, permanent) e.g.:"
  echo "   curl -X PUT \"\${API}/accounts/$ACCT/workers/subdomain\" \\"
  echo "     -H \"Authorization: Bearer \$TOKEN\" -H 'Content-Type: application/json' \\"
  echo "     --data '{\"subdomain\":\"amardattadola2\"}'"
else
  echo ">> enabling workers.dev route..."
  curl -s -X POST "${AUTH[@]}" "$API/accounts/$ACCT/workers/scripts/$NAME/subdomain" \
    -H "Content-Type: application/json" --data '{"enabled":true}' \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('   route:',d.get('success'),d.get('errors') or '')"
  echo ""
  echo ">> Stable URL:  https://$NAME.$SUB.workers.dev"
  echo "   (point clients here; change ORIGIN + redeploy if the backend URL moves)"
fi
echo ">> Done."
