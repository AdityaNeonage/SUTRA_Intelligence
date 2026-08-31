"""Append-only application audit helpers."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.intelligence import AuditEvent


def record_audit(
    session: Session,
    *,
    action: str,
    resource_type: str,
    actor_id: str | None = None,
    resource_id: str | None = None,
    case_id: str | None = None,
    request_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditEvent:
    """Append an audit event without exposing a mutable update API."""

    event = AuditEvent(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        case_id=case_id,
        request_id=request_id,
        event_details=details or {},
    )
    session.add(event)
    return event
