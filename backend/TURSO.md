# Turso (libSQL) backend

The app can run on **Turso** (libSQL / SQLite) instead of Postgres, behind a
runtime flag. This path uses the **pure-Python async client** `libsql-client`
(over HTTP) — no native/Rust dependency, so it deploys cleanly on Vercel
serverless and keeps the app's fully-async request handling.

> Why not the SQLAlchemy `sqlite+libsql` dialect? It is **synchronous only**
> and depends on `libsql-experimental`, a native Rust extension with no wheel
> for our runtime (it fails to build on Vercel's Python serverless). The app is
> async end-to-end, so we use the async HTTP client directly for the Turso path.

## Enabling Turso

Set these in the environment the app loads (e.g. `.env`, or Vercel project
env). The connection values are in `.env.turso`:

```
DB_BACKEND=turso
TURSO_DATABASE_URL=libsql://sgvd-amardattadola.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=<token from .env.turso>
SECRET_KEY=<your JWT secret>
ADMIN_EMAIL=admin@example.com        # seeded admin (optional)
ADMIN_PASSWORD=ChangeMe123!          # seeded admin password (optional)
```

### Backend selection (`settings.use_turso`)

| `DB_BACKEND` | Postgres URL present | Turso URL present | Backend  |
|--------------|----------------------|-------------------|----------|
| `turso`      | any                  | any               | Turso    |
| `postgres`   | any                  | any               | Postgres |
| _(unset)_    | yes                  | any               | Postgres |
| _(unset)_    | no                   | yes               | Turso    |

This means **existing Supabase/Vercel deploys are unaffected** — Turso only
turns on when you explicitly ask for it (or when no Postgres URL exists).

On startup, `init_db()` creates the libSQL schema (idempotent) and seeds a
default `app_config` row plus an admin user whose password is hashed with the
app's own PBKDF2 hasher (so it can actually log in).

## What's migrated

**All endpoints are now migrated** — the full API runs on Turso:

- ✅ **auth** — `POST /sgvd/auth/register`, `/login`, `/token`
- ✅ **auth dependency** — `get_current_user` / `get_admin_user`
- ✅ **config** — `GET`/`PUT /sgvd/config/app`
- ✅ **users** — `GET /sgvd/users/profile/{id}`
- ✅ **google_auth** — `POST /sgvd/auth/google`
- ✅ **spiritual** — `POST /japa|/pranayama|/darshan`, `GET /stats`, `/stats/today`
- ✅ **events** — `GET /sgvd/events/`, `POST /sgvd/events/bulk`
- ✅ **locations** — `GET /sgvd/locations`, `POST /sgvd/locations/update`
- ✅ **compass** — `POST /sgvd/compass/bearing`
- ✅ **admin** — `GET /sgvd/admin/spiritual-stats[/{id}]` (filter/sort/paginate)

Every migrated service keeps its original SQLAlchemy/Postgres path behind the
same `settings.use_turso` branch, so `DB_BACKEND=postgres` still works unchanged.
The `get_db()` 501 guard remains as a safety net but no router uses it anymore
(all routers depend on `get_session`).

Verify end-to-end with `python scripts/smoke_test.py` and inspect data with
`python scripts/check_db.py` (see `scripts/README.md`).

## Architecture

- `app/config.py` — `TURSO_*` settings, `DB_BACKEND`, `use_turso` property.
- `app/turso.py` — async client singleton, `Record` (dict + attribute access),
  query helpers (`fetch_one`/`fetch_all`/`execute`), the SQLite `SCHEMA`, and
  `init_turso_db()`.
- `app/database.py`
  - `get_session()` — backend-agnostic dependency: yields an `AsyncSession`
    (Postgres) or the libSQL client (Turso). Used by migrated routers.
  - `get_db()` — Postgres-only dependency used by not-yet-migrated routers;
    raises **501** in Turso mode.
  - `init_db()` — dispatches to `create_all` (Postgres) or `init_turso_db()`.
- Services (`config_service`, `auth_service`) and `auth_dependency` branch on
  `settings.use_turso` and call the Turso helpers.

## How to migrate another router

1. Switch the router's dependency from `get_db` to `get_session`.
2. In the service, add a `settings.use_turso` branch that uses `app.turso`
   helpers and returns `Record`s (which both Pydantic `model_validate` and
   attribute access understand):

   ```python
   from app.config import settings
   from app import turso

   async def list_locations(db):
       if settings.use_turso:
           return await turso.fetch_all(
               "SELECT id, name, latitude, longitude, is_global "
               "FROM saved_locations ORDER BY name"
           )
       # existing ORM path
       result = await db.execute(select(SavedLocation))
       return result.scalars().all()
   ```

3. Generate ids app-side with `turso.new_id()` and timestamps with
   `turso.now_iso()` (ISO-8601, parses cleanly into Pydantic `datetime`).

## Schema / type mapping (Postgres → SQLite)

| Postgres                | SQLite/libSQL                |
|-------------------------|------------------------------|
| `uuid` (+`uuid_generate_v4()`) | `TEXT` (ids generated app-side) |
| `boolean`               | `INTEGER` (0/1)              |
| `timestamptz`           | `TEXT` (`CURRENT_TIMESTAMP` / ISO-8601) |
| `numeric(p,s)`          | `NUMERIC`                    |
| plpgsql triggers        | dropped (handle in app code) |

Booleans come back as `0/1` and UUIDs/timestamps as strings; Pydantic coerces
them to `bool`/`UUID`/`datetime` on the way out.

## Provisioning (how the DB was created)

Via the Turso Platform API using `TURSO_API_KEY` (org `amardattadola`): group
`default` in `aws-ap-south-1` (Mumbai), database `sgvd`, full-access token. You
can query it directly over the libSQL HTTP pipeline API
(`POST https://<host>/v2/pipeline`) with the `TURSO_AUTH_TOKEN`.

## Known caveat

`libsql-client` 0.3.1 raises a cryptic `KeyError('result')` when a statement
hits a server-side SQL error (e.g. a UNIQUE violation) instead of a clean
exception. The service layer catches broad `Exception`s and maps them to HTTP
errors, and `init_turso_db()` uses `ON CONFLICT DO NOTHING` to stay idempotent.
