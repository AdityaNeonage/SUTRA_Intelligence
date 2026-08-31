"""Authentication business logic kept independent from FastAPI handlers."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import APIError
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginResponse, UserRead


def to_user_read(user: User) -> UserRead:
    """Project a persistence user to the public, password-free contract."""

    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


def authenticate(
    session: Session,
    *,
    email: str,
    password: str,
    settings: Settings,
) -> LoginResponse:
    """Verify credentials, update login metadata, and issue a signed JWT."""

    normalized_email = email.strip().lower()
    user = session.scalar(select(User).where(User.email == normalized_email))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise APIError(401, "INVALID_CREDENTIALS", "Invalid email or password.")

    user.last_login_at = datetime.now(UTC)
    session.commit()
    session.refresh(user)
    access_token, expires_in = create_access_token(user.id, settings)
    return LoginResponse(
        access_token=access_token,
        expires_in=expires_in,
        user=to_user_read(user),
    )


def get_active_user(session: Session, user_id: str) -> User:
    """Load an active user referenced by a verified token."""

    user = session.get(User, user_id)
    if user is None or not user.is_active:
        raise APIError(401, "USER_NOT_AVAILABLE", "The token user is not available.")
    return user
