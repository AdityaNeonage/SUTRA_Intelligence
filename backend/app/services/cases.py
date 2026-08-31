"""Case workspace business logic with safe default behaviours."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.models.case import Case
from app.models.user import User
from app.schemas.case import CaseCreate, CaseListResponse, CaseRead, CaseUpdate


def to_case_read(case: Case) -> CaseRead:
    """Map a database case explicitly so SQLAlchemy metadata never leaks."""

    return CaseRead(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        status=case.status,
        priority=case.priority,
        classification=case.classification,
        metadata=case.case_metadata or {},
        created_by_id=case.created_by_id,
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


def _new_case_number() -> str:
    """Generate a collision-resistant human-readable internal reference."""

    return f"CASE-{datetime.now(UTC):%Y}-{uuid4().hex[:8].upper()}"


def _normalise_case_number(case_number: str | None) -> str:
    return case_number.strip().upper() if case_number else _new_case_number()


def create_case(session: Session, *, payload: CaseCreate, creator: User) -> CaseRead:
    """Create a new investigation workspace owned by the current user."""

    case_number = _normalise_case_number(payload.case_number)
    existing = session.scalar(select(Case.id).where(Case.case_number == case_number))
    if existing is not None:
        raise APIError(
            409,
            "CASE_NUMBER_EXISTS",
            "A case with this case number already exists.",
            {"case_number": case_number},
        )

    case = Case(
        case_number=case_number,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        classification=payload.classification.lower(),
        case_metadata=payload.metadata,
        created_by_id=creator.id,
    )
    session.add(case)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise APIError(
            409,
            "CASE_NUMBER_EXISTS",
            "A case with this case number already exists.",
            {"case_number": case_number},
        ) from exc
    session.refresh(case)
    return to_case_read(case)


def get_case(session: Session, case_id: str) -> Case:
    """Look up a case or return a stable not-found API error."""

    case = session.get(Case, case_id)
    if case is None:
        raise APIError(404, "CASE_NOT_FOUND", "The requested case was not found.")
    return case


def list_cases(
    session: Session,
    *,
    offset: int,
    limit: int,
    search: str | None = None,
) -> CaseListResponse:
    """List case workspaces with bounded pagination and optional text search."""

    filters = []
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        filters.append(or_(Case.case_number.ilike(pattern), Case.title.ilike(pattern)))

    total = session.scalar(select(func.count()).select_from(Case).where(*filters)) or 0
    statement = (
        select(Case)
        .where(*filters)
        .order_by(Case.updated_at.desc(), Case.case_number.asc())
        .offset(offset)
        .limit(limit)
    )
    cases = list(session.scalars(statement))
    return CaseListResponse(
        items=[to_case_read(case) for case in cases],
        total=total,
        offset=offset,
        limit=limit,
    )


def update_case(session: Session, *, case: Case, payload: CaseUpdate) -> CaseRead:
    """Update mutable workspace metadata while keeping the case reference stable."""

    changes = payload.model_dump(exclude_unset=True)
    if "metadata" in changes:
        case.case_metadata = changes.pop("metadata")
    for field, value in changes.items():
        if field == "classification" and value is not None:
            value = value.lower()
        setattr(case, field, value)

    if changes or "metadata" in payload.model_fields_set:
        session.commit()
        session.refresh(case)
    return to_case_read(case)
