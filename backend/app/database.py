from __future__ import annotations

from app.config import settings

# The Postgres/asyncpg engine is only built when the Postgres backend is
# active. In Turso mode it stays None so the app can boot without any
# Postgres URL configured.
engine = None
AsyncSessionLocal = None


def __getattr__(name):
    """Lazily build the SQLAlchemy declarative ``Base`` (PEP 562).

    Models do ``from app.database import Base`` and subclass it; that access
    triggers this hook and imports SQLAlchemy on demand. Importing this module
    on the Turso backend therefore pulls in NO SQLAlchemy at all — that import
    (~70 ms locally, ~0.6 s on Vercel's cold filesystem) is the single largest
    avoidable chunk of cold-start time and is unused on the Turso path.
    """
    if name == "Base":
        from sqlalchemy.orm import declarative_base

        base = declarative_base()
        globals()["Base"] = base  # cache so later accesses skip this hook
        return base
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


if not settings.use_turso:
    # Postgres backend only: build the async engine + session factory. These
    # SQLAlchemy imports stay inside the branch so they never run on Turso.
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker

    DATABASE_URL = settings.effective_database_url
    if DATABASE_URL:
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
        elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith(
            "postgresql+asyncpg://"
        ):
            DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

        # Fix sslmode for asyncpg
        if "sslmode=require" in DATABASE_URL:
            DATABASE_URL = DATABASE_URL.replace("sslmode=require", "ssl=require")

    engine = create_async_engine(
        DATABASE_URL, future=True, echo=False, connect_args={"statement_cache_size": 0}
    )
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    if settings.use_turso:
        from app.turso import init_turso_db

        await init_turso_db()
        return

    # import models to register them with SQLAlchemy metadata
    from app.models import (
        user,
        location,
        event,
        spiritual_activity,
        app_config,
        streak,
    )  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    """Backend-agnostic DB handle for routers migrated to support Turso.

    Yields a SQLAlchemy ``AsyncSession`` on Postgres, or the async libSQL
    client on Turso. Services that support both inspect ``settings.use_turso``
    to choose their query path.
    """
    if settings.use_turso:
        from app.turso import get_client

        yield get_client()
    else:
        async with AsyncSessionLocal() as session:
            yield session


# Dependency for endpoints (Postgres/ORM only). Routers that have NOT yet been
# migrated to Turso use this; in Turso mode it fails fast with a clear 501
# instead of a cryptic driver error.
async def get_db():
    if settings.use_turso:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=501,
            detail=(
                "This endpoint is not yet available on the Turso backend. "
                "Migrated endpoints: auth (register/login/token) and config."
            ),
        )
    async with AsyncSessionLocal() as session:
        yield session
