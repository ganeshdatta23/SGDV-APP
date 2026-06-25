#!/usr/bin/env python3
"""Inspect the live Turso (libSQL) database — counts and recent rows.

Read-only. Useful for confirming what the app actually wrote.

Usage:
    python scripts/check_db.py                # summary + recent rows
    python scripts/check_db.py --table users  # dump one table (latest 50)
    python scripts/check_db.py --limit 10     # change row limit
    python scripts/check_db.py --sql "SELECT ..."   # run an ad-hoc read query
"""

from __future__ import annotations

import argparse
import asyncio

from _env import bootstrap

bootstrap()

from app import turso  # noqa: E402
from app.config import settings  # noqa: E402

TABLES = [
    "users",
    "saved_locations",
    "spiritual_activity",
    "spiritual_activity_history",
    "events",
    "app_config",
]

# A readable subset of columns per table for the "recent rows" view.
PREVIEW = {
    "users": "id, email, username, is_admin, is_active, created_at",
    "saved_locations": "id, name, latitude, longitude, is_default, is_global, created_at",
    "spiritual_activity": "user_id, activity_date, japa_count, pranayama_count, darshan_count, updated_at",
    "spiritual_activity_history": "user_id, activity_type, count_added, activity_date, logged_at",
    "events": "id, title, event_date, is_published, location_name",
    "app_config": "id, app_version, expiry_date, updated_at",
}

ORDER_BY = {
    "users": "created_at DESC",
    "saved_locations": "created_at DESC",
    "spiritual_activity": "updated_at DESC",
    "spiritual_activity_history": "logged_at DESC",
    "events": "event_date ASC",
    "app_config": "id ASC",
}


def _print_rows(rows) -> None:
    if not rows:
        print("    (no rows)")
        return
    for r in rows:
        print("    " + " | ".join(f"{k}={r[k]}" for k in r.keys()))


async def dump_table(table: str, limit: int) -> None:
    cols = PREVIEW.get(table, "*")
    order = ORDER_BY.get(table, "rowid DESC")
    rows = await turso.fetch_all(
        f"SELECT {cols} FROM {table} ORDER BY {order} LIMIT ?", [limit]
    )
    print(f"\n== {table} (latest {limit}) ==")
    _print_rows(rows)


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--table", help="Dump a single table only")
    parser.add_argument("--limit", type=int, default=50, help="Max rows to show")
    parser.add_argument("--sql", help="Run an ad-hoc read-only SQL query")
    args = parser.parse_args()

    print(f"DB: {settings.TURSO_DATABASE_URL}")
    if not settings.TURSO_AUTH_TOKEN:
        raise SystemExit("TURSO_AUTH_TOKEN is not set (.env.turso / .env / env).")

    try:
        if args.sql:
            rows = await turso.fetch_all(args.sql)
            print(f"\n== query ({len(rows)} rows) ==")
            _print_rows(rows)
            return

        if args.table:
            await dump_table(args.table, args.limit)
            return

        print("\n== row counts ==")
        for t in TABLES:
            try:
                row = await turso.fetch_one(f"SELECT COUNT(*) AS n FROM {t}")
                print(f"    {t:32} {row['n']}")
            except Exception as exc:  # table may not exist yet
                print(f"    {t:32} (error: {exc})")

        for t in TABLES:
            await dump_table(t, min(args.limit, 10))
    finally:
        await turso.close_client()


if __name__ == "__main__":
    asyncio.run(main())
