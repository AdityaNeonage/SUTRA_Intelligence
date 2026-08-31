"""Prototype case-visibility rules kept outside HTTP handlers."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.models.case import Case
from app.models.user import User, UserRole


_CASE_MANAGERS = {UserRole.ADMINISTRATOR, UserRole.SUPERVISOR}
_CASE_CREATORS = {UserRole.ADMINISTRATOR, UserRole.SUPERVISOR, UserRole.INVESTIGATOR, UserRole.ANALYST}


def require_case_creation(user: User) -> None:
    if user.role not in _CASE_CREATORS:
        raise APIError(403, "PERMISSION_DENIED", "Your role cannot create a case workspace.")


def require_case_access(session: Session, *, case_id: str, user: User, write: bool = False) -> Case:
    case = session.get(Case, case_id)
    if case is None:
        raise APIError(404, "CASE_NOT_FOUND", "The requested case was not found.")
    if user.role in _CASE_MANAGERS or case.created_by_id == user.id:
        if write and user.role is UserRole.VIEWER:
            raise APIError(403, "PERMISSION_DENIED", "Viewer accounts cannot modify case data.")
        return case
    raise APIError(403, "CASE_ACCESS_DENIED", "You do not have access to this case workspace.")


def accessible_case_ids(session: Session, user: User) -> set[str] | None:
    """Return None for managers (unrestricted), otherwise creator-owned cases."""

    if user.role in _CASE_MANAGERS:
        return None
    return set(session.scalars(select(Case.id).where(Case.created_by_id == user.id)))
