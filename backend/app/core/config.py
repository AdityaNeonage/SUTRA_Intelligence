"""Centralised runtime configuration for the SUTRA API."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_PROJECT_ROOT = _BACKEND_ROOT.parent
_IS_VERCEL = bool(os.getenv("VERCEL"))
_DEFAULT_DATABASE_URL = (
    "sqlite:////tmp/sutra.db"
    if _IS_VERCEL
    else f"sqlite:///{(_BACKEND_ROOT / 'sutra.db').as_posix()}"
)
_DEFAULT_STORAGE_PATH = Path("/tmp/sutra-storage") if _IS_VERCEL else _BACKEND_ROOT / "storage"
_DEFAULT_MODEL_REGISTRY_PATH = (
    Path("/tmp/sutra-models/registered")
    if _IS_VERCEL
    else _PROJECT_ROOT / "models" / "registered"
)


class Settings(BaseSettings):
    """Settings loaded from environment variables or an optional ``.env`` file.

    SQLite is intentionally the default so a local demo can be started without
    infrastructure. Set ``DATABASE_URL`` to a PostgreSQL URL in deployed
    environments, for example ``postgresql+psycopg://sutra:password@db/sutra``.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "SUTRA API"
    app_version: str = "0.1.0"
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("SUTRA_ENVIRONMENT", "ENVIRONMENT"),
    )
    api_prefix: str = "/api"
    # Do not consume a generic DEBUG variable: IDEs and unrelated tooling often
    # define it with non-boolean values such as ``release``.
    debug: bool = Field(default=False, validation_alias=AliasChoices("SUTRA_DEBUG"))

    database_url: str = Field(
        default=_DEFAULT_DATABASE_URL,
        validation_alias=AliasChoices("SUTRA_DATABASE_URL", "DATABASE_URL"),
    )
    database_echo: bool = False
    database_auto_create: bool = True

    neo4j_uri: str | None = Field(
        default=None, validation_alias=AliasChoices("SUTRA_NEO4J_URI", "NEO4J_URI")
    )
    neo4j_username: str | None = Field(
        default=None, validation_alias=AliasChoices("SUTRA_NEO4J_USERNAME", "NEO4J_USERNAME")
    )
    neo4j_password: str | None = Field(
        default=None, validation_alias=AliasChoices("SUTRA_NEO4J_PASSWORD", "NEO4J_PASSWORD")
    )

    jwt_secret: str = Field(
        default="local-development-only-change-me",
        validation_alias=AliasChoices("SUTRA_JWT_SECRET", "JWT_SECRET"),
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=60, ge=5, le=1_440)

    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        validation_alias=AliasChoices("SUTRA_CORS_ORIGINS", "CORS_ORIGINS"),
    )
    storage_path: Path = Field(
        default=_DEFAULT_STORAGE_PATH,
        validation_alias=AliasChoices("SUTRA_STORAGE_PATH"),
    )
    model_registry_path: Path = Field(
        default=_DEFAULT_MODEL_REGISTRY_PATH,
        validation_alias=AliasChoices("SUTRA_MODEL_REGISTRY_PATH"),
    )

    active_ner_model: str | None = None
    active_relation_model: str | None = None
    active_embedding_model: str | None = None
    llm_provider: str | None = None

    # Local development gets the documented synthetic administrator. Public
    # Vercel deployments require an explicit opt-in environment variable.
    seed_demo_user: bool = not _IS_VERCEL
    seed_demo_data: bool = False
    demo_user_email: str = "admin@sutra.local"
    demo_user_password: str = "sutra-demo-2026"
    demo_user_name: str = "SUTRA Demo Administrator"
    health_check_timeout_seconds: float = Field(default=2.0, ge=0.1, le=15.0)

    @field_validator("environment")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("debug", mode="before")
    @classmethod
    def tolerate_common_tooling_debug_values(cls, value: object) -> object:
        """Treat IDE/tooling values such as ``DEBUG=release`` as disabled.

        The environment commonly has a non-boolean DEBUG value unrelated to
        FastAPI. Explicit ``SUTRA_DEBUG=true`` remains the preferred switch.
        """

        if isinstance(value, str) and value.strip().lower() in {
            "release",
            "production",
            "prod",
            "disabled",
            "off",
        }:
            return False
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        """Return non-empty comma-separated CORS origins as a list."""

        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.lower().startswith("sqlite")

    @property
    def is_production(self) -> bool:
        return self.environment in {"production", "prod"}

    def validate_runtime_safety(self) -> None:
        """Reject the deliberately local JWT default in a production deployment."""

        if self.is_production and self.jwt_secret == "local-development-only-change-me":
            raise ValueError("SUTRA_JWT_SECRET must be set to a non-default value in production.")


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings for the normal Uvicorn entry point."""

    settings = Settings()
    settings.validate_runtime_safety()
    return settings
