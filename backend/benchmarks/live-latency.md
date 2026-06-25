# Live latency benchmark — SGVD-Backend on Vercel (Turso)

Target: **https://sgvd-backend-ten.vercel.app**
Method: real HTTPS requests, **fresh client per run** (so each run's first
request reflects a genuine Vercel function cold start after idle). 8
iterations per endpoint; warm median/p95 computed over iterations 2..N (the
first iteration of each endpoint is reported separately as **first**).

Checkpoints (minutes after start): [0, 10, 60, 120]. Read-only endpoints plus a
`japa` write to a throwaway bench user (cleaned up at the end). The destructive
write endpoints (events/bulk, locations/update) are excluded.

Started: 2026-06-24T20:55:58Z

---

## Run 0 — baseline (immediate)

_Time: 2026-06-24T20:56:46Z · idle gap before run: n/a (baseline)_

- **Function cold start** (first `GET /health` after idle): **449.4 ms**
- **First DB hit** (first `POST /auth/token` — Turso connect): **517.8 ms**

| endpoint | first (ms) | warm median | warm p95 | min | ok |
|---|--:|--:|--:|--:|--:|
| GET /health | 449.4 | 266.2 | 273.8 | 253.5 | 8/8 |
| POST /sgvd/auth/token (login) | 517.8 | 527.7 | 535.6 | 517.8 | 8/8 |
| GET /sgvd/config/app | 470.0 | 474.9 | 530.2 | 464.2 | 8/8 |
| GET /sgvd/events/ | 470.7 | 481.2 | 509.4 | 461.9 | 8/8 |
| GET /sgvd/locations | 477.7 | 485.8 | 491.7 | 456.9 | 8/8 |
| POST /sgvd/compass/bearing | 479.9 | 481.4 | 503.1 | 461.1 | 8/8 |
| GET /sgvd/spiritual/stats | 668.8 | 681.1 | 690.6 | 663.6 | 8/8 |
| GET /sgvd/spiritual/stats/today | 689.5 | 668.2 | 695.5 | 663.4 | 8/8 |
| POST /sgvd/spiritual/japa | 1346.7 | 1129.3 | 1191.5 | 1111.0 | 8/8 |
| GET /sgvd/admin/spiritual-stats | 667.1 | 686.1 | 706.1 | 664.1 | 8/8 |

## Run — +10 min after start

_Time: 2026-06-24T21:06:50Z · idle gap before run: ~10 min_

- **Function cold start** (first `GET /health` after idle): **6357.9 ms**
- **First DB hit** (first `POST /auth/token` — Turso connect): **580.6 ms**

| endpoint | first (ms) | warm median | warm p95 | min | ok |
|---|--:|--:|--:|--:|--:|
| GET /health | 6357.9 | 287.1 | 298.9 | 276.2 | 8/8 |
| POST /sgvd/auth/token (login) | 580.6 | 503.0 | 533.3 | 497.4 | 8/8 |
| GET /sgvd/config/app | 459.6 | 458.7 | 549.5 | 443.5 | 8/8 |
| GET /sgvd/events/ | 485.1 | 465.4 | 682.5 | 454.5 | 8/8 |
| GET /sgvd/locations | 458.6 | 459.1 | 527.7 | 451.5 | 8/8 |
| POST /sgvd/compass/bearing | 448.9 | 456.7 | 480.6 | 448.9 | 8/8 |
| GET /sgvd/spiritual/stats | 655.1 | 651.7 | 696.5 | 639.8 | 8/8 |
| GET /sgvd/spiritual/stats/today | 638.3 | 650.5 | 662.5 | 626.3 | 8/8 |
| POST /sgvd/spiritual/japa | 1076.1 | 1061.9 | 1071.2 | 1034.9 | 8/8 |
| GET /sgvd/admin/spiritual-stats | 668.7 | 641.1 | 657.1 | 630.8 | 8/8 |

## Run — +60 min after start

_Time: 2026-06-24T21:56:52Z · idle gap before run: ~50 min_

- **Function cold start** (first `GET /health` after idle): **6328.1 ms**
- **First DB hit** (first `POST /auth/token` — Turso connect): **592.3 ms**

| endpoint | first (ms) | warm median | warm p95 | min | ok |
|---|--:|--:|--:|--:|--:|
| GET /health | 6328.1 | 294.4 | 309.9 | 275.0 | 8/8 |
| POST /sgvd/auth/token (login) | 592.3 | 523.6 | 602.8 | 513.1 | 8/8 |
| GET /sgvd/config/app | 478.3 | 512.8 | 534.3 | 471.1 | 8/8 |
| GET /sgvd/events/ | 513.0 | 489.5 | 553.0 | 476.4 | 8/8 |
| GET /sgvd/locations | 476.2 | 473.4 | 550.0 | 458.4 | 8/8 |
| POST /sgvd/compass/bearing | 467.0 | 473.4 | 558.8 | 458.3 | 8/8 |
| GET /sgvd/spiritual/stats | 689.3 | 670.8 | 780.2 | 656.8 | 8/8 |
| GET /sgvd/spiritual/stats/today | 675.2 | 677.6 | 726.7 | 664.9 | 8/8 |
| POST /sgvd/spiritual/japa | 1125.3 | 1139.4 | 1185.0 | 1102.4 | 8/8 |
| GET /sgvd/admin/spiritual-stats | 677.9 | 677.9 | 710.3 | 658.8 | 8/8 |

## Run — +120 min after start

_Time: 2026-06-24T22:56:51Z · idle gap before run: ~60 min_

- **Function cold start** (first `GET /health` after idle): **6724.3 ms**
- **First DB hit** (first `POST /auth/token` — Turso connect): **592.2 ms**

| endpoint | first (ms) | warm median | warm p95 | min | ok |
|---|--:|--:|--:|--:|--:|
| GET /health | 6724.3 | 280.6 | 314.9 | 267.2 | 8/8 |
| POST /sgvd/auth/token (login) | 592.2 | 515.7 | 526.4 | 499.7 | 8/8 |
| GET /sgvd/config/app | 485.0 | 468.0 | 477.2 | 455.6 | 8/8 |
| GET /sgvd/events/ | 466.8 | 479.6 | 550.1 | 464.9 | 8/8 |
| GET /sgvd/locations | 521.6 | 454.5 | 557.4 | 452.9 | 8/8 |
| POST /sgvd/compass/bearing | 472.6 | 469.9 | 561.9 | 450.8 | 8/8 |
| GET /sgvd/spiritual/stats | 655.2 | 654.9 | 743.9 | 636.5 | 8/8 |
| GET /sgvd/spiritual/stats/today | 704.4 | 641.6 | 660.8 | 639.0 | 8/8 |
| POST /sgvd/spiritual/japa | 1121.8 | 1063.5 | 1078.0 | 1045.0 | 8/8 |
| GET /sgvd/admin/spiritual-stats | 659.6 | 651.9 | 698.4 | 647.6 | 8/8 |

---
_Bench user `bench_live_5f42da26@example.com` and its activity removed after the run._

## AFTER fixes — cold start re-measured (gated init_db + lazy import)

_Time: 2026-06-25T05:07:11Z · idle gap before cold hit: ~11 min · target: https://sgvd-backend-ten.vercel.app_

| metric | before (iad1, init on startup) | after |
|---|--:|--:|
| **cold start** `GET /health` | ~6357 ms | **5129 ms** |
| warm `GET /health` | ~287 ms | 278.6 ms |
| cold `GET /sgvd/events/` (DB) | ~485 ms | 1870 ms |
| warm `GET /sgvd/events/` (DB) | ~470 ms | 483.4 ms |

Warm reference captured pre-idle: health 295.8 ms, events 496.3 ms.
Note: DB latency is unchanged (function still in iad1; Mumbai co-location needs Vercel Pro region pinning).
