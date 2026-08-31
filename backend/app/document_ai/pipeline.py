"""Document intelligence orchestration with pluggable model-style adapters."""

from __future__ import annotations

import io
import re
import unicodedata
from dataclasses import replace
from pathlib import Path
from typing import Any, Mapping, Protocol, Sequence

from app.provenance import EvidenceStatus, ProvenanceService, SourceReference

from .baseline import DeterministicNER, DeterministicRelationExtractor
from .types import DocumentAnalysis, ExtractedEntity, ExtractedRelation, TextExtraction


class NERAdapter(Protocol):
    model_id: str
    model_version: str

    def predict(self, text: str) -> Mapping[str, Any]: ...


class RelationAdapter(Protocol):
    model_id: str
    model_version: str

    def predict(
        self, text: str, entities: Sequence[ExtractedEntity] | None = None
    ) -> Mapping[str, Any]: ...


def extract_text(filename: str, payload: bytes) -> TextExtraction:
    """Extract text locally; optional parsers fail explicitly rather than silently."""

    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".csv", ".json", ".md"}:
        return TextExtraction(text=payload.decode("utf-8", errors="replace"))
    if suffix == ".pdf":
        try:
            from pypdf import PdfReader  # type: ignore[import-not-found]
        except ImportError:
            try:
                from PyPDF2 import PdfReader  # type: ignore[import-not-found]
            except ImportError as exc:
                raise RuntimeError("PDF extraction needs the optional pypdf package") from exc
        reader = PdfReader(io.BytesIO(payload))
        pages = [(page.extract_text() or "") for page in reader.pages]
        return TextExtraction(text="\n".join(pages), page_count=len(pages))
    if suffix == ".docx":
        try:
            from docx import Document  # type: ignore[import-not-found]
        except ImportError as exc:
            raise RuntimeError("DOCX extraction needs the optional python-docx package") from exc
        document = Document(io.BytesIO(payload))
        return TextExtraction(text="\n".join(paragraph.text for paragraph in document.paragraphs))
    raise ValueError(f"Unsupported document type for text extraction: {suffix or 'no extension'}")


class DocumentIntelligencePipeline:
    """Runs normalization -> NER -> relation extraction and adds provenance.

    Any registry adapter that returns the standard NER/relation mapping can
    replace the deterministic baseline without changing callers.
    """

    def __init__(
        self,
        ner_adapter: NERAdapter | None = None,
        relation_adapter: RelationAdapter | None = None,
    ) -> None:
        self.ner_adapter = ner_adapter or DeterministicNER()
        self.relation_adapter = relation_adapter or DeterministicRelationExtractor()

    @staticmethod
    def normalize_text(text: str) -> str:
        return re.sub(r"[ \t\f\v]+", " ", unicodedata.normalize("NFKC", text)).strip()

    @staticmethod
    def identify_language(text: str) -> str:
        if not text.strip():
            return "und"
        codepoints = [ord(char) for char in text if char.isalpha()]
        if not codepoints:
            return "und"
        devanagari = sum(0x0900 <= value <= 0x097F for value in codepoints)
        bengali = sum(0x0980 <= value <= 0x09FF for value in codepoints)
        if devanagari / len(codepoints) > 0.2:
            return "hi"
        if bengali / len(codepoints) > 0.2:
            return "bn"
        return "en"

    def analyze_text(
        self,
        *,
        document_id: str,
        text: str,
        source_record_id: str | None = None,
        source_type: str = "DOCUMENT",
        case_id: str | None = None,
    ) -> DocumentAnalysis:
        processed = self.normalize_text(text)
        source = SourceReference(
            source_record_id=source_record_id or document_id,
            source_document_id=document_id,
            source_type=source_type,
            case_id=case_id,
        )
        entities = self._with_entity_provenance(processed, source)
        relations = self._with_relation_provenance(processed, entities, source)
        return DocumentAnalysis(
            document_id=document_id,
            original_text=text,
            processed_text=processed,
            language=self.identify_language(processed),
            entities=tuple(entities),
            relations=tuple(relations),
        )

    def analyze_file(
        self,
        *,
        document_id: str,
        filename: str,
        payload: bytes,
        source_record_id: str | None = None,
        source_type: str = "DOCUMENT",
        case_id: str | None = None,
    ) -> DocumentAnalysis:
        extracted = extract_text(filename, payload)
        analysis = self.analyze_text(
            document_id=document_id,
            text=extracted.text,
            source_record_id=source_record_id,
            source_type=source_type,
            case_id=case_id,
        )
        return replace(analysis, warnings=extracted.warnings)

    def _with_entity_provenance(
        self, text: str, source: SourceReference
    ) -> list[ExtractedEntity]:
        raw = self.ner_adapter.predict(text).get("entities", [])
        entities: list[ExtractedEntity] = []
        for item in raw:
            entity = self._entity_from_mapping(item)
            provenance = ProvenanceService.record(
                [
                    SourceReference(
                        source_record_id=source.source_record_id,
                        source_document_id=source.source_document_id,
                        source_type=source.source_type,
                        case_id=source.case_id,
                        locator=f"char:{entity.start}-{entity.end}",
                    )
                ],
                evidence_status=EvidenceStatus.INFERRED,
                derivation="named entity extraction",
                extraction_confidence=entity.confidence,
                model_id=entity.model_id,
                model_version=entity.model_version,
            )
            entities.append(replace(entity, provenance=provenance))
        return entities

    def _with_relation_provenance(
        self,
        text: str,
        entities: Sequence[ExtractedEntity],
        source: SourceReference,
    ) -> list[ExtractedRelation]:
        try:
            raw = self.relation_adapter.predict(text, entities).get("relations", [])
        except TypeError:
            # Third-party adapters are allowed to expose predict(text) only.
            raw = self.relation_adapter.predict(text).get("relations", [])  # type: ignore[call-arg]
        relations: list[ExtractedRelation] = []
        for item in raw:
            relation = self._relation_from_mapping(item)
            provenance = ProvenanceService.record(
                [source],
                evidence_status=EvidenceStatus.INFERRED,
                derivation="relation extraction",
                relationship_confidence=relation.confidence,
                model_id=relation.model_id,
                model_version=relation.model_version,
                notes=(f"Evidence text: {relation.evidence_text}",),
            )
            relations.append(replace(relation, provenance=provenance))
        return relations

    @staticmethod
    def _entity_from_mapping(item: Mapping[str, Any]) -> ExtractedEntity:
        return ExtractedEntity(
            text=str(item["text"]),
            type=str(item["type"]),
            start=int(item["start"]),
            end=int(item["end"]),
            confidence=float(item["confidence"]),
            model_id=str(item.get("model_id") or "external_ner"),
            model_version=str(item.get("model_version") or "unknown"),
            attributes=dict(item.get("attributes") or {}),
        )

    @staticmethod
    def _relation_from_mapping(item: Mapping[str, Any]) -> ExtractedRelation:
        return ExtractedRelation(
            subject=str(item["subject"]),
            predicate=str(item["predicate"]),
            object=str(item["object"]),
            confidence=float(item["confidence"]),
            evidence_text=str(item.get("evidence_text") or ""),
            model_id=str(item.get("model_id") or "external_relation"),
            model_version=str(item.get("model_version") or "unknown"),
            subject_type=item.get("subject_type"),
            object_type=item.get("object_type"),
        )
