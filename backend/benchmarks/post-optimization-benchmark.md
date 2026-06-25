# Post-optimization latency benchmark (2026-06-25)

State at measurement: backend on the lazy-import refactor (cold start ~3.95 s),
Cloudflare reverse proxy live at `https://sgvd-proxy.sgvd-datta.workers.dev`.

> The direct-Vercel **cold start + warm latency** section is appended below by
> the `bench_final.py` probe (`## Post-optimization benchmark — <ts>`).

## Cloudflare edge cache vs direct Vercel

Cloudflare worker `wallTime` captured via `wrangler tail`; client traffic driven
through server-side fetch (PoP `MAA` / Chennai). Direct figures measured from
the dev machine (per-request, includes connection setup).

| route | direct Vercel (client) | via Cloudflare (cache HIT) | notes |
|---|--:|--:|---|
| `GET /sgvd/locations` | ~686 ms | **~13 ms** wall + client→PoP RTT | origin **not** contacted on HIT |
| `GET /sgvd/events/` | ~710 ms | **~13 ms** wall + client→PoP RTT | origin **not** contacted on HIT |
| passthrough (e.g. `/health`) | ~496 ms | ~391 ms wall (PoP→Vercel `iad1`) | transparent proxy, small added hop |

**Takeaway:** for the two hot reads, an edge HIT (~13 ms worker wall-time + a
nearby client→PoP RTT ≈ **~50 ms total**) replaces a ~**500–700 ms** round-trip
to Vercel `iad1`, i.e. **roughly 10× faster**, and bypasses backend cold starts
entirely for those endpoints. Cache verified `X-Cache: HIT` for both routes.

Caveat: the dev machine is behind a corporate Netskope proxy that blocks
`*.workers.dev`, so end-to-end client latency through the proxy must be measured
from an unproxied network/app; the worker-side `wallTime` above is exact.

## Post-optimization benchmark — 2026-06-25T06:50:58Z

Direct Vercel prod (final build, lazy-import refactor; Cloudflare proxy live separately).
Target: https://sgvd-backend-ten.vercel.app · idle before cold hit: ~11 min.

### Cold start (after ~11 min idle)
| metric | value |
|---|--:|
| **cold start total** `GET /health` | **3423 ms** |
| └ dep-tree import (`import_ms`) | 1283.6 ms |
| └ proc uptime at first request | 1610.5 ms |
| warm-after `GET /sgvd/events/` | 1784 ms |
| warm `GET /health` (post-cold median) | 504.0 ms |

### Warm latency (reused client, 8 iters)
| endpoint | median | p95 | min |
|---|--:|--:|--:|
| `/health` | 495.6 ms | 644.2 ms | 455.9 ms |
| `/sgvd/events/` | 709.8 ms | 895.5 ms | 671.0 ms |
| `/sgvd/locations` | 685.5 ms | 700.5 ms | 633.9 ms |
| `/sgvd/config/app` | 682.6 ms | 693.7 ms | 629.8 ms |
