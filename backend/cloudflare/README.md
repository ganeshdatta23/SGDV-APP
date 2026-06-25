# Cloudflare reverse proxy (stable URL in front of the backend)

A tiny Cloudflare **Worker** that sits in front of the backend so clients hit a
**stable URL that never changes**. If the backend URL moves (new Vercel
deployment, different host, even a different provider), you only update the
Worker's `ORIGIN` variable — clients keep using the same `*.workers.dev` (or
custom-domain) URL.

```
mobile app ──▶ https://sgvd-proxy.sgvd-datta.workers.dev ──▶ ORIGIN (Vercel)
                         (stable, never changes)             (swappable)
```

**Status:** DEPLOYED and verified — `https://sgvd-proxy.sgvd-datta.workers.dev`
(account `amardattadola2@gmail.com`). Pass-through + caching confirmed working
on `workers.dev` (both `/sgvd/locations` and `/sgvd/events/` serve `X-Cache: HIT`
from the edge — verified via `wrangler tail`).

## Files
- `worker-proxy.js` — the proxy + caching logic (module Worker).
- `wrangler.jsonc` — Wrangler config (name, origin/cache vars). **Preferred** deploy.
- `deploy_worker.sh` — legacy raw-API deploy (fallback if `wrangler` is unavailable).

## Deploy (Wrangler — preferred)
```bash
cd cloudflare
wrangler deploy            # uses wrangler.jsonc; needs `wrangler login` once
wrangler tail sgvd-proxy   # watch live logs (incl. the X-Cache decision)
```
Change the backend it points at by editing `vars.ORIGIN` in `wrangler.jsonc`
(or `wrangler deploy --var ORIGIN:https://new-host`), then redeploy.

> First-time accounts must register a `workers.dev` subdomain once (done here:
> `sgvd-datta`). Wrangler prompts for it interactively, or:
> `PUT /accounts/{id}/workers/subdomain {"subdomain":"<name>"}`.

### Legacy API deploy
`./cloudflare/deploy_worker.sh` deploys via the raw Cloudflare API and needs a
token with **`Workers Scripts: Edit`** (the "Edit Cloudflare Workers" template).
Only needed where `wrangler` can't run.

## Caching policy
Caching is **per-endpoint**, edge-only by default:

| route | cached? | edge TTL |
|---|---|---|
| `GET /sgvd/locations` | ✅ | `CACHE_TTL` (default 3600s = 1h) |
| `GET /sgvd/events`    | ✅ | `CACHE_TTL` (default 3600s = 1h) |
| everything else (auth, spiritual, admin, writes, …) | ❌ | pass-through |

Rules baked in (decided with the owner):
- Only **GET** is cached; only **2xx** responses are cached.
- Requests with an **`Authorization`** header are never served from cache.
- **Edge-only:** clients receive `Cache-Control: no-store` (`BROWSER_TTL=0`), so
  the app always gets edge-fresh data and freshness stays server-controlled.
- **Serve-stale-on-error:** if the origin is down or returns a non-2xx on a
  cached route, the Worker serves the last good cached copy (entries are
  retained ~24h; the 1h freshness window is tracked with an internal stamp).

### TTL semantics (how the 1h clock works)
- **Fill-based:** the countdown starts when an edge first fetches the URL from
  origin (a cache **MISS**) — not at deploy time. Within the window, requests
  are served from the edge and the origin is **not** contacted.
- **Fixed window, not sliding:** hits during the hour do not extend it. After
  `CACHE_TTL` the entry expires and the next request re-fetches (re-filling the
  clock).
- **Per data center (PoP):** each Cloudflare location caches independently, so
  the first visitor in each region triggers that region's fill.
- Observe it via the `X-Cache` response header: `MISS` (first fill) → `HIT`
  (served from edge) → `REVALIDATED` (refetched after TTL) → `STALE` (origin
  failed, last good copy served).

### Tunables (Worker vars, set in `wrangler.jsonc`)
| var | default | meaning |
|---|---|---|
| `ORIGIN` | Vercel URL | backend base URL |
| `CACHE_TTL` | `3600` | edge TTL (seconds) for cached routes |
| `CACHE_PATHS` | `/sgvd/locations,/sgvd/events` | exact paths to cache |
| `BROWSER_TTL` | `0` | `Cache-Control: max-age` sent to clients (0 = edge-only) |

### Invalidation caveat (writes)
On a `*.workers.dev` URL there is **no zone**, so the edge cache **cannot be
purged by URL** via API. After an admin updates events/locations, the change
appears only when the 1h TTL expires. If you need instant freshness on write,
the options are: (a) lower `CACHE_TTL`, (b) move to a **custom domain** (a
Cloudflare zone), which unlocks URL purge so the app can purge on write, or
(c) add a version/cache-bust query param the app bumps on change.
