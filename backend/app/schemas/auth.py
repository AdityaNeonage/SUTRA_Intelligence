"""Authentication request and response contracts."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.user import UserRole


class LoginRequest(BaseModel):
    # Authorised agencies may use internal domains (for example ``.local``),
    # so this intentionally checks email structure without public-DNS policy.
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("email")
    @classmethod
    def validate_internal_or_public_email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        local, separator, domain = cleaned.partition("@")
        if not separator or not local or not domain or "." not in domain or " " in cleaned:
            raise ValueError("must be a valid email-style identifier")
        return cleaned


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(ge=1)
    user: UserRead
