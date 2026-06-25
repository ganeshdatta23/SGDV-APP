#!/usr/bin/env python3
"""End-to-end smoke test of every endpoint against the live Turso DB.

Runs the FastAPI app in-process (httpx ASGI transport) and exercises auth,
spiritual logging/stats, user profile, events, locations, compass, admin stats,
and config. Exits non-zero on the first failure. Creates one throwaway user and
deletes it (and its activity) at the end.

Usage:
    python scripts/smoke_test.py
"""

from __future__ import annotations

import asyncio
import sys
import uuid

from _env import bootstrap

bootstrap()

import httpx  # noqa: E402

from app import turso  # noqa: E402
from app.config import settings  # noqa: E402
from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402


def check(label, resp, expect=200):
    ok = resp.status_code == expect
    body = resp.text if len(resp.text) <= 200 else resp.text[:200] + "..."
    print(f"[{'OK ' if ok else 'FAIL'}] {label}: {resp.status_code}  {body}")
    if not ok:
        raise SystemExit(f"FAILED at {label}")
    return resp


async def main() -> int:
    await init_db()
    transport = httpx.ASGITransport(app=app)
    email = f"smoke_{uuid.uuid4().hex[:8]}@example.com"
    user_id = None

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        check("health", await c.get("/health"))

        r = check("register", await c.post("/sgvd/auth/register", json={
            "email": email, "username": "smoke_" + uuid.uuid4().hex[:8],
            "password": "password123", "full_name": "Smoke"}))
        user_id = r.json()["id"]

        r = check("login", await c.post("/sgvd/auth/token", data={
            "username": email, "password": "password123"}))
        uh = {"Authorization": f"Bearer {r.json()['access_token']}"}

        check("japa", await c.post("/sgvd/spiritual/japa", json={"count": 5}, headers=uh))
        check("pranayama", await c.post("/sgvd/spiritual/pranayama", json={"count": 3}, headers=uh))
        check("darshan", await c.post("/sgvd/spiritual/darshan", json={"count": 1}, headers=uh))
        check("stats", await c.get("/sgvd/spiritual/stats", headers=uh))
        check("stats/today", await c.get("/sgvd/spiritual/stats/today", headers=uh))
        check("profile", await c.get(f"/sgvd/users/profile/{user_id}"))

        r = check("admin login", await c.post("/sgvd/auth/token", data={
            "username": settings.ADMIN_EMAIL or "admin@example.com",
            "password": settings.ADMIN_PASSWORD or "ChangeMe123!"}))
        ah = {"Authorization": f"Bearer {r.json()['access_token']}"}

        check("events bulk", await c.post("/sgvd/events/bulk", headers=ah, json={"events": [
            {"title": "Smoke Event", "description": "test", "location_name": "X",
             "event_date": "2099-01-01T10:00:00Z"}]}))
        check("events list", await c.get("/sgvd/events/"))
        check("location update", await c.post("/sgvd/locations/update", headers=ah, params={
            "name": "Smoke Loc", "description": "test",
            "google_maps_url": "https://www.google.com/maps/place/X/@12.9716,77.5946,15z"}))
        check("locations", await c.get("/sgvd/locations"))
        check("compass", await c.post("/sgvd/compass/bearing",
                                      json={"current_lat": 13.0, "current_lon": 77.6}))
        check("admin stats", await c.get("/sgvd/admin/spiritual-stats", headers=ah))
        check("admin stats filter", await c.get(
            "/sgvd/admin/spiritual-stats?filter_by=japa_count&filter_value=min:1", headers=ah))
        check("admin user detail", await c.get(f"/sgvd/admin/spiritual-stats/{user_id}", headers=ah))
        check("config get", await c.get("/sgvd/config/app"))

        # cleanup throwaway user + its activity + the smoke event
        await turso.execute("DELETE FROM spiritual_activity_history WHERE user_id = ?", [user_id])
        await turso.execute("DELETE FROM spiritual_activity WHERE user_id = ?", [user_id])
        await turso.execute("DELETE FROM users WHERE id = ?", [user_id])
        await turso.execute("DELETE FROM events WHERE title = 'Smoke Event'")

    await turso.close_client()
    print("\nALL SMOKE TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
