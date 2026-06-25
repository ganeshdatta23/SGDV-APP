from __future__ import annotations

from app.config import settings
from typing import Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:  # type hints only; SQLAlchemy/ORM unused on the Turso path
    from app.models.app_config import AppConfig


async def get_app_config(db) -> AppConfig:
    """
    Get the current app configuration.
    Creates a default configuration if none exists.
    """
    if settings.use_turso:
        return await _get_app_config_turso()

    from sqlalchemy import select
    from app.models.app_config import AppConfig

    result = await db.execute(select(AppConfig).where(AppConfig.id == 1))
    config = result.scalars().first()

    if not config:
        # Create default configuration
        config = AppConfig(id=1, app_version="1.0.0", expiry_date=None)
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return config


async def update_app_config(
    db,
    app_version: Optional[str] = None,
    expiry_date: Optional[datetime] = None,
) -> AppConfig:
    """
    Update the app configuration.
    Only updates fields that are provided (not None).
    """
    if settings.use_turso:
        return await _update_app_config_turso(app_version, expiry_date)

    # Get existing config or create if doesn't exist
    config = await get_app_config(db)

    # Update only provided fields
    if app_version is not None:
        config.app_version = app_version

    if expiry_date is not None:
        config.expiry_date = expiry_date

    await db.commit()
    await db.refresh(config)

    return config


# --- Turso (libSQL) implementations ---------------------------------------

_CONFIG_COLS = "id, app_version, expiry_date"


async def _get_app_config_turso():
    from app import turso

    row = await turso.fetch_one(
        f"SELECT {_CONFIG_COLS} FROM app_config WHERE id = 1"
    )
    if row is None:
        await turso.execute(
            "INSERT INTO app_config (id, app_version) VALUES (1, '1.0.0') "
            "ON CONFLICT(id) DO NOTHING"
        )
        row = await turso.fetch_one(
            f"SELECT {_CONFIG_COLS} FROM app_config WHERE id = 1"
        )
    return row


async def _update_app_config_turso(
    app_version: Optional[str], expiry_date: Optional[datetime]
):
    from app import turso

    await _get_app_config_turso()  # ensure the row exists

    sets, args = [], []
    if app_version is not None:
        sets.append("app_version = ?")
        args.append(app_version)
    if expiry_date is not None:
        sets.append("expiry_date = ?")
        args.append(
            expiry_date.isoformat()
            if isinstance(expiry_date, datetime)
            else expiry_date
        )

    if sets:
        sets.append("updated_at = ?")
        args.append(turso.now_iso())
        args.append(1)
        await turso.execute(
            f"UPDATE app_config SET {', '.join(sets)} WHERE id = ?", args
        )

    return await turso.fetch_one(
        f"SELECT {_CONFIG_COLS} FROM app_config WHERE id = 1"
    )
