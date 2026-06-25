"""Turso (libSQL) async backend.

Pure-Python access to Turso over HTTP via ``libsql-client`` (no native/Rust
deps, deploys cleanly on Vercel serverless). Active when ``settings.use_turso``
is true. This is the async replacement for the SQLAlchemy ORM on migrated
routers; results are returned as :class:`Record` objects that behave as both
mappings (for ``Model.model_validate(record)``) and attribute bags (for
``record.field`` access used by FastAPI dependencies).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Iterable, List, Optional

import libsql_client

from app.config import settings

_client: Optional[libsql_client.Client] = None


class Record(dict):
    """A dict that also supports attribute access.

    Pydantic treats it as a mapping (validates by key), while application
    code can use ``record.field`` exactly like an ORM object.
    """

    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError as exc:  # pragma: no cover - defensive
            raise AttributeError(name) from exc


def _http_url(url: str) -> str:
    """Normalize a libsql:// URL to the https:// endpoint the client expects."""
    if url.startswith("libsql://"):
        return "https://" + url[len("libsql://"):]
    return url


def get_client() -> libsql_client.Client:
    """Return the process-wide async libSQL client (created lazily)."""
    global _client
    if _client is None:
        if not settings.TURSO_DATABASE_URL:
            raise RuntimeError(
                "TURSO_DATABASE_URL is not configured but the Turso backend is active."
            )
        _client = libsql_client.create_client(
            url=_http_url(settings.TURSO_DATABASE_URL),
            auth_token=settings.TURSO_AUTH_TOKEN,
        )
    return _client


async def close_client() -> None:
    """Close the libSQL client (call on application shutdown)."""
    global _client
    if _client is not None:
        await _client.close()
        _client = None


# --- helpers ---------------------------------------------------------------

def new_id() -> str:
    """Generate a UUID4 string (ids are generated app-side, like the ORM)."""
    return str(uuid.uuid4())


def now_iso() -> str:
    """UTC timestamp in ISO-8601, safe for SQLite text columns and Pydantic."""
    return datetime.now(timezone.utc).isoformat()


def _rows(rs: "libsql_client.ResultSet") -> List[Record]:
    cols = rs.columns
    return [Record(zip(cols, row)) for row in rs.rows]


async def fetch_all(sql: str, args: Iterable[Any] = ()) -> List[Record]:
    rs = await get_client().execute(sql, list(args))
    return _rows(rs)


async def fetch_one(sql: str, args: Iterable[Any] = ()) -> Optional[Record]:
    rows = await fetch_all(sql, args)
    return rows[0] if rows else None


async def execute(sql: str, args: Iterable[Any] = ()) -> "libsql_client.ResultSet":
    return await get_client().execute(sql, list(args))


# --- schema ----------------------------------------------------------------
# SQLite/libSQL DDL translated from the SQLAlchemy models:
#   UUID -> TEXT, Boolean -> INTEGER(0/1), timestamptz -> TEXT, Numeric -> NUMERIC.

SCHEMA: List[str] = [
    """CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        is_admin INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
    )""",
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
    """CREATE TABLE IF NOT EXISTS saved_locations (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        latitude NUMERIC NOT NULL,
        longitude NUMERIC NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_global INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS spiritual_activity (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_date TEXT NOT NULL,
        japa_count INTEGER NOT NULL DEFAULT 0,
        pranayama_count INTEGER NOT NULL DEFAULT 0,
        darshan_count INTEGER NOT NULL DEFAULT 0,
        japa_last_updated TEXT,
        pranayama_last_updated TEXT,
        darshan_last_updated TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_activity_date UNIQUE (user_id, activity_date),
        CONSTRAINT japa_count_positive CHECK (japa_count >= 0),
        CONSTRAINT pranayama_count_positive CHECK (pranayama_count >= 0),
        CONSTRAINT darshan_count_positive CHECK (darshan_count >= 0)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_sa_user ON spiritual_activity(user_id)",
    """CREATE TABLE IF NOT EXISTS spiritual_activity_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type TEXT NOT NULL,
        count_added INTEGER NOT NULL,
        activity_date TEXT NOT NULL,
        notes TEXT,
        location_id TEXT REFERENCES saved_locations(id) ON DELETE SET NULL,
        logged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_activity_type CHECK (activity_type IN ('japa','pranayama','darshan')),
        CONSTRAINT count_added_positive CHECK (count_added > 0)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_sah_user ON spiritual_activity_history(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_sah_type ON spiritual_activity_history(activity_type)",
    "CREATE INDEX IF NOT EXISTS idx_sah_date ON spiritual_activity_history(activity_date)",
    """CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        location_name TEXT,
        location_id TEXT,
        event_date TEXT NOT NULL,
        created_by TEXT NOT NULL,
        is_published INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS app_config (
        id INTEGER PRIMARY KEY,
        app_version TEXT NOT NULL DEFAULT '1.0.0',
        expiry_date TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )""",
]


async def init_turso_db() -> None:
    """Create tables (idempotent) and seed a default admin + app config.

    The admin password hash is generated with the app's own hasher so the
    seeded admin can actually log in (unlike the bcrypt seeds in the legacy
    Postgres setup script, which the PBKDF2 verifier cannot validate).
    """
    from app.utils.security import get_password_hash

    client = get_client()
    await client.batch(SCHEMA)

    # Seed default app config row.
    await execute(
        "INSERT INTO app_config (id, app_version) VALUES (1, '1.0.0') "
        "ON CONFLICT(id) DO NOTHING"
    )

    # Seed admin user if absent. ON CONFLICT DO NOTHING guards against a
    # pre-existing row with the same email or username (both are UNIQUE).
    admin_email = settings.ADMIN_EMAIL or "admin@example.com"
    existing = await fetch_one("SELECT id FROM users WHERE email = ?", [admin_email])
    if existing is None:
        await execute(
            "INSERT INTO users (id, email, username, password_hash, full_name, is_admin, is_active) "
            "VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
            [
                new_id(),
                admin_email,
                "admin",
                get_password_hash(settings.ADMIN_PASSWORD or "ChangeMe123!"),
                "System Administrator",
                1,
                1,
            ],
        )
