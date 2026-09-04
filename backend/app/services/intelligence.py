"""Persistence-backed evidence processing and graph-intelligence use cases."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping, Sequence
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.analytics import FinancialAnalyticsService, GraphAnalyticsService, TemporalAnalyticsService, Transaction
from app.core.config import Settings
from app.core.errors import APIError
from app.demo import build_demo_bundle, write_demo_evidence_files
from app.document_ai import DocumentIntelligencePipeline
from app.entity_resolution import EntityRecord, EntityResolutionService
from app.graph import GraphEdge, GraphNode, KnowledgeGraph
from app.ingestion import IngestionService
from app.intelligence import CaseProfile, CrossCaseDiscoveryService, GraphDeltaService, GraphGroundedCopilot, GraphSnapshot
from app.models.case import Case, CasePriority, CaseStatus
from app.models.intelligence import (
    EntityCaseLink,
    EntityResolutionRecord,
    EvidenceClassification,
    EvidenceDocument,
    GraphSnapshotRecord,
    IngestionBatch as StoredIngestionBatch,
    IngestionStatus as StoredIngestionStatus,
    IntelligenceEntity,
    IntelligenceRelationship,
)
from app.models.user import User
from app.provenance import EvidenceStatus, ProvenanceRecord, SourceReference
from app.services.audit import record_audit


_IDENTIFIER_TYPES = {
    "PHONE": "Phone",
    "IMEI": "Device",
    "DEVICE": "Device",
    "BANK_ACCOUNT": "BankAccount",
    "ACCOUNT": "BankAccount",
    "UPI": "UPI",
    "VEHICLE": "Vehicle",
    "IP_ADDRESS": "IPAddress",
    "DOMAIN": "Domain",
    "EMAIL": "Email",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalise(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def _safe_filename(filename: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", Path(filename or "evidence.bin").name)[:180] or "evidence.bin"


def _as_datetime(value: datetime | str | None) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return result if result.tzinfo else result.replace(tzinfo=timezone.utc)


def _evidence_status(value: str) -> EvidenceStatus:
    try:
        return EvidenceStatus(value.upper())
    except ValueError:
        return EvidenceStatus.INFERRED


class IntelligenceService:
    """Composes pure pipeline components with source/provenance persistence."""

    def __init__(self) -> None:
        self.ingestion = IngestionService()
        self.pipeline = DocumentIntelligencePipeline()
        self.resolver = EntityResolutionService()
        self.analytics = GraphAnalyticsService()
        self.financial = FinancialAnalyticsService()
        self.temporal = TemporalAnalyticsService()
        self.cross_case = CrossCaseDiscoveryService()
        self.delta = GraphDeltaService()
        self.copilot = GraphGroundedCopilot(self.analytics)

    # ---- Canonical records and graph projection ---------------------------------
    def upsert_entity(
        self,
        session: Session,
        *,
        canonical_id: str,
        entity_type: str,
        label: str,
        case_id: str | None = None,
        aliases: Sequence[str] = (),
        attributes: Mapping[str, Any] | None = None,
        source_record_ids: Sequence[str] = (),
        confidence: float = 1.0,
    ) -> IntelligenceEntity:
        """Upsert a stable canonical ID; labels are never used as a merge key."""

        entity = session.scalar(select(IntelligenceEntity).where(IntelligenceEntity.canonical_id == canonical_id))
        if entity is None:
            entity = IntelligenceEntity(
                canonical_id=canonical_id,
                entity_type=entity_type,
                label=label,
                normalized_label=_normalise(label),
                aliases=sorted({item.strip() for item in aliases if item and item.strip()}),
                entity_attributes=dict(attributes or {}),
                source_record_ids=sorted({item for item in source_record_ids if item}),
                confidence=max(0.0, min(1.0, confidence)),
            )
            session.add(entity)
            session.flush()
        else:
            entity.aliases = sorted({*(entity.aliases or []), *(x.strip() for x in aliases if x and x.strip())})
            entity.source_record_ids = sorted({*(entity.source_record_ids or []), *(x for x in source_record_ids if x)})
            entity.entity_attributes = {**(entity.entity_attributes or {}), **dict(attributes or {})}
            entity.confidence = max(entity.confidence, max(0.0, min(1.0, confidence)))
        if case_id:
            exists = session.scalar(
                select(EntityCaseLink.id).where(EntityCaseLink.entity_id == entity.id, EntityCaseLink.case_id == case_id)
            )
            if exists is None:
                session.add(EntityCaseLink(entity_id=entity.id, case_id=case_id))
        return entity

    def entity_from_value(
        self,
        session: Session,
        *,
        entity_type: str,
        value: str,
        case_id: str | None,
        source_record_id: str,
        confidence: float,
        document_id: str | None = None,
        source_scoped: bool = False,
        attributes: Mapping[str, Any] | None = None,
    ) -> IntelligenceEntity:
        """Exact identifiers can coalesce; people remain source records by default."""

        kind = _IDENTIFIER_TYPES.get(entity_type.upper(), entity_type.title() or "Entity")
        normalized = _normalise(value)
        if entity_type.upper() in _IDENTIFIER_TYPES:
            canonical = f"{kind.lower()}_{sha256(normalized.encode()).hexdigest()[:20]}"
        elif source_scoped or kind == "Person":
            canonical = f"source_{kind.lower()}_{sha256(f'{document_id or source_record_id}|{kind}|{value}'.encode()).hexdigest()[:20]}"
        else:
            canonical = f"{kind.lower()}_{sha256(normalized.encode()).hexdigest()[:20]}"
        entity_attributes: dict[str, Any] = {"value": value}
        if kind in {"Person", "Organisation", "Location"}:
            entity_attributes["name"] = value
        if document_id:
            entity_attributes["source_document_id"] = document_id
        entity_attributes.update(dict(attributes or {}))
        return self.upsert_entity(
            session,
            canonical_id=canonical,
            entity_type=kind,
            label=value,
            case_id=case_id,
            attributes=entity_attributes,
            source_record_ids=(source_record_id,),
            confidence=confidence,
        )

    def add_relationship(
        self,
        session: Session,
        *,
        source: IntelligenceEntity,
        target: IntelligenceEntity,
        predicate: str,
        case_id: str | None,
        source_record_id: str,
        evidence_status: str = "VERIFIED",
        confidence: float = 1.0,
        derivation: str = "supplied record",
        evidence_text: str | None = None,
        evidence_document_id: str | None = None,
        model_id: str | None = None,
        model_version: str | None = None,
        observed_at: datetime | str | None = None,
        attributes: Mapping[str, Any] | None = None,
        provenance: Mapping[str, Any] | None = None,
    ) -> IntelligenceRelationship:
        edge = IntelligenceRelationship(
            source_entity_id=source.id,
            target_entity_id=target.id,
            predicate=predicate.upper(),
            case_id=case_id,
            source_record_id=source_record_id,
            evidence_document_id=evidence_document_id,
            evidence_status=evidence_status.upper(),
            derivation=derivation,
            model_id=model_id,
            model_version=model_version,
            confidence=max(0.0, min(1.0, confidence)),
            observed_at=_as_datetime(observed_at),
            first_seen=_as_datetime(observed_at),
            last_seen=_as_datetime(observed_at),
            evidence_text=evidence_text,
            relationship_attributes=dict(attributes or {}),
            provenance=dict(provenance or {}),
        )
        session.add(edge)
        session.flush()
        return edge

    def build_graph(self, session: Session, *, case_id: str | None = None) -> KnowledgeGraph:
        entities = list(session.scalars(select(IntelligenceEntity)))
        links = list(session.scalars(select(EntityCaseLink)))
        cases_by_entity: dict[str, set[str]] = defaultdict(set)
        for link in links:
            cases_by_entity[link.entity_id].add(link.case_id)
        chosen_ids: set[str] | None = None
        relationships = list(session.scalars(select(IntelligenceRelationship)))
        if case_id:
            chosen_ids = {link.entity_id for link in links if link.case_id == case_id}
            relationships = [
                edge
                for edge in relationships
                if edge.case_id == case_id or edge.source_entity_id in chosen_ids or edge.target_entity_id in chosen_ids
            ]
            chosen_ids.update(
                endpoint for edge in relationships for endpoint in (edge.source_entity_id, edge.target_entity_id)
            )
            entities = [entity for entity in entities if entity.id in chosen_ids]
        graph = KnowledgeGraph()
        for entity in entities:
            graph.add_node(
                GraphNode(
                    node_id=entity.id,
                    node_type=entity.entity_type,
                    label=entity.label,
                    attributes={
                        **(entity.entity_attributes or {}),
                        "canonical_id": entity.canonical_id,
                        "confidence": entity.confidence,
                        "aliases": entity.aliases or [],
                    },
                    case_ids=tuple(sorted(cases_by_entity.get(entity.id, set()))),
                    created_at=entity.created_at,
                )
            )
        node_ids = {node.node_id for node in graph.nodes()}
        for edge in relationships:
            if edge.source_entity_id not in node_ids or edge.target_entity_id not in node_ids:
                continue
            source = SourceReference(
                source_record_id=edge.source_record_id or edge.id,
                source_type=str((edge.provenance or {}).get("source_type") or "SOURCE_RECORD"),
                source_document_id=edge.evidence_document_id,
                case_id=edge.case_id,
                observed_at=edge.observed_at,
            )
            provenance = ProvenanceRecord.create(
                sources=(source,),
                evidence_status=_evidence_status(edge.evidence_status),
                derivation=edge.derivation,
                relationship_confidence=edge.confidence,
                model_id=edge.model_id,
                model_version=edge.model_version,
                notes=(edge.evidence_text,) if edge.evidence_text else (),
            )
            graph.add_edge(
                GraphEdge(
                    edge_id=edge.id,
                    source_id=edge.source_entity_id,
                    target_id=edge.target_entity_id,
                    relationship=edge.predicate,
                    case_id=edge.case_id,
                    first_seen=edge.first_seen,
                    last_seen=edge.last_seen,
                    timestamp=edge.observed_at,
                    confidence=edge.confidence,
                    evidence_status=_evidence_status(edge.evidence_status),
                    derivation=edge.derivation,
                    model_id=edge.model_id,
                    model_version=edge.model_version,
                    provenance=(provenance,),
                    attributes={
                        **(edge.relationship_attributes or {}),
                        "evidence_text": edge.evidence_text,
                        "source_record_id": edge.source_record_id,
                        "evidence_document_id": edge.evidence_document_id,
                    },
                    created_at=edge.created_at,
                )
            )
        return graph

    @staticmethod
    def graph_payload(graph: KnowledgeGraph, *, center_id: str | None = None, hops: int = 1, max_nodes: int = 200) -> dict[str, Any]:
        if center_id:
            view = graph.neighborhood(center_id, hops=hops, max_nodes=max_nodes)
            nodes, edges, truncated = view.nodes, view.edges, view.truncated
        else:
            nodes, edges, truncated = tuple(graph.nodes()), tuple(graph.edges()), False
        return {
            "nodes": [
                {
                    "id": node.node_id,
                    "node_id": node.node_id,
                    "label": node.label,
                    "entity_type": node.node_type,
                    "case_ids": list(node.case_ids),
                    "confidence": node.attributes.get("confidence"),
                    "attributes": dict(node.attributes),
                }
                for node in nodes
            ],
            "edges": [
                {
                    "id": edge.edge_id,
                    "edge_id": edge.edge_id,
                    "source": edge.source_id,
                    "source_id": edge.source_id,
                    "target": edge.target_id,
                    "target_id": edge.target_id,
                    "label": edge.relationship,
                    "relationship": edge.relationship,
                    "case_id": edge.case_id,
                    "confidence": edge.confidence,
                    "evidence_status": edge.evidence_status.value,
                    "derivation": edge.derivation,
                    "evidence": [record.to_dict() for record in edge.provenance],
                    "attributes": dict(edge.attributes),
                }
                for edge in edges
            ],
            "center_id": center_id,
            "hops": hops if center_id else None,
            "truncated": truncated,
        }

    # ---- Evidence ingestion -------------------------------------------------------
    async def upload_and_process(
        self,
        session: Session,
        *,
        settings: Settings,
        upload: UploadFile,
        case_id: str | None,
        actor: User,
        source_type: str | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        payload = await upload.read()
        if not payload:
            raise APIError(422, "EMPTY_UPLOAD", "The uploaded file is empty.")
        if len(payload) > 25 * 1024 * 1024:
            raise APIError(413, "FILE_TOO_LARGE", "The prototype accepts evidence files up to 25 MB.")
        if case_id and session.get(Case, case_id) is None:
            raise APIError(404, "CASE_NOT_FOUND", "The selected case was not found.")
        parsed = self.ingestion.ingest(
            filename=_safe_filename(upload.filename or "evidence.bin"),
            payload=payload,
            case_id=case_id,
            uploaded_by=actor.id,
            mime_type=upload.content_type,
        )
        storage_dir = settings.storage_path / "evidence" / parsed.batch.sha256[:2]
        storage_dir.mkdir(parents=True, exist_ok=True)
        stored_path = storage_dir / f"{parsed.batch.ingestion_id}_{_safe_filename(parsed.batch.filename)}"
        stored_path.write_bytes(payload)
        before = self.capture_snapshot(session, label="before_ingestion", case_id=case_id)
        batch = StoredIngestionBatch(
            id=parsed.batch.ingestion_id,
            case_id=case_id,
            source_type=source_type or parsed.batch.source_type.value,
            filename=parsed.batch.filename,
            file_hash=parsed.batch.sha256,
            storage_path=str(stored_path),
            uploaded_by_id=actor.id,
            status=StoredIngestionStatus.PROCESSING.value,
            row_count=parsed.batch.row_count,
            document_count=parsed.batch.document_count,
            batch_metadata={"mime_type": upload.content_type, "warnings": list(parsed.warnings)},
        )
        session.add(batch)
        record_audit(
            session,
            action="ingestion_started",
            resource_type="ingestion_batch",
            resource_id=batch.id,
            case_id=case_id,
            actor_id=actor.id,
            request_id=request_id,
            details={"filename": batch.filename, "sha256": batch.file_hash},
        )
        session.commit()  # Preserve immutable evidence metadata before processing.
        try:
            if parsed.batch.status.value == "FAILED":
                raise APIError(422, "INGESTION_PARSE_FAILED", "The supplied file could not be parsed.", {"warnings": list(parsed.warnings)})
            document_ids: list[str] = []
            entity_ids: set[str] = set()
            relationship_ids: list[str] = []
            for document in parsed.documents:
                result = self._process_document(
                    session,
                    batch=batch,
                    filename=document.filename,
                    payload=document.payload,
                    source_record_id=document.source_record_id,
                    case_id=case_id,
                    source_type=parsed.batch.source_type.value,
                )
                document_ids.append(result[0])
                entity_ids.update(result[1])
                relationship_ids.extend(result[2])
            for row in parsed.rows:
                result = self._process_structured_row(
                    session,
                    batch=batch,
                    row=row.normalized,
                    raw=row.raw,
                    source_record_id=row.source_record_id,
                    record_kind=row.record_kind,
                    case_id=case_id,
                )
                document_ids.append(result[0])
                entity_ids.update(result[1])
                relationship_ids.extend(result[2])
            self.run_entity_resolution(session)
            batch.status = StoredIngestionStatus.COMPLETED.value
            batch.completed_at = utc_now()
            after = self.capture_snapshot(session, label="after_ingestion", case_id=case_id)
            record_audit(
                session,
                action="ingestion_completed",
                resource_type="ingestion_batch",
                resource_id=batch.id,
                case_id=case_id,
                actor_id=actor.id,
                request_id=request_id,
                details={"documents": len(document_ids), "entities": len(entity_ids), "relationships": len(relationship_ids)},
            )
            session.commit()
            return {
                "ingestion_id": batch.id,
                "status": batch.status,
                "filename": batch.filename,
                "file_hash": batch.file_hash,
                "warnings": list(parsed.warnings),
                "document_ids": document_ids,
                "entity_ids": sorted(entity_ids),
                "relationship_ids": relationship_ids,
                "snapshot_before": before.id if before else None,
                "snapshot_after": after.id if after else None,
            }
        except Exception as exc:
            session.rollback()
            failed = session.get(StoredIngestionBatch, batch.id)
            if failed:
                failed.status = StoredIngestionStatus.FAILED.value
                failed.error_message = str(exc)[:2000]
                failed.completed_at = utc_now()
                record_audit(
                    session,
                    action="ingestion_failed",
                    resource_type="ingestion_batch",
                    resource_id=failed.id,
                    case_id=case_id,
                    actor_id=actor.id,
                    request_id=request_id,
                    details={"reason": str(exc)[:500]},
                )
                session.commit()
            if isinstance(exc, APIError):
                raise
            raise APIError(422, "INGESTION_PROCESSING_FAILED", "Evidence was stored but processing did not complete.") from exc

    def _process_document(
        self,
        session: Session,
        *,
        batch: StoredIngestionBatch,
        filename: str,
        payload: bytes,
        source_record_id: str,
        case_id: str | None,
        source_type: str,
    ) -> tuple[str, set[str], list[str]]:
        document = EvidenceDocument(
            ingestion_id=batch.id,
            case_id=case_id,
            original_filename=filename,
            evidence_id=f"evidence_{uuid4().hex}",
        )
        session.add(document)
        session.flush()
        analysis = self.pipeline.analyze_file(
            document_id=document.id,
            filename=filename,
            payload=payload,
            source_record_id=source_record_id,
            source_type=source_type,
            case_id=case_id,
        )
        document.raw_text = analysis.original_text
        document.processed_text = analysis.processed_text
        document.language = analysis.language
        document.extraction_metadata = {
            "warnings": list(analysis.warnings), "entity_count": len(analysis.entities), "relation_count": len(analysis.relations)
        }
        entity_ids: set[str] = set()
        lookup: dict[tuple[str, str], IntelligenceEntity] = {}
        for item in analysis.entities:
            entity = self.entity_from_value(
                session,
                entity_type=item.type,
                value=item.text,
                case_id=case_id,
                source_record_id=source_record_id,
                confidence=item.confidence,
                document_id=document.id,
                source_scoped=item.type.upper() not in _IDENTIFIER_TYPES,
                attributes={"offset_start": item.start, "offset_end": item.end, **dict(item.attributes)},
            )
            entity_ids.add(entity.id)
            lookup[(_normalise(item.text), item.type.upper())] = entity
        relationship_ids: list[str] = []
        for item in analysis.relations:
            subject = lookup.get((_normalise(item.subject), (item.subject_type or "").upper()))
            target = lookup.get((_normalise(item.object), (item.object_type or "").upper()))
            if subject is None:
                subject = self.entity_from_value(
                    session, entity_type=item.subject_type or "Entity", value=item.subject, case_id=case_id,
                    source_record_id=source_record_id, confidence=item.confidence, document_id=document.id, source_scoped=True,
                )
            if target is None:
                target = self.entity_from_value(
                    session, entity_type=item.object_type or "Entity", value=item.object, case_id=case_id,
                    source_record_id=source_record_id, confidence=item.confidence, document_id=document.id, source_scoped=True,
                )
            edge = self.add_relationship(
                session,
                source=subject,
                target=target,
                predicate=item.predicate,
                case_id=case_id,
                source_record_id=source_record_id,
                evidence_status=EvidenceClassification.INFERRED.value,
                confidence=item.confidence,
                derivation="deterministic relation extraction",
                evidence_text=item.evidence_text,
                evidence_document_id=document.id,
                model_id=item.model_id,
                model_version=item.model_version,
                provenance=item.provenance.to_dict() if item.provenance else {},
            )
            entity_ids.update((subject.id, target.id))
            relationship_ids.append(edge.id)
        return document.id, entity_ids, relationship_ids

    def _process_structured_row(
        self,
        session: Session,
        *,
        batch: StoredIngestionBatch,
        row: Mapping[str, Any],
        raw: Mapping[str, Any],
        source_record_id: str,
        record_kind: str,
        case_id: str | None,
    ) -> tuple[str, set[str], list[str]]:
        rendered = json.dumps(raw, ensure_ascii=False, default=str, sort_keys=True)
        document = EvidenceDocument(
            ingestion_id=batch.id,
            case_id=case_id,
            original_filename=f"{batch.filename}#{source_record_id}",
            evidence_id=f"evidence_{uuid4().hex}",
            raw_text=rendered,
            processed_text=rendered,
            language="und",
            extraction_metadata={"record_kind": record_kind, "source_record_id": source_record_id},
        )
        session.add(document)
        session.flush()
        values = {
            "phone": "PHONE", "caller_phone": "PHONE", "callee_phone": "PHONE", "imei": "IMEI", "device": "DEVICE",
            "account_number": "BANK_ACCOUNT", "from_account": "BANK_ACCOUNT", "to_account": "BANK_ACCOUNT",
            "sender": "BANK_ACCOUNT", "receiver": "BANK_ACCOUNT", "upi": "UPI", "vehicle_registration": "VEHICLE",
            "ip_address": "IP_ADDRESS", "domain": "DOMAIN",
        }
        entities: dict[str, IntelligenceEntity] = {}
        for field, entity_type in values.items():
            value = row.get(field)
            if value not in (None, ""):
                record_attributes = {
                    key: item
                    for key, item in row.items()
                    if item not in (None, "")
                    and key in {"role", "opened_date", "country", "is_fraud"}
                }
                entities[field] = self.entity_from_value(
                    session,
                    entity_type=entity_type,
                    value=str(value),
                    case_id=case_id,
                    source_record_id=source_record_id,
                    confidence=0.99,
                    document_id=document.id,
                    attributes={"field": field, "record_kind": record_kind, **record_attributes},
                )
        edge_ids: list[str] = []
        if "caller_phone" in entities and "callee_phone" in entities:
            edge_ids.append(self._verified_edge(session, entities["caller_phone"], entities["callee_phone"], "CALLS", case_id, source_record_id, document.id, rendered, row).id)
        source = entities.get("from_account") or entities.get("sender")
        target = entities.get("to_account") or entities.get("receiver")
        if source and target:
            edge_ids.append(self._verified_edge(session, source, target, "TRANSFERRED_TO", case_id, source_record_id, document.id, rendered, row).id)
        return document.id, {item.id for item in entities.values()}, edge_ids

    def _verified_edge(
        self,
        session: Session,
        source: IntelligenceEntity,
        target: IntelligenceEntity,
        predicate: str,
        case_id: str | None,
        source_record_id: str,
        document_id: str,
        evidence_text: str,
        row: Mapping[str, Any],
    ) -> IntelligenceRelationship:
        attributes = {
            key: value
            for key, value in row.items()
            if key in {
                "amount", "currency", "transaction_reference", "timestamp", "latitude", "longitude", "is_fraud"
            }
        }
        if "amount" in attributes:
            try:
                attributes["amount"] = float(attributes["amount"])
            except (TypeError, ValueError):
                attributes.pop("amount")
        if "is_fraud" in attributes:
            attributes["is_fraud"] = str(attributes["is_fraud"]).strip().lower() in {"1", "true", "yes"}
        return self.add_relationship(
            session,
            source=source,
            target=target,
            predicate=predicate,
            case_id=case_id,
            source_record_id=source_record_id,
            evidence_status=EvidenceClassification.VERIFIED.value,
            confidence=.99,
            derivation="supplied structured record",
            evidence_text=evidence_text,
            evidence_document_id=document_id,
            observed_at=str(row.get("timestamp")) if row.get("timestamp") else None,
            attributes=attributes,
            provenance={"source_type": "STRUCTURED_RECORD"},
        )

    # ---- Resolution and analytics -------------------------------------------------
    def run_entity_resolution(self, session: Session) -> list[EntityResolutionRecord]:
        people = list(session.scalars(select(IntelligenceEntity).where(IntelligenceEntity.entity_type == "Person")))
        records = [
            EntityRecord(
                record_id=entity.id,
                entity_type=entity.entity_type,
                attributes={"name": entity.label, "aliases": entity.aliases or [], **(entity.entity_attributes or {})},
                source_record_ids=tuple(entity.source_record_ids or []),
            )
            for entity in people
        ]
        inserted: list[EntityResolutionRecord] = []
        for decision in self.resolver.resolve(records):
            left, right = sorted((decision.left_id, decision.right_id))
            existing = session.scalar(
                select(EntityResolutionRecord).where(
                    EntityResolutionRecord.left_entity_id == left,
                    EntityResolutionRecord.right_entity_id == right,
                )
            )
            if existing is None:
                record = EntityResolutionRecord(
                    left_entity_id=left,
                    right_entity_id=right,
                    status=decision.status.value,
                    match_confidence=decision.match_confidence,
                    features=[feature.to_dict() for feature in decision.features],
                    reasons=list(decision.reasons),
                )
                session.add(record)
                inserted.append(record)
        return inserted

    def analytics_payload(self, session: Session, *, case_id: str | None = None) -> dict[str, Any]:
        graph = self.build_graph(session, case_id=case_id)
        metric = self.analytics.metrics(graph)
        return {
            "node_count": metric.node_count,
            "edge_count": metric.edge_count,
            "component_count": metric.component_count,
            "network_density": metric.density,
            "degree_centrality": metric.degree_centrality,
            "betweenness_centrality": metric.betweenness_centrality,
            "pagerank": metric.pagerank,
            "communities": metric.communities,
            "clusters": [
                {
                    "community_id": cluster.community_id,
                    "node_ids": list(cluster.node_ids),
                    "edge_count": cluster.edge_count,
                    "density": cluster.density,
                    "case_ids": list(cluster.case_ids),
                    "top_nodes": list(cluster.top_nodes),
                }
                for cluster in self.analytics.cluster_summaries(graph)
            ],
        }

    def bridge_payload(self, session: Session, *, case_id: str | None = None) -> list[dict[str, Any]]:
        graph = self.build_graph(session, case_id=case_id)
        return [
            {
                "entity_id": bridge.node_id,
                "label": graph.node(bridge.node_id).label,
                "entity_type": graph.node(bridge.node_id).node_type,
                "bridge_score": bridge.bridge_score,
                "level": bridge.level,
                "betweenness": bridge.betweenness,
                "articulation_point": bridge.articulation_point,
                "connects_communities": list(bridge.connects_communities),
                "related_cases": list(bridge.related_cases),
                "supporting_relationships": bridge.supporting_relationships,
                "reasons": list(bridge.reasons),
                "disclaimer": "A bridge flag describes network structure; it does not establish wrongdoing.",
            }
            for bridge in self.analytics.bridge_entities(graph)
        ]

    def financial_payload(self, session: Session, *, case_id: str | None = None) -> list[dict[str, Any]]:
        statement = select(IntelligenceRelationship).where(IntelligenceRelationship.predicate == "TRANSFERRED_TO")
        if case_id:
            statement = statement.where(IntelligenceRelationship.case_id == case_id)
        transactions: list[Transaction] = []
        for edge in session.scalars(statement):
            attributes = edge.relationship_attributes or {}
            try:
                amount = float(attributes.get("amount", 0))
            except (TypeError, ValueError):
                amount = 0.0
            transactions.append(
                Transaction(
                    transaction_id=edge.id,
                    source_id=edge.source_entity_id,
                    target_id=edge.target_entity_id,
                    amount=amount,
                    timestamp=edge.observed_at,
                    case_id=edge.case_id,
                    reference=edge.source_record_id,
                    attributes=attributes,
                )
            )
        return [
            {
                "pattern_name": alert.pattern_name,
                "entity_ids": list(alert.entity_ids),
                "transaction_ids": list(alert.transaction_ids),
                "confidence": alert.confidence,
                "why_flagged": alert.why_flagged,
                "interval_start": alert.interval_start.isoformat() if alert.interval_start else None,
                "interval_end": alert.interval_end.isoformat() if alert.interval_end else None,
                "case_ids": list(alert.case_ids),
                "evidence_status": alert.evidence_status,
                "disclaimer": "This is an analytical alert, not proof of unlawful activity.",
            }
            for alert in self.financial.analyze(transactions)
        ]

    def timeline_payload(self, session: Session, *, case_id: str | None = None, granularity: str = "day") -> list[dict[str, Any]]:
        statement = select(IntelligenceRelationship).where(IntelligenceRelationship.observed_at.is_not(None))
        if case_id:
            statement = statement.where(IntelligenceRelationship.case_id == case_id)
        events = [
            {"timestamp": edge.observed_at, "event_type": edge.predicate, "case_id": edge.case_id, "entity_ids": [edge.source_entity_id, edge.target_entity_id]}
            for edge in session.scalars(statement)
        ]
        return [
            {
                "timestamp": bucket.bucket_start.isoformat(),
                "bucket_end": bucket.bucket_end.isoformat(),
                "label": "Network activity",
                "count": bucket.event_count,
                "category": ", ".join(bucket.event_types),
                "event_types": dict(bucket.event_types),
                "case_ids": list(bucket.case_ids),
                "entity_ids": list(bucket.entity_ids),
            }
            for bucket in self.temporal.timeline(events, granularity=granularity)
        ]

    def case_profiles(self, session: Session) -> list[CaseProfile]:
        case_rows = list(session.scalars(select(Case)))
        links = list(session.scalars(select(EntityCaseLink)))
        entities = {entity.id: entity for entity in session.scalars(select(IntelligenceEntity))}
        by_case: dict[str, set[str]] = defaultdict(set)
        for link in links:
            by_case[link.case_id].add(link.entity_id)
        predicates: dict[str, set[str]] = defaultdict(set)
        for edge in session.scalars(select(IntelligenceRelationship)):
            if edge.case_id:
                predicates[edge.case_id].add(edge.predicate)
        result: list[CaseProfile] = []
        for case in case_rows:
            ids = by_case.get(case.id, set())
            identifiers: dict[str, list[str]] = defaultdict(list)
            for entity_id in ids:
                entity = entities.get(entity_id)
                if entity:
                    identifiers[entity.entity_type.casefold()].append(entity.label)
            result.append(
                CaseProfile(
                    case_id=case.id,
                    summary=f"{case.title}. {case.description or ''}",
                    entity_ids=tuple(sorted(ids)),
                    identifiers={key: tuple(sorted(values)) for key, values in identifiers.items()},
                    patterns=tuple(sorted(predicates.get(case.id, set()))),
                )
            )
        return result

    def related_cases_payload(self, session: Session, *, case_id: str | None = None) -> list[dict[str, Any]]:
        case_rows = {case.id: case for case in session.scalars(select(Case))}
        result: list[dict[str, Any]] = []
        for link in self.cross_case.discover(self.case_profiles(session)):
            if case_id and case_id not in {link.case_a, link.case_b}:
                continue
            other_id = link.case_b if case_id == link.case_a else link.case_a if case_id else link.case_b
            other = case_rows.get(other_id)
            result.append(
                {
                    "case_a": link.case_a,
                    "case_b": link.case_b,
                    "related_case_id": other_id,
                    "case_id": other_id,
                    "case_number": other.case_number if other else other_id,
                    "title": other.title if other else "Related case",
                    "confidence": link.confidence,
                    "similarity": link.confidence,
                    "shared_entities": list(link.shared_entities),
                    "shared_identifiers": {key: list(value) for key, value in link.shared_identifiers.items()},
                    "shared_patterns": list(link.shared_patterns),
                    "reasons": list(link.reasons),
                    "evidence_status": link.evidence_status,
                    "disclaimer": "Potential cross-case connection; verify supporting evidence before acting.",
                }
            )
        return result

    # ---- Snapshots / explainability / report -------------------------------------
    def capture_snapshot(self, session: Session, *, label: str, case_id: str | None) -> GraphSnapshotRecord | None:
        graph = self.build_graph(session, case_id=case_id)
        if not graph.nodes():
            return None
        snapshot = GraphSnapshot.capture(graph, snapshot_id=str(uuid4()), analytics=self.analytics)
        row = GraphSnapshotRecord(
            id=snapshot.snapshot_id,
            case_id=case_id,
            label=label,
            graph_data={
                "node_ids": sorted(snapshot.node_ids),
                "edge_ids": sorted(snapshot.edge_ids),
                "centrality": dict(snapshot.centrality),
                "bridge_node_ids": sorted(snapshot.bridge_node_ids),
            },
            captured_at=snapshot.captured_at,
        )
        session.add(row)
        session.flush()
        return row

    @staticmethod
    def _snapshot(row: GraphSnapshotRecord) -> GraphSnapshot:
        data = row.graph_data or {}
        return GraphSnapshot(
            snapshot_id=row.id,
            node_ids=frozenset(data.get("node_ids", [])),
            edge_ids=frozenset(data.get("edge_ids", [])),
            centrality=data.get("centrality", {}),
            bridge_node_ids=frozenset(data.get("bridge_node_ids", [])),
            captured_at=row.captured_at,
        )

    def delta_payload(self, session: Session, *, case_id: str | None = None, previous_id: str | None = None, current_id: str | None = None) -> dict[str, Any]:
        statement = select(GraphSnapshotRecord)
        if case_id:
            statement = statement.where(GraphSnapshotRecord.case_id == case_id)
        rows = list(session.scalars(statement.order_by(desc(GraphSnapshotRecord.captured_at)).limit(20)))
        by_id = {row.id: row for row in rows}
        current = by_id.get(current_id) if current_id else (rows[0] if rows else None)
        previous = by_id.get(previous_id) if previous_id else (rows[1] if len(rows) > 1 else None)
        if not current or not previous:
            return {"available": False, "message": "At least two snapshots are required to calculate what changed."}
        delta = self.delta.compare(self._snapshot(previous), self._snapshot(current))
        return {
            "available": True,
            "previous_snapshot_id": delta.previous_snapshot_id,
            "current_snapshot_id": delta.current_snapshot_id,
            "new_entities": list(delta.new_node_ids),
            "removed_entities": list(delta.removed_node_ids),
            "new_relationships": list(delta.new_edge_ids),
            "removed_relationships": list(delta.removed_edge_ids),
            "new_bridge_entities": list(delta.new_bridge_node_ids),
            "changed_centrality": dict(delta.changed_centrality),
            "new_cross_case_links": len(self.related_cases_payload(session, case_id=case_id)),
            "summary": list(delta.summary),
        }

    def entity_payload(self, session: Session, entity_id: str) -> dict[str, Any]:
        entity = session.get(IntelligenceEntity, entity_id)
        if entity is None:
            raise APIError(404, "ENTITY_NOT_FOUND", "The requested entity was not found.")
        graph = self.build_graph(session)
        metric = self.analytics.metrics(graph)
        cases = [item.case_id for item in session.scalars(select(EntityCaseLink).where(EntityCaseLink.entity_id == entity_id))]
        decisions = list(session.scalars(select(EntityResolutionRecord).where(or_(EntityResolutionRecord.left_entity_id == entity_id, EntityResolutionRecord.right_entity_id == entity_id))))
        return {
            "id": entity.id,
            "canonical_id": entity.canonical_id,
            "entity_type": entity.entity_type,
            "label": entity.label,
            "aliases": entity.aliases or [],
            "attributes": entity.entity_attributes or {},
            "source_record_ids": entity.source_record_ids or [],
            "confidence": entity.confidence,
            "case_ids": cases,
            "metrics": {
                "degree": metric.degree_centrality.get(entity_id, 0.0),
                "betweenness": metric.betweenness_centrality.get(entity_id, 0.0),
                "pagerank": metric.pagerank.get(entity_id, 0.0),
                "community": metric.communities.get(entity_id),
            },
            "relationships": self.graph_payload(graph, center_id=entity_id, hops=1)["edges"],
            "resolution_candidates": [self.resolution_payload(item) for item in decisions],
        }

    @staticmethod
    def resolution_payload(record: EntityResolutionRecord) -> dict[str, Any]:
        return {
            "id": record.id,
            "left_entity_id": record.left_entity_id,
            "right_entity_id": record.right_entity_id,
            "status": record.status,
            "match_confidence": record.match_confidence,
            "features": record.features or [],
            "reasons": record.reasons or [],
            "reviewed_by_id": record.reviewed_by_id,
            "review_note": record.review_note,
            "created_at": record.created_at.isoformat(),
            "reviewed_at": record.reviewed_at.isoformat() if record.reviewed_at else None,
        }

    def relationship_payload(self, session: Session, relationship_id: str) -> dict[str, Any]:
        edge = session.get(IntelligenceRelationship, relationship_id)
        if edge is None:
            raise APIError(404, "RELATIONSHIP_NOT_FOUND", "The requested relationship was not found.")
        source = session.get(IntelligenceEntity, edge.source_entity_id)
        target = session.get(IntelligenceEntity, edge.target_entity_id)
        return {
            "id": edge.id,
            "edge_id": edge.id,
            "source": {"id": edge.source_entity_id, "label": source.label if source else edge.source_entity_id},
            "target": {"id": edge.target_entity_id, "label": target.label if target else edge.target_entity_id},
            "relationship": edge.predicate,
            "confidence": edge.confidence,
            "evidence_status": edge.evidence_status,
            "derivation": edge.derivation,
            "evidence": {
                "source_record_id": edge.source_record_id,
                "document_id": edge.evidence_document_id,
                "text": edge.evidence_text,
                "provenance": edge.provenance or {},
            },
            "model_id": edge.model_id,
            "model_version": edge.model_version,
            "timestamps": {
                "first_seen": edge.first_seen.isoformat() if edge.first_seen else None,
                "last_seen": edge.last_seen.isoformat() if edge.last_seen else None,
                "observed_at": edge.observed_at.isoformat() if edge.observed_at else None,
            },
            "attributes": edge.relationship_attributes or {},
        }

    def copilot_payload(self, session: Session, *, question: str, entity_id: str | None, case_id: str | None) -> dict[str, Any]:
        answer = self.copilot.answer(question, self.build_graph(session, case_id=case_id), entity_id=entity_id)
        return {
            "answer": answer.answer,
            "entity_ids": list(answer.entity_ids),
            "edge_ids": list(answer.edge_ids),
            "evidence": [self.relationship_payload(session, edge_id) for edge_id in answer.edge_ids],
            "limitations": list(answer.limitations),
            "grounded": True,
        }

    def export_case_report(self, session: Session, *, case_id: str) -> dict[str, Any]:
        case = session.get(Case, case_id)
        if case is None:
            raise APIError(404, "CASE_NOT_FOUND", "The requested case was not found.")
        graph = self.build_graph(session, case_id=case_id)
        return {
            "generated_at": utc_now().isoformat(),
            "case": {"id": case.id, "case_number": case.case_number, "title": case.title, "description": case.description},
            "graph": self.graph_payload(graph),
            "analytics": self.analytics_payload(session, case_id=case_id),
            "bridges": self.bridge_payload(session, case_id=case_id),
            "financial_alerts": self.financial_payload(session, case_id=case_id),
            "related_cases": self.related_cases_payload(session, case_id=case_id),
            "disclaimer": "Evidence, inference, and hypothesis statuses must be reviewed separately.",
        }

    # ---- Synthetic demo -----------------------------------------------------------
    def seed_demo(self, session: Session, *, settings: Settings, actor: User, reset: bool = False) -> dict[str, Any]:
        if reset:
            self.reset_demo(session)
        bundle = build_demo_bundle()
        cases: dict[str, Case] = {}
        for item in bundle.cases:
            case = session.scalar(select(Case).where(Case.case_number == item.case_number))
            if case is None:
                case = Case(
                    case_number=item.case_number,
                    title=item.title,
                    description=item.description,
                    priority=CasePriority(item.priority),
                    status=CaseStatus.OPEN,
                    classification=item.classification,
                    created_by_id=actor.id,
                    case_metadata={"synthetic": True},
                )
                session.add(case)
                session.flush()
            cases[item.case_number] = case
        root = settings.storage_path / "synthetic_demo"
        write_demo_evidence_files(root)
        documents: dict[str, EvidenceDocument] = {}
        for item in bundle.documents:
            existing = session.scalar(select(EvidenceDocument).where(EvidenceDocument.evidence_id == item.document_id))
            if existing is None:
                content = item.content.encode()
                batch = StoredIngestionBatch(
                    case_id=cases[item.case_number].id,
                    source_type=item.source_type,
                    filename=item.filename,
                    file_hash=self.ingestion.file_hash(content),
                    storage_path=str(root / item.filename),
                    uploaded_by_id=actor.id,
                    status=StoredIngestionStatus.COMPLETED.value,
                    document_count=1,
                    completed_at=utc_now(),
                    batch_metadata={"synthetic": True},
                )
                session.add(batch)
                session.flush()
                existing = EvidenceDocument(
                    ingestion_id=batch.id,
                    case_id=cases[item.case_number].id,
                    original_filename=item.filename,
                    evidence_id=item.document_id,
                    raw_text=item.content,
                    processed_text=self.pipeline.normalize_text(item.content),
                    language=self.pipeline.identify_language(item.content),
                    extraction_metadata={"synthetic": True},
                )
                session.add(existing)
                session.flush()
            documents[item.case_number] = existing
        entities: dict[str, IntelligenceEntity] = {}
        for item in bundle.entities:
            entity = self.upsert_entity(
                session,
                canonical_id=f"demo_{item.key}",
                entity_type=item.entity_type,
                label=item.label,
                case_id=cases[item.case_numbers[0]].id if item.case_numbers else None,
                aliases=item.aliases,
                attributes={**item.attributes, "synthetic": True},
                source_record_ids=(f"DEMO:{item.key}",),
                confidence=item.confidence,
            )
            for number in item.case_numbers[1:]:
                self.upsert_entity(session, canonical_id=entity.canonical_id, entity_type=entity.entity_type, label=entity.label, case_id=cases[number].id)
            entities[item.key] = entity
        present = {item.source_record_id for item in session.scalars(select(IntelligenceRelationship)) if item.source_record_id}
        created = 0
        for item in bundle.relationships:
            if item.source_record_id in present:
                continue
            case = cases.get(item.case_number) if item.case_number else None
            self.add_relationship(
                session,
                source=entities[item.source_key],
                target=entities[item.target_key],
                predicate=item.predicate,
                case_id=case.id if case else None,
                source_record_id=item.source_record_id,
                evidence_status=item.evidence_status,
                confidence=item.confidence,
                derivation=item.derivation,
                evidence_text=item.evidence_text,
                evidence_document_id=documents[item.case_number].id if item.case_number and item.case_number in documents else None,
                observed_at=item.occurred_at,
                attributes=item.attributes,
                provenance={"source_type": "SYNTHETIC_DEMO", "synthetic": True},
            )
            created += 1
        self.run_entity_resolution(session)
        self.capture_snapshot(session, label="seeded_demo", case_id=None)
        record_audit(
            session,
            action="demo_seeded",
            resource_type="synthetic_dataset",
            actor_id=actor.id,
            details={"case_count": len(cases), "entity_count": len(entities), "relationship_count": created},
        )
        session.commit()
        return {"cases": {number: case.id for number, case in cases.items()}, "entity_count": len(entities), "relationship_count": created}

    @staticmethod
    def reset_demo(session: Session) -> None:
        demo_cases = list(session.scalars(select(Case).where(Case.case_number.like("SUTRA-%"))))
        ids = [case.id for case in demo_cases]
        if not ids:
            return
        document_ids = list(session.scalars(select(EvidenceDocument.id).where(EvidenceDocument.case_id.in_(ids))))
        session.query(IntelligenceRelationship).filter(IntelligenceRelationship.case_id.in_(ids)).delete(synchronize_session=False)
        session.query(GraphSnapshotRecord).filter(GraphSnapshotRecord.case_id.in_(ids)).delete(synchronize_session=False)
        session.query(EntityCaseLink).filter(EntityCaseLink.case_id.in_(ids)).delete(synchronize_session=False)
        if document_ids:
            session.query(EvidenceDocument).filter(EvidenceDocument.id.in_(document_ids)).delete(synchronize_session=False)
        session.query(StoredIngestionBatch).filter(StoredIngestionBatch.case_id.in_(ids)).delete(synchronize_session=False)
        session.query(Case).filter(Case.id.in_(ids)).delete(synchronize_session=False)
        session.commit()
