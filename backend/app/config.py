from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Supabase / Vercel automatic variables
    POSTGRES_URL: Optional[str] = None
    POSTGRES_URL_NON_POOLING: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_HOST: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DATABASE: Optional[str] = None

    # Admin Configuration
    ADMIN_EMAIL: Optional[str] = "admin@example.com"
    ADMIN_PASSWORD: Optional[str] = "ChangeMe123!"

    # App Configuration
    SECRET_KEY: str
    debug: Optional[bool] = False
    environment: Optional[str] = "production"
    access_token_expire_minutes: Optional[int] = 1440

    # Make DATABASE_URL optional initially, computed via validator
    DATABASE_URL: Optional[str] = None

    # Turso (libSQL) backend - pure-Python async client, no native deps.
    # The database URL is not secret and defaults to the provisioned DB; the
    # auth token IS secret and must come from the environment (.env / .env.turso).
    TURSO_DATABASE_URL: Optional[str] = (
        "libsql://sgvd-amardattadola.aws-ap-south-1.turso.io"
    )
    TURSO_AUTH_TOKEN: Optional[str] = None
    # Backend selector: "postgres" | "turso". Defaults to "turso".
    # Set DB_BACKEND=postgres (env) to keep a deployment on Supabase/asyncpg.
    DB_BACKEND: Optional[str] = "turso"

    # Run schema creation + seeding on app startup. The provisioned Turso DB
    # already has its schema/data, so this is OFF by default — re-running it on
    # every serverless cold start adds needless round-trips to the DB region and
    # inflates cold-start latency. Set INIT_DB_ON_STARTUP=1 for a fresh DB, or
    # just run `python scripts/seed_defaults.py` / init once out-of-band.
    INIT_DB_ON_STARTUP: Optional[bool] = False

    def _has_postgres_url(self) -> bool:
        return bool(
            self.POSTGRES_URL_NON_POOLING or self.DATABASE_URL or self.POSTGRES_URL
        )

    @property
    def use_turso(self) -> bool:
        """Whether the Turso (libSQL) backend is active."""
        backend = (self.DB_BACKEND or "").strip().lower()
        if backend == "turso":
            return True
        if backend == "postgres":
            return False
        # Auto: prefer Postgres if configured, else fall back to Turso.
        if self._has_postgres_url():
            return False
        return bool(self.TURSO_DATABASE_URL)

    @property
    def effective_database_url(self) -> str:
        """
        Resolves the database URL in priority order:
        1. POSTGRES_URL_NON_POOLING (Supabase direct) - Preferred for Vercel
        2. DATABASE_URL (explicitly set)
        3. POSTGRES_URL (Supabase pooler)
        """
        if self.POSTGRES_URL_NON_POOLING:
            return self.POSTGRES_URL_NON_POOLING
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.POSTGRES_URL:
            return self.POSTGRES_URL
        raise ValueError(
            "No valid database URL found. Set DATABASE_URL or POSTGRES_URL_NON_POOLING."
        )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
