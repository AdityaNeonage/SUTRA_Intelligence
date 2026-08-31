"""JWT authentication endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from app.api.deps import CurrentUser, SessionDependency
from app.core.config import Settings
from app.schemas.auth import LoginRequest, LoginResponse, UserRead
from app.schemas.common import ErrorResponse
from app.services.auth import authenticate, to_user_read

logger = logging.getLogger("sutra.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=LoginResponse,
    responses={401: {"model": ErrorResponse}},
)
def login(
    payload: LoginRequest,
    request: Request,
    session: SessionDependency,
) -> LoginResponse:
    """Exchange valid local credentials for a short-lived JWT access token."""

    settings: Settings = request.app.state.settings
    try:
        response = authenticate(
            session,
            email=str(payload.email),
            password=payload.password,
            settings=settings,
        )
    except Exception:
        logger.warning(
            "authentication_failed",
            extra={"event": "authentication_failed", "request_id": request.state.request_id},
        )
        raise
    logger.info(
        "authentication_succeeded",
        extra={"event": "authentication_succeeded", "request_id": request.state.request_id},
    )
    return response


@router.get(
    "/me",
    response_model=UserRead,
    responses={401: {"model": ErrorResponse}},
)
def read_current_user(current_user: CurrentUser) -> UserRead:
    """Return the identity associated with the presented access token."""

    return to_user_read(current_user)
