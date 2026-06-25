# Maintenance scripts

Reusable scripts for the **Turso (libSQL)** backend. They read the connection
from the single `.env` at the repo root (`TURSO_DATABASE_URL` +
`TURSO_AUTH_TOKEN`) and target the app's live database.

Run them from the repo root with the project venv:

```bash
python scripts/check_db.py            # inspect table counts + recent rows
python scripts/check_db.py --table events --limit 20
python scripts/check_db.py --sql "SELECT email FROM users WHERE is_admin = 1"

python scripts/smoke_test.py          # e2e check of every endpoint (Turso)

python scripts/benchmark.py           # per-endpoint latency + warm restart
python scripts/benchmark.py --warm 30 --sleep 60
python scripts/benchmark.py --no-sleep

python scripts/seed_defaults.py --dry-run   # preview default locations/events
python scripts/seed_defaults.py             # upsert default locations/events

VERCEL_TOKEN=xxxx ./scripts/deploy_vercel.sh --prod   # set env + deploy
```

| Script | Purpose | Writes to DB? |
|--------|---------|---------------|
| `check_db.py` | Counts + recent rows; ad-hoc `--sql` reads | no |
| `smoke_test.py` | Exercises every endpoint in-process | yes (cleans up its own test rows) |
| `benchmark.py` | Cold / warm / warm-restart latency per endpoint | yes (cleans up its own test rows) |
| `seed_defaults.py` | Upsert the default location + event calendar | yes |
| `deploy_vercel.sh` | Sync env vars + deploy to Vercel | no (needs a valid full-access token) |
| `_env.py` | Shared env/`sys.path` bootstrap (imported by the others) | — |
