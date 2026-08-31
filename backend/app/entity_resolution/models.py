"""Typed, explainable outputs for record-linkage decisions."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Mapping

from app.provenance import ProvenanceRecord


class ResolutionStatus(str, Enum):
    AUTO_MATCHED = "AUTO_MATCHED"
    POSSIBLE_MATCH = "POSSIBLE_MATCH"
    NOT_MATCH = "NOT_MATCH"
    MANUALLY_CONFIRMED = "MANUALLY_CONFIRMED"
    MANUALLY_REJECTED = "MANUALLY_REJECTED"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True, slots=True)
class EntityRecord:
    """A source entity, not yet assumed to be the canonical identity."""

    record_id: str
    entity_type: str
    attributes: Mapping[str, Any]
    source_record_ids: tuple[str, ...] = ()
    provenance: tuple[ProvenanceRecord, ...] = ()
    case_ids: tuple[str, ...] = ()

    @property
    def display_name(self) -> str:
        for key in ("name", "full_name", "label", "value", "identifier"):
            if value := self.attributes.get(key):
                return str(value)
        return self.record_id


@dataclass(frozen=True, slots=True)
class CandidatePair:
    left_id: str
    right_id: str
    blocking_reasons: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class MatchFeature:
    name: str
    value: float | bool | str
    weight: float
    contribution: float
    explanation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "value": self.value,
            "weight": self.weight,
            "contribution": self.contribution,
            "explanation": self.explanation,
        }


@dataclass(frozen=True, slots=True)
class ResolutionDecision:
    left_id: str
    right_id: str
    status: ResolutionStatus
    match_confidence: float
    features: tuple[MatchFeature, ...]
    auto_match_eligible: bool
    reasons: tuple[str, ...]
    created_at: datetime = field(default_factory=utc_now)
    reviewed_by: str | None = None
    review_note: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "left_id": self.left_id,
            "right_id": self.right_id,
            "status": self.status.value,
            "match_confidence": self.match_confidence,
            "features": [feature.to_dict() for feature in self.features],
            "auto_match_eligible": self.auto_match_eligible,
            "reasons": list(self.reasons),
            "created_at": self.created_at.isoformat(),
            "reviewed_by": self.reviewed_by,
            "review_note": self.review_note,
        }
