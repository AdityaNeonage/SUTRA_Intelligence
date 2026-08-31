"""Case workspace request and response contracts."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.models.case import CasePriority, CaseStatus


class CaseCreate(BaseModel):
    title: str = Field(min_length=3, max_length=500)
    description: str | None = Field(default=None, max_length=20_000)
    case_number: str | None = Field(default=None, min_length=3, max_length=80)
    status: CaseStatus = CaseStatus.OPEN
    priority: CasePriority = CasePriority.MEDIUM
    classification: str = Field(default="restricted", min_length=2, max_length=80)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("title", "classification", "case_number")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be blank")
        return cleaned


class CaseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=500)
    description: str | None = Field(default=None, max_length=20_000)
    status: CaseStatus | None = None
    priority: CasePriority | None = None
    classification: str | None = Field(default=None, min_length=2, max_length=80)
    metadata: dict[str, Any] | None = None

    @field_validator("title", "classification")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be blank")
        return cleaned


class CaseRead(BaseModel):
    id: str
    case_number: str
    title: str
    description: str | None
    status: CaseStatus
    priority: CasePriority
    classification: str
    metadata: dict[str, Any]
    created_by_id: str
    created_at: datetime
    updated_at: datetime


class CaseListResponse(BaseModel):
    items: list[CaseRead]
    total: int = Field(ge=0)
    offset: int = Field(ge=0)
    limit: int = Field(ge=1)

