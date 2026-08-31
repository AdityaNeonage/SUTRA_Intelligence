"""Authenticated case workspace endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, SessionDependency
from app.schemas.case import CaseCreate, CaseListResponse, CaseRead, CaseUpdate
from app.schemas.common import ErrorResponse
from app.services.cases import create_case, get_case, list_cases, to_case_read, update_case

logger = logging.getLogger("sutra.cases")
router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post(
    "",
    response_model=CaseRead,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
def create_case_workspace(
    payload: CaseCreate,
    request: Request,
    session: SessionDependency,
    current_user: CurrentUser,
) -> CaseRead:
    """Create a case workspace; evidence is added through ingestion routes later."""

    response = create_case(session, payload=payload, creator=current_user)
    logger.info(
        "case_created",
        extra={"event": "case_created", "request_id": request.state.request_id},
    )
    return response


@router.get("", response_model=CaseListResponse, responses={401: {"model": ErrorResponse}})
def read_cases(
    session: SessionDependency,
    _: CurrentUser,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=200),
) -> CaseListResponse:
    """Return paginated case metadata, never the full evidence graph."""

    return list_cases(session, offset=offset, limit=limit, search=search)


@router.get(
    "/{case_id}",
    response_model=CaseRead,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
def read_case(
    case_id: str,
    session: SessionDependency,
    _: CurrentUser,
) -> CaseRead:
    """Read one case workspace by its immutable UUID identifier."""

    return to_case_read(get_case(session, case_id))


@router.patch(
    "/{case_id}",
    response_model=CaseRead,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
def patch_case(
    case_id: str,
    payload: CaseUpdate,
    request: Request,
    session: SessionDependency,
    _: CurrentUser,
) -> CaseRead:
    """Update mutable case metadata while preserving its identifier and number."""

    response = update_case(session, case=get_case(session, case_id), payload=payload)
    logger.info(
        "case_updated",
        extra={"event": "case_updated", "request_id": request.state.request_id},
    )
    return response
