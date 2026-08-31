"""Convenience builders for evidence-centric explanations."""

from __future__ import annotations

from typing import Any, Iterable

from .models import EvidenceStatus, ProvenanceRecord, SourceReference


class ProvenanceService:
    """Creates consistent provenance records without hiding their sources."""

    @staticmethod
    def source(
        source_record_id: str,
        source_type: str,
        *,
        source_document_id: str | None = None,
        case_id: str | None = None,
        locator: str | None = None,
        **metadata: Any,
    ) -> SourceReference:
        return SourceReference(
            source_record_id=source_record_id,
            source_type=source_type,
            source_document_id=source_document_id,
            case_id=case_id,
            locator=locator,
            metadata=metadata,
        )

    @staticmethod
    def record(
        sources: Iterable[SourceReference],
        *,
        evidence_status: EvidenceStatus,
        derivation: str,
        extraction_confidence: float | None = None,
        relationship_confidence: float | None = None,
        model_id: str | None = None,
        model_version: str | None = None,
        notes: Iterable[str] = (),
    ) -> ProvenanceRecord:
        return ProvenanceRecord.create(
            sources=tuple(sources),
            evidence_status=evidence_status,
            derivation=derivation,
            extraction_confidence=extraction_confidence,
            relationship_confidence=relationship_confidence,
            model_id=model_id,
            model_version=model_version,
            notes=tuple(notes),
        )

    @staticmethod
    def why(provenance: ProvenanceRecord) -> dict[str, Any]:
        """Return a UI-ready, transparent evidence explanation."""

        return {
            "classification": provenance.evidence_status.value,
            "derivation": provenance.derivation,
            "confidence": provenance.relationship_confidence
            if provenance.relationship_confidence is not None
            else provenance.extraction_confidence,
            "model": {
                "id": provenance.model_id,
                "version": provenance.model_version,
            }
            if provenance.model_id
            else None,
            "sources": [source.to_dict() for source in provenance.sources],
            "notes": list(provenance.notes),
        }
