"""Vercel Services entrypoint for the SUTRA FastAPI application."""

from __future__ import annotations

import os

if os.getenv("VERCEL"):
    os.environ.setdefault("SUTRA_ENVIRONMENT", "production")

from app.main import app  # noqa: E402

__all__ = ["app"]
