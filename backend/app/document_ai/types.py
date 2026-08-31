"""Standard outputs shared by rule-based and externally supplied NLP models."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from app.provenance import ProvenanceRecord


@dataclass(frozen=True, slots=True)
class ExtractedEntity:
    """Normalized SUTRA NER output, retaining offsets in the original text."""

    text: str
    type: str
    start: int
    end: int
    confidence: float
    model_id: str
    model_version: str
    provenance: ProvenanceRecord | None = None
    attributes: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.text:
            raise ValueError("An extracted entity needs text")
        if self.start < 0 or self.end < self.start:
            raise ValueError("Invalid entity text offsets")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("Entity confidence must be between 0 and 1")

    def to_dict(self) -> dict[str, Any]:
        result = {
            "text": self.text,
            "type": self.type,
            "start": self.start,
            "end": self.end,
            "confidence": self.confidence,
            "model_id": self.model_id,
            "model_version": self.model_version,
            "attributes": dict(self.attributes),
        }
        if self.provenance:
            result["provenance"] = self.provenance.to_dict()
        return result


@dataclass(frozen=True, slots=True)
class ExtractedRelation:
    """Standard SUTRA relation output with source sentence retained."""

    subject: str
    predicate: str
    object: str
    confidence: float
    evidence_text: str
    model_id: str
    model_version: str
    provenance: ProvenanceRecord | None = None
    subject_type: str | None = None
    object_type: str | None = None

    def __post_init__(self) -> None:
        if not self.subject or not self.object or not self.predicate:
            raise ValueError("A relation requires subject, predicate, and object")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("Relation confidence must be between 0 and 1")

    def to_dict(self) -> dict[str, Any]:
        result = {
            "subject": self.subject,
            "predicate": self.predicate,
            "object": self.object,
            "confidence": self.confidence,
            "evidence_text": self.evidence_text,
            "model_id": self.model_id,
            "model_version": self.model_version,
            "subject_type": self.subject_type,
            "object_type": self.object_type,
        }
        if self.provenance:
            result["provenance"] = self.provenance.to_dict()
        return result


@dataclass(frozen=True, slots=True)
class TextExtraction:
    text: str
    page_count: int | None = None
    warnings: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class DocumentAnalysis:
    document_id: str
    original_text: str
    processed_text: str
    language: str
    entities: tuple[ExtractedEntity, ...]
    relations: tuple[ExtractedRelation, ...]
    warnings: tuple[str, ...] = ()
