"""Password hashing and JWT helpers used by the prototype authentication flow."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

from app.core.config import Settings
from app.core.errors import APIError

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 64
_PASSWORD_SCHEME = "scrypt"


def hash_password(password: str) -> str:
    """Hash a password with a per-password salt using the standard library."""

    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_SCRYPT_DKLEN,
    )
    return "$".join(
        (
            _PASSWORD_SCHEME,
            str(_SCRYPT_N),
            str(_SCRYPT_R),
            str(_SCRYPT_P),
            base64.urlsafe_b64encode(salt).decode("ascii"),
            base64.urlsafe_b64encode(digest).decode("ascii"),
        )
    )


def verify_password(password: str, encoded_password: str) -> bool:
    """Verify a scrypt password hash without raising for malformed stored data."""

    try:
        scheme, n, r, p, salt, expected = encoded_password.split("$", maxsplit=5)
        if scheme != _PASSWORD_SCHEME:
            return False
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=base64.urlsafe_b64decode(salt.encode("ascii")),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=_SCRYPT_DKLEN,
        )
        return hmac.compare_digest(
            actual,
            base64.urlsafe_b64decode(expected.encode("ascii")),
        )
    except (TypeError, ValueError, AttributeError):
        return False


def create_access_token(subject: str, settings: Settings) -> tuple[str, int]:
    """Create a signed JWT and return it alongside its expiry duration in seconds."""

    now = datetime.now(UTC)
    expiry = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": expiry,
        "iss": "sutra-api",
        "jti": secrets.token_urlsafe(16),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int((expiry - now).total_seconds())


def decode_access_token(token: str, settings: Settings) -> dict[str, Any]:
    """Verify and decode a SUTRA access token into its claims."""

    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer="sutra-api",
        )
    except ExpiredSignatureError as exc:
        raise APIError(401, "TOKEN_EXPIRED", "The access token has expired.") from exc
    except InvalidTokenError as exc:
        raise APIError(401, "INVALID_TOKEN", "The access token is invalid.") from exc

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise APIError(401, "INVALID_TOKEN", "The access token has no valid subject.")
    return claims
