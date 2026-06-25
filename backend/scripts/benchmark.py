#!/usr/bin/env python3
"""Per-endpoint latency benchmark against the live Turso DB.

Runs the FastAPI app in-process (httpx ASGI transport) so timings reflect the
real app -> Turso round-trips without HTTP-server overhead. For each endpoint
it reports:

  * cold       - first call (lazy libSQL client creation + TLS + first query)
  * warm_med   - median of N warm calls
  * warm_p95   - 95th percentile of the warm calls
  * post_sleep - first call after an idle sleep (a "warm restart": the pooled
                 HTTP connection to Turso has gone idle and is re-established)

Usage:
    python scripts/benchmark.py                 # 20 warm calls, 45s sleep
    python scripts/benchmark.py --warm 30 --sleep 60
    python scripts/benchmark.py --no-sleep      # skip the warm-restart phase

Creates one throwaway benchmark user and deletes it (plus its activity) at the
end, so it does not pollute the database.
"""

from __future__ import annotations

import argparse
import asyncio
import statistics
import time
import uuid

from _env import bootstrap

bootstrap()

import httpx  # noqa: E402

from app import turso  # noqa: E402
from app.config import settings  # noqa: E402
from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402


async def timed(client, method, url, **kw):
    t0 = time.perf_counter()
    resp = await client.request(method, url, **kw)
    dt = (time.perf_counter() - t0) * 1000.0
    return dt, resp


async def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--warm", type=int, default=20, help="warm iterations per endpoint")
    parser.add_argument("--sleep", type=int, default=45, help="idle seconds before warm-restart pass")
    parser.add_argument("--no-sleep", action="store_true", help="skip the warm-restart pass")
    args = parser.parse_args()

    print(f"DB: {settings.TURSO_DATABASE_URL}")
    print(f"warm iterations={args.warm}  sleep={0 if args.no_sleep else args.sleep}s\n")

    await init_db()

    transport = httpx.ASGITransport(app=app)
    bench_email = f"bench_{uuid.uuid4().hex[:8]}@example.com"
    bench_user_id = None

    async with httpx.AsyncClient(transport=transport, base_url="http://bench") as c:
        # --- setup: a normal user + tokens (not part of the measured set) ---
        r = await c.post("/sgvd/auth/register", json={
            "email": bench_email, "username": "bench_" + uuid.uuid4().hex[:8],
            "password": "password123", "full_name": "Bench"})
        bench_user_id = r.json()["id"]
        r = await c.post("/sgvd/auth/token", data={"username": bench_email, "password": "password123"})
        uh = {"Authorization": f"Bearer {r.json()['access_token']}"}
        r = await c.post("/sgvd/auth/token", data={
            "username": settings.ADMIN_EMAIL or "admin@example.com",
            "password": settings.ADMIN_PASSWORD or "ChangeMe123!"})
        ah = {"Authorization": f"Bearer {r.json()['access_token']}"}

        # endpoint = (label, method, url, kwargs)
        endpoints = [
            ("GET  /health", "GET", "/health", {}),
            ("POST /auth/token (login)", "POST", "/sgvd/auth/token",
             {"data": {"username": bench_email, "password": "password123"}}),
            ("POST /spiritual/japa", "POST", "/sgvd/spiritual/japa",
             {"json": {"count": 1}, "headers": uh}),
            ("GET  /spiritual/stats", "GET", "/sgvd/spiritual/stats", {"headers": uh}),
            ("GET  /spiritual/stats/today", "GET", "/sgvd/spiritual/stats/today", {"headers": uh}),
            ("GET  /events/", "GET", "/sgvd/events/", {}),
            ("GET  /locations", "GET", "/sgvd/locations", {}),
            ("POST /compass/bearing", "POST", "/sgvd/compass/bearing",
             {"json": {"current_lat": 13.0, "current_lon": 77.6}}),
            ("GET  /config/app", "GET", "/sgvd/config/app", {}),
            ("GET  /admin/spiritual-stats", "GET", "/sgvd/admin/spiritual-stats", {"headers": ah}),
        ]

        results = {}

        # --- cold + warm ---
        for label, method, url, kw in endpoints:
            cold, resp = await timed(c, method, url, **kw)
            status = resp.status_code
            warm = []
            for _ in range(args.warm):
                dt, _ = await timed(c, method, url, **kw)
                warm.append(dt)
            results[label] = {
                "status": status,
                "cold": cold,
                "warm_med": statistics.median(warm),
                "warm_p95": sorted(warm)[max(0, int(len(warm) * 0.95) - 1)],
                "post_sleep": None,
            }

        # --- warm restart after idle ---
        if not args.no_sleep:
            print(f"Sleeping {args.sleep}s to let connections go idle...\n")
            await asyncio.sleep(args.sleep)
            for label, method, url, kw in endpoints:
                ps, _ = await timed(c, method, url, **kw)
                results[label]["post_sleep"] = ps

        # --- cleanup throwaway user ---
        if bench_user_id:
            await turso.execute("DELETE FROM spiritual_activity_history WHERE user_id = ?", [bench_user_id])
            await turso.execute("DELETE FROM spiritual_activity WHERE user_id = ?", [bench_user_id])
            await turso.execute("DELETE FROM users WHERE id = ?", [bench_user_id])

    await turso.close_client()

    # --- report ---
    print(f"{'endpoint':32} {'st':>3} {'cold':>9} {'warm_med':>9} {'warm_p95':>9} {'post_sleep':>11}")
    print("-" * 80)
    for label, m in results.items():
        ps = f"{m['post_sleep']:.1f}" if m["post_sleep"] is not None else "-"
        print(f"{label:32} {m['status']:>3} {m['cold']:>8.1f}m {m['warm_med']:>8.1f}m "
              f"{m['warm_p95']:>8.1f}m {ps:>10}m")
    print("\n(all times in ms; in-process ASGI, real Turso round-trips)")


if __name__ == "__main__":
    asyncio.run(run())
