# Cold-start analysis & optimization — SGVD-Backend on Vercel (Turso)

Target: **https://sgvd-backend-ten.vercel.app** · Plan: Vercel Hobby · Region: `iad1`
(Fluid Compute is already enabled at the project level.)

## TL;DR

The serverless cold start was ~4.9–6.7 s. Profiling showed the **Python
dependency-tree import is the dominant, addressable cost** — ~2.7 s on Vercel's
cold filesystem, i.e. **~56 % of the cold start**. The single biggest chunk was
**SQLAlchemy**, which the live Turso backend never uses at runtime (it talks raw
libSQL). We made SQLAlchemy + the ORM models **lazy / Postgres-only**, so they
no longer load on the Turso cold path.

The rest of the cold start (~1.8 s container/runtime provisioning + network) is
**not addressable from app code** on this plan.

## How we measured

Added a tiny boot probe to `app/main.py`: a `_PROC_START` stamp at the top of
module import and `import_ms` (full dependency-tree import time) surfaced via
`/health`. A background probe captures a warm baseline, idles ~11 min to force
scale-to-zero, then measures a genuine cold hit (client `time_total` + boot
fields).

### Import profile (local, `python -X importtime`)

| package | self ms | % of import | on Turso runtime? |
|---|--:|--:|---|
| **sqlalchemy** | 68 | 24 % | **never** — raw libSQL is used |
| fastapi | 53 | 19 % | yes (framework) |
| app (our code) | 31 | 11 % | yes |
| pydantic | 18 | 6 % | yes |
| cryptography | 12 | 4 % | yes (JWT) — too small to bother |

Local full `import app.main`: **263 ms → 195 ms** after the refactor; and
`sqlalchemy in sys.modules` is now **False** after import on the Turso path.

## What changed

- `app/database.py`: `Base` is built lazily via module `__getattr__` (PEP 562);
  the async engine/session imports moved inside the `if not use_turso` branch.
- `app/services/*`, `app/api/*`, `app/utils/auth_dependency.py`: SQLAlchemy and
  ORM-model imports moved to `TYPE_CHECKING` (annotations) + lazy imports inside
  the Postgres `else` branches. `from __future__ import annotations` keeps type
  hints without importing the types at runtime.
- `app/schemas/events.py`: removed a dead `from app.models.event import Event`.
- No behavior change on either backend; the Postgres path is unchanged at
  runtime, just imported on demand.

All 19 live endpoints pass (read paths, auth, spiritual writes, admin, `/docs`)
both locally (uvicorn + real Turso) and on the deployed build.

## Results (Vercel cold start, ~11 min idle, genuine scale-to-zero)

| metric | BEFORE (pre-refactor) | AFTER (lazy imports) | Δ |
|---|--:|--:|--:|
| **cold start** total `GET /health` | **4.88 s** | **3.95 s** | **−0.93 s (−19 %)** |
| cold `import_ms` (dep-tree import) | **2721 ms** | **1687 ms** | **−1034 ms (−38 %)** |
| warm `GET /health` | ~0.45 s | ~0.45 s | unchanged |
| warm `GET /sgvd/events/` (Turso) | ~0.45 s | ~0.45 s | unchanged |

Cumulative with the earlier fixes (gate `init_db` off the cold path; lazy
`scalar_fastapi` import), the cold start went from **~6.4 s → ~3.95 s (≈ 38 %
faster)**.

> Warm latency is unchanged — this work only targets the cold path. DB latency
> is also unchanged (function still in `iad1`, ~12,000 km from Turso Mumbai;
> co-location needs Vercel Pro region pinning to `bom1`).

## Not worth doing (measured & rejected)

- **Lazy-loading `cryptography`/`jose`** — only ~3–12 ms locally; negligible.
- **Build-config migration "for Fluid Compute"** — Fluid is already on; it does
  not help a function that has scaled to zero after idle (the cold boot is paid
  regardless). It would also risk a working prod deploy.

## Remaining levers (need account/plan changes, not code)

1. **Vercel Pro + `bom1` region pinning** — co-locate the function with Turso
   Mumbai; saves ~250–450 ms per DB round-trip (separate from cold start).
2. The residual ~1.8 s container/runtime provisioning is platform-side and not
   reducible from application code on Hobby.
