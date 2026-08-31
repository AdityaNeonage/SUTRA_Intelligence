"""Typed request contracts for evidence and analytical APIs."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CopilotQuery(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    entity_id: str | None = Field(default=None, max_length=80)
    case_id: str | None = Field(default=None, max_length=80)


class ResolutionFeedbackRequest(BaseModel):
    confirmed: bool
    note: str | None = Field(default=None, max_length=2000)


class RelationshipFeedbackRequest(BaseModel):
    status: Literal["VERIFIED", "INFERRED", "HYPOTHESIS"]
    note: str | None = Field(default=None, max_length=2000)


class ModelImportRequest(BaseModel):
    bundle_path: str = Field(min_length=1, max_length=1024)
    activate: bool = False


class ModelActivationRequest(BaseModel):
    active: bool = True
