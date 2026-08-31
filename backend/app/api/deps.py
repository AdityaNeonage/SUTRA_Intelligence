"""Reusable FastAPI dependencies for database sessions and authenticated users."""

from __future__ import annotations

from collections.abc import Callable, Generator
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import APIError
from app.core.security import decode_access_token
from app.db.database import Database
from app.models.user import User, UserRole
from app.services.auth import get_active_user

bearer_scheme = HTTPBearer(auto_error=False)


def get_app_settings(request: Request) -> Settings:
    """Retrieve the per-application Settings object, including test overrides."""

    return request.app.state.settings


def get_database(request: Request) -> Database:
    """Expose the per-application database wrapper to future integrations."""

    return request.app.state.database


def get_session(request: Request) -> Generator[Session, None, None]:
    """Provide one transaction-aware SQLAlchemy session per request."""

    database: Database = request.app.state.database
    with database.session() as session:
        yield session


SessionDependency = Annotated[Session, Depends(get_session)]
SettingsDependency = Annotated[Settings, Depends(get_app_settings)]
CredentialsDependency = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]


def get_current_user(
    credentials: CredentialsDependency,
    session: SessionDependency,
    settings: SettingsDependency,
) -> User:
    """Resolve a Bearer JWT to an active local user."""

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise APIError(401, "AUTHENTICATION_REQUIRED", "A Bearer access token is required.")
    claims = decode_access_token(credentials.credentials, settings)
    return get_active_user(session, claims["sub"])


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Return a reusable dependency factory for future role-protected routes."""

    def dependency(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise APIError(403, "PERMISSION_DENIED", "Your role cannot perform this action.")
        return current_user

    return dependency
