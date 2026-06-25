#!/usr/bin/env python3
"""Seed / modify default locations and events in the database (Turso/libSQL).

This is an idempotent maintenance script: edit the ``DEFAULT_LOCATIONS`` and
``DEFAULT_EVENTS`` lists below and re-run it to upsert those rows.

  * Locations are upserted on their unique ``name`` (re-runs update in place).
  * Events use a deterministic id derived from the title, so re-runs update
    the same row instead of creating duplicates.
  * Events reference the seeded admin user as ``created_by`` and (optionally) a
    saved location by name (set ``location`` to a DEFAULT_LOCATIONS name to link
    ``location_id``; any other string is kept as free-text ``location_name``).
  * Rows listed in ``OBSOLETE_*`` are deleted on every run, so superseded
    defaults are cleaned up automatically.

It targets the **Turso** backend (the app's active DB). Connection comes from
the environment / ``.env.turso`` (``TURSO_DATABASE_URL`` + ``TURSO_AUTH_TOKEN``).

Usage:
    python scripts/seed_defaults.py            # apply changes
    python scripts/seed_defaults.py --dry-run  # show what would change
"""

from __future__ import annotations

import argparse
import asyncio
import os
import uuid
from pathlib import Path

# --- editable defaults -----------------------------------------------------

# The home ashrama: Avadhoota Datta Peetham, Mysuru. This is the default global
# location. Coordinates are the marker from the Google Maps place link.
DATTA_PEETHAM = "Sri Ganapathy Sachchidananda Ashrama - Avadhoota Datta Peetham"

# Global locations (is_global=1, not owned by any user). Mark exactly one with
# "is_default": 1 to make it the app's default/current location.
DEFAULT_LOCATIONS = [
    {
        "name": DATTA_PEETHAM,
        "description": (
            "Avadhoota Datta Peetham, Sri Ganapathy Sachchidananda Ashrama, "
            "Mysuru, Karnataka."
        ),
        "latitude": 12.284531,
        "longitude": 76.6583635,
        "is_default": 1,
    },
]

# Default published events — Sri Swamiji's 2026 calendar. Dates are ISO-8601
# (UTC) start dates and must be in the future (the app auto-deletes events
# dated before today); multi-day ranges are noted in the description. Set
# ``location`` to the DATTA_PEETHAM name to link an event to that saved
# location; any other string is stored as free-text ``location_name`` only.
DEFAULT_EVENTS = [
    {
        "title": "Sri Swamiji in Baton Rouge",
        "description": "Jul 2-6, 2026. Sri Swamiji in Baton Rouge.",
        "event_date": "2026-07-02T00:00:00+00:00",
        "location": "Baton Rouge, USA",
    },
    {
        "title": "Sri Swamiji in SGS Ashrama, Austin",
        "description": (
            "Jul 7-8, 2026. Programs at Maruti Datta Yoga Center, Austin. "
            "https://www.facebook.com/profile.php?id=61583467482131"
        ),
        "event_date": "2026-07-07T00:00:00+00:00",
        "location": "SGS Ashrama, Austin, Texas",
    },
    {
        "title": "Pujya Swamiji in SGS Ashrama, Houston",
        "description": (
            "Jul 9-13, 2026. Pujya Sri Swamiji at Hanuman Datta Yoga Center, "
            "Wallis, Texas. https://www.facebook.com/hanumandattayogacenter"
        ),
        "event_date": "2026-07-09T00:00:00+00:00",
        "location": "Hanuman Datta Yoga Center, Wallis, Texas",
    },
    {
        "title": "Pujya Swamiji in JDRC",
        "description": "Jul 13-17, 2026. Rest.",
        "event_date": "2026-07-13T00:00:00+00:00",
        "location": "JDRC",
    },
    {
        "title": "Pujya Swamiji in KSHT, Frisco, Dallas",
        "description": (
            "Jul 19 - Aug 2, 2026. Karya Siddhi Hanuman Temple, Frisco, Dallas. "
            "https://www.facebook.com/HanumanTemple"
        ),
        "event_date": "2026-07-19T00:00:00+00:00",
        "location": "Karya Siddhi Hanuman Temple (KSHT), Frisco, Dallas",
    },
    {
        "title": "Visit to Omaha, Nebraska",
        "description": (
            "Aug 5-7, 2026. Visit to the newly installed Marakata Hanuman "
            "shrine in Omaha, Nebraska."
        ),
        "event_date": "2026-08-05T00:00:00+00:00",
        "location": "Omaha, Nebraska",
    },
    {
        "title": "Pujya Swamiji visits SGS Ashrama, Fremont, CA",
        "description": (
            "Aug 7-9, 2026. SGS Ashrama, Fremont, CA. "
            "https://maps.app.goo.gl/yPepfGgHDEdxUQQb9"
        ),
        "event_date": "2026-08-07T00:00:00+00:00",
        "location": "SGS Ashrama, Fremont, CA",
    },
    {
        "title": "Pujya Swamiji visits Krishna Datta Hanuman Temple, Chicago",
        "description": (
            "Aug 10-13, 2026. Krishna Datta Hanuman Temple, Chicago. "
            "Map: https://maps.app.goo.gl/KSBvD3To1inkCne59 - "
            "Facebook: https://www.facebook.com/trinitydycpage"
        ),
        "event_date": "2026-08-10T00:00:00+00:00",
        "location": "Krishna Datta Hanuman Temple, Chicago",
    },
    {
        "title": "Niagara Ragasagara - music for meditation",
        "description": (
            "Aug 15, 2026. Niagara Ragasagara - music for meditation at Oakes "
            "Garden Theatre, Niagara (Canada side)."
        ),
        "event_date": "2026-08-15T00:00:00+00:00",
        "location": "Oakes Garden Theatre, Niagara, Canada",
    },
    {
        "title": "Programs at Hanuman temple, Erin, Canada",
        "description": (
            "Aug 20-23, 2026. Aug 20 (Thu) Narahari Teertha Aradhana; "
            "Aug 21 (Fri) Varamahalakshmi Vrata; Aug 22-23 programs at Hanuman "
            "Temple, Datta Yoga Center, 5422 Second Lane, Erin, ON L7J 2L9. "
            "Map: https://maps.app.goo.gl/hdGkEtmTK5VrtYPR7"
        ),
        "event_date": "2026-08-20T00:00:00+00:00",
        "location": "Hanuman Temple, Datta Yoga Center, Erin, ON, Canada",
    },
    {
        "title": "Programs in Basel, Switzerland",
        "description": (
            "Aug 28-30, 2026 - 50 Years of Sri Swamiji in Europe, Stadtcasino "
            "Basel. Aug 28 (Fri) 7:00 PM: Celebration of 50 Years; Aug 29 (Sat) "
            "7:00 PM: Datta Venu Raga Sagara Konzert; Aug 30 (Sun) 10:00 AM: "
            "Homa, Puja, Sri Swamiji's speech, Darshan. "
            "https://www.sgsbasel2026.org/en/home"
        ),
        "event_date": "2026-08-28T00:00:00+00:00",
        "location": "Stadtcasino Basel, Switzerland",
    },
    {
        "title": "Krishna Janmashtami Festival at Mysuru Ashrama",
        "description": (
            "Sep 4, 2026. Krishna Janmashtami Festival at the Mysuru Ashrama "
            "(Datta Peetham)."
        ),
        "event_date": "2026-09-04T00:00:00+00:00",
        "location": DATTA_PEETHAM,
    },
    {
        "title": "Ganapathy Festival in SGS Ashrama, Vijayawada",
        "description": (
            "Sep 13-14, 2026. Sep 13 (Sun) 6 PM: Swarna Gowri Vratam; Sep 14 "
            "(Mon) 9 AM onwards: Ksheerabhisheka to Kshipra Ganapathy Swami, "
            "Sahasra Modaka Ganapathy Homa, Varasiddhi Vinayaka Vratam."
        ),
        "event_date": "2026-09-13T00:00:00+00:00",
        "location": "SGS Ashrama, Vijayawada",
    },
    {
        "title": "Devi Navaratri Festival at Datta Peetham",
        "description": "Oct 11-20, 2026. Devi Navaratri Festival at Datta Peetham, Mysuru.",
        "event_date": "2026-10-11T00:00:00+00:00",
        "location": DATTA_PEETHAM,
    },
    {
        "title": "Pujya Swamiji in Nara, Japan",
        "description": (
            "Nov 25 - Dec 2, 2026. Nov 28 (Sat) 10 AM: Yoga Conference 'Sound, "
            "then Truth', JW Marriott Hotel, Nara; Nov 29 (Sun) 6 PM: Japan "
            "Ragasagara, Nara Kasugano International Forum. "
            "https://www.japanragasagara.com/en"
        ),
        "event_date": "2026-11-25T00:00:00+00:00",
        "location": "Nara, Japan",
    },
    {
        "title": "SDHS Volunteer camp at Vishwaroopa Datta Kshetra, Ganagapura",
        "description": (
            "Dec 15-17, 2026. SDHS Volunteer camp at Vishwaroopa Datta Kshetra, "
            "Ganagapura."
        ),
        "event_date": "2026-12-15T00:00:00+00:00",
        "location": "Vishwaroopa Datta Kshetra, Ganagapura",
    },
    {
        "title": "Vaikuntha Ekadashi & Gita Jayanti",
        "description": (
            "Dec 20, 2026. Vaikuntha Ekadashi at Sri Datta Venkateswara Temple, "
            "Mysuru; Gita Jayanti at Nada Mantapa."
        ),
        "event_date": "2026-12-20T00:00:00+00:00",
        "location": DATTA_PEETHAM,
    },
    {
        "title": "Dattatreya Jayanti at Datta Peetham, Mysuru",
        "description": (
            "Dec 21-23, 2026. Dattatreya Jayanti festival at Datta Peetham, "
            "Mysuru. Dec 21: Ksheerabhisheka & Punya Smarana; Dec 22: "
            "Panchamrita Abhisheka; Dec 23: Sahasra Kalasha Thailabhisheka to "
            "Dattatreya Swami on Datta Jayanti Purnima."
        ),
        "event_date": "2026-12-21T00:00:00+00:00",
        "location": DATTA_PEETHAM,
    },
]

# Previously-seeded defaults that have been superseded. Deleted on every run so
# the DB converges to exactly the lists above.
OBSOLETE_LOCATION_NAMES = [
    "ISKCON Bangalore",
    "ISKCON Mayapur",
    "ISKCON Vrindavan",
    "ISKCON Delhi",
    "ISKCON Juhu",
]
OBSOLETE_EVENT_TITLES = [
    "Jhulan Yatra",
    "Sri Krishna Janmashtami",
    "Radhastami",
    "Govardhan Puja",
    "Gita Jayanti",
]

# Stable namespace so an event title always maps to the same row id.
_EVENT_NS = uuid.uuid5(uuid.NAMESPACE_URL, "sgvd:default-event")


def _event_id(title: str) -> str:
    return str(uuid.uuid5(_EVENT_NS, title))


# --- env / app bootstrap ---------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_env_file(name: str) -> None:
    """Load KEY=VALUE lines from a repo-root env file into os.environ.

    Uses setdefault so real environment variables always win.
    """
    path = REPO_ROOT / name
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


# Make the Turso connection available before importing the app, and provide a
# throwaway SECRET_KEY (required by Settings but unused for DB access here).
_load_env_file(".env.turso")
_load_env_file(".env")
os.environ.setdefault("SECRET_KEY", "seed-defaults-script")

import sys

sys.path.insert(0, str(REPO_ROOT))

from app import turso  # noqa: E402
from app.config import settings  # noqa: E402


# --- seeding ---------------------------------------------------------------

async def ensure_tables() -> None:
    """Create the tables we touch if they don't exist (idempotent)."""
    for stmt in turso.SCHEMA:
        await turso.execute(stmt)


async def get_admin_id() -> str:
    admin_email = settings.ADMIN_EMAIL or "admin@example.com"
    row = await turso.fetch_one(
        "SELECT id FROM users WHERE email = ?", [admin_email]
    )
    if row is None:
        row = await turso.fetch_one(
            "SELECT id FROM users WHERE is_admin = 1 ORDER BY created_at LIMIT 1"
        )
    if row is None:
        raise SystemExit(
            "No admin user found to own events. Start the app once (it seeds an "
            "admin) or create one, then re-run."
        )
    return row["id"]


async def prune_obsolete(dry_run: bool) -> dict:
    removed_events = removed_locs = 0
    for title in OBSOLETE_EVENT_TITLES:
        ev_id = _event_id(title)
        existing = await turso.fetch_one("SELECT id FROM events WHERE id = ?", [ev_id])
        if existing:
            print(f"  [delete] obsolete event: {title}")
            if not dry_run:
                await turso.execute("DELETE FROM events WHERE id = ?", [ev_id])
            removed_events += 1
    for name in OBSOLETE_LOCATION_NAMES:
        existing = await turso.fetch_one(
            "SELECT id FROM saved_locations WHERE name = ?", [name]
        )
        if existing:
            print(f"  [delete] obsolete location: {name}")
            if not dry_run:
                await turso.execute("DELETE FROM saved_locations WHERE name = ?", [name])
            removed_locs += 1
    return {"locations": removed_locs, "events": removed_events}


async def seed_locations(dry_run: bool) -> dict:
    name_to_id: dict = {}
    inserted = updated = 0
    for loc in DEFAULT_LOCATIONS:
        is_default = int(loc.get("is_default", 0))
        existing = await turso.fetch_one(
            "SELECT id FROM saved_locations WHERE name = ?", [loc["name"]]
        )
        if dry_run:
            print(f"  [{'update' if existing else 'insert'}] location: {loc['name']}")
            if existing:
                name_to_id[loc["name"]] = existing["id"]
                updated += 1
            else:
                inserted += 1
            continue

        if existing:
            await turso.execute(
                "UPDATE saved_locations SET description = ?, latitude = ?, "
                "longitude = ?, is_default = ?, is_global = 1 WHERE name = ?",
                [loc["description"], loc["latitude"], loc["longitude"],
                 is_default, loc["name"]],
            )
            name_to_id[loc["name"]] = existing["id"]
            updated += 1
        else:
            new_id = turso.new_id()
            await turso.execute(
                "INSERT INTO saved_locations "
                "(id, user_id, name, description, latitude, longitude, is_default, is_global) "
                "VALUES (?, NULL, ?, ?, ?, ?, ?, 1)",
                [new_id, loc["name"], loc["description"], loc["latitude"],
                 loc["longitude"], is_default],
            )
            name_to_id[loc["name"]] = new_id
            inserted += 1
    return {"inserted": inserted, "updated": updated, "name_to_id": name_to_id}


async def seed_events(admin_id: str, name_to_id: dict, dry_run: bool) -> dict:
    inserted = updated = 0
    for ev in DEFAULT_EVENTS:
        ev_id = _event_id(ev["title"])
        location_name = ev.get("location")
        location_id = name_to_id.get(location_name)
        existing = await turso.fetch_one(
            "SELECT id FROM events WHERE id = ?", [ev_id]
        )
        if dry_run:
            print(f"  [{'update' if existing else 'insert'}] event: {ev['title']} @ {ev['event_date']}")
            inserted += 0 if existing else 1
            updated += 1 if existing else 0
            continue

        if existing:
            await turso.execute(
                "UPDATE events SET title = ?, description = ?, location_name = ?, "
                "location_id = ?, event_date = ?, is_published = 1 WHERE id = ?",
                [ev["title"], ev.get("description"), location_name, location_id,
                 ev["event_date"], ev_id],
            )
            updated += 1
        else:
            await turso.execute(
                "INSERT INTO events "
                "(id, title, description, location_name, location_id, event_date, created_by, is_published) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                [ev_id, ev["title"], ev.get("description"), location_name, location_id,
                 ev["event_date"], admin_id],
            )
            inserted += 1
    return {"inserted": inserted, "updated": updated}


async def main(dry_run: bool) -> None:
    print(f"Target: {settings.TURSO_DATABASE_URL}")
    if not settings.TURSO_AUTH_TOKEN:
        raise SystemExit(
            "TURSO_AUTH_TOKEN is not set. Put it in .env.turso / .env or export it."
        )
    if not dry_run:
        await ensure_tables()

    admin_id = await get_admin_id()
    print(f"Admin (created_by): {admin_id}\n")

    print("Prune obsolete:")
    prune_res = await prune_obsolete(dry_run)
    print("\nLocations:")
    loc_res = await seed_locations(dry_run)
    print("\nEvents:")
    ev_res = await seed_events(admin_id, loc_res["name_to_id"], dry_run)

    print(
        f"\n{'DRY RUN - no changes written' if dry_run else 'Done'}: "
        f"pruned -{prune_res['locations']} loc / -{prune_res['events']} ev, "
        f"locations +{loc_res['inserted']} / ~{loc_res['updated']}, "
        f"events +{ev_res['inserted']} / ~{ev_res['updated']}"
    )
    await turso.close_client()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="Show changes without writing."
    )
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
