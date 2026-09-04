"""Schema initialisation and deterministic local demo-user seeding."""

from __future__ import annotations

from sqlalchemy import select

from app.core.config import Settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.database import Database
from app.models import intelligence as intelligence_models
from app.models.case import Case  # noqa: F401 - imported to register its table.
from app.models.user import User, UserRole


def create_schema(database: Database) -> None:
    """Create the initial relational schema for local/demo use.

    Production deployments should run Alembic migrations before startup; this
    function remains useful for a self-contained local SQLite demo.
    """

    # Keep a concrete import so local SQLite schema creation includes evidence
    # and graph tables even when API routes have not been imported.
    _ = intelligence_models
    Base.metadata.create_all(bind=database.engine)


def ensure_demo_user(database: Database, settings: Settings) -> str | None:
    """Create the documented demo administrator only when it does not exist."""

    if not settings.seed_demo_user:
        return None

    email = settings.demo_user_email.strip().lower()
    with database.session() as session:
        existing = session.scalar(select(User).where(User.email == email))
        if existing is not None:
            return existing.id
        user = User(
            email=email,
            full_name=settings.demo_user_name.strip(),
            password_hash=hash_password(settings.demo_user_password),
            role=UserRole.ADMINISTRATOR,
            is_active=True,
        )
        session.add(user)
        session.commit()
        return user.id
