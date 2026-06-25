"""Shared bootstrap for the maintenance scripts in this folder.

Loads the Turso connection from ``.env.turso`` / ``.env`` (real environment
variables always win) and puts the repo root on ``sys.path`` so ``import app``
works when a script is run as ``python scripts/<name>.py``.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_env_file(name: str) -> None:
    path = REPO_ROOT / name
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def bootstrap() -> None:
    """Load env files, ensure a SECRET_KEY exists, and fix sys.path."""
    _load_env_file(".env.turso")
    _load_env_file(".env")
    # Settings requires SECRET_KEY; scripts that only touch the DB don't need a
    # real one, so provide a throwaway default (real env / .env still wins).
    os.environ.setdefault("SECRET_KEY", "scripts-throwaway-secret")
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))
