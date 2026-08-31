"""Auditable, multi-signal entity resolution with conservative auto-matching."""

from .models import (
    CandidatePair,
    EntityRecord,
    MatchFeature,
    ResolutionDecision,
    ResolutionStatus,
)
from .service import EntityResolutionService

__all__ = [
    "CandidatePair",
    "EntityRecord",
    "EntityResolutionService",
    "MatchFeature",
    "ResolutionDecision",
    "ResolutionStatus",
]
