"""Database engine and request-session lifecycle management."""

from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


class Database:
    """A small wrapper around SQLAlchemy configured from one database URL.

    It supports SQLite for a zero-infrastructure demo and SQLAlchemy-compatible
    PostgreSQL URLs for deployed environments. The in-memory SQLite pool is
    held open for a test application's lifetime, allowing TestClient requests
    to share the same temporary schema.
    """

    def __init__(self, database_url: str, *, echo: bool = False) -> None:
        engine_options: dict[str, object] = {"echo": echo, "future": True}
        if database_url.lower().startswith("sqlite"):
            engine_options["connect_args"] = {"check_same_thread": False}
            if ":memory:" in database_url:
                engine_options["poolclass"] = StaticPool
        else:
            engine_options["pool_pre_ping"] = True

        self.url = database_url
        self.engine: Engine = create_engine(database_url, **engine_options)
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            class_=Session,
        )

    @contextmanager
    def session(self) -> Generator[Session, None, None]:
        """Yield a session and guarantee rollback if caller code raises."""

        session = self.session_factory()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def health_check(self) -> None:
        """Raise if the relational database cannot execute a trivial query."""

        with self.engine.connect() as connection:
            connection.execute(text("SELECT 1"))

    def dispose(self) -> None:
        """Release database resources during application shutdown."""

        self.engine.dispose()

