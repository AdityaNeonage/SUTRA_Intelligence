"""Typed, serialisable provenance records.

SUTRA treats provenance as first-class data.  These values are intentionally
small and framework-neutral so the same record can be attached to a graph edge,
an extraction, or an analytical alert.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from hashlib import sha256
from typing import Any, Mapping


class EvidenceStatus(str, Enum):
    """How strongly a fact is supported by supplied evidence."""

    VERIFIED = "VERIFIED"
    INFERRED = "INFERRED"
    HYPOTHESIS = "HYPOTHESIS"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True, slots=True)
class SourceReference:
    """A precise pointer back to supplied source material."""

    source_record_id: str
    source_type: str
    source_document_id: str | None = None
    case_id: str | None = None
    locator: str | None = None
    observed_at: datetime | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        result = asdict(self)
        if self.observed_at is not None:
            result["observed_at"] = self.observed_at.isoformat()
        return result


@dataclass(frozen=True, slots=True)
class ProvenanceRecord:
    """Evidence and derivation metadata for an output assertion.

    `provenance_id` is deterministic for the same source references and
    derivation.  This makes ingestion retries idempotent and lets graph edge
    updates avoid accidentally duplicating source evidence.
    """

    provenance_id: str
    evidence_status: EvidenceStatus
    sources: tuple[SourceReference, ...]
    derivation: str
    extraction_confidence: float | None = None
    relationship_confidence: float | None = None
    model_id: str | None = None
    model_version: str | None = None
    processed_at: datetime = field(default_factory=utc_now)
    notes: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.sources:
            raise ValueError("A provenance record needs at least one source reference")
        for name, value in (
            ("extraction_confidence", self.extraction_confidence),
            ("relationship_confidence", self.relationship_confidence),
        ):
            if value is not None and not 0.0 <= value <= 1.0:
                raise ValueError(f"{name} must be between 0 and 1")

    def to_dict(self) -> dict[str, Any]:
        return {
            "provenance_id": self.provenance_id,
            "evidence_status": self.evidence_status.value,
            "sources": [source.to_dict() for source in self.sources],
            "derivation": self.derivation,
            "extraction_confidence": self.extraction_confidence,
            "relationship_confidence": self.relationship_confidence,
            "model_id": self.model_id,
            "model_version": self.model_version,
            "processed_at": self.processed_at.isoformat(),
            "notes": list(self.notes),
        }

    @classmethod
    def create(
        cls,
        *,
        sources: tuple[SourceReference, ...] | list[SourceReference],
        evidence_status: EvidenceStatus = EvidenceStatus.VERIFIED,
        derivation: str,
        extraction_confidence: float | None = None,
        relationship_confidence: float | None = None,
        model_id: str | None = None,
        model_version: str | None = None,
        notes: tuple[str, ...] | list[str] = (),
    ) -> "ProvenanceRecord":
        source_tuple = tuple(sources)
        fingerprint = "|".join(
            sorted(
                f"{source.source_type}:{source.source_record_id}:"
                f"{source.source_document_id or ''}:{source.locator or ''}"
                for source in source_tuple
            )
        )
        raw = f"{fingerprint}|{evidence_status.value}|{derivation}|{model_id or ''}|{model_version or ''}"
        provenance_id = f"prov_{sha256(raw.encode('utf-8')).hexdigest()[:20]}"
        return cls(
            provenance_id=provenance_id,
            evidence_status=evidence_status,
            sources=source_tuple,
            derivation=derivation,
            extraction_confidence=extraction_confidence,
            relationship_confidence=relationship_confidence,
            model_id=model_id,
            model_version=model_version,
            notes=tuple(notes),
        )
