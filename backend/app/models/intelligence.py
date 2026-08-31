"""Relational persistence for evidence, graph projections, and analyst actions.

The graph algorithms stay database-agnostic. These rows retain enough source
context to rebuild a NetworkX graph locally or project it to Neo4j later.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class IngestionStatus(StrEnum):
    RECEIVED = "received"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class EvidenceClassification(StrEnum):
    VERIFIED = "VERIFIED"
    INFERRED = "INFERRED"
    HYPOTHESIS = "HYPOTHESIS"


class ResolutionDecisionStatus(StrEnum):
    AUTO_MATCHED = "AUTO_MATCHED"
    POSSIBLE_MATCH = "POSSIBLE_MATCH"
    NOT_MATCH = "NOT_MATCH"
    MANUALLY_CONFIRMED = "MANUALLY_CONFIRMED"
    MANUALLY_REJECTED = "MANUALLY_REJECTED"


class IngestionBatch(Base):
    __tablename__ = "ingestion_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str | None] = mapped_column(ForeignKey("cases.id"), index=True, nullable=True)
    source_type: Mapped[str] = mapped_column(String(80), nullable=False)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    uploaded_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=IngestionStatus.RECEIVED.value, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    document_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    batch_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EvidenceDocument(Base):
    __tablename__ = "evidence_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    ingestion_id: Mapped[str] = mapped_column(ForeignKey("ingestion_batches.id"), index=True, nullable=False)
    case_id: Mapped[str | None] = mapped_column(ForeignKey("cases.id"), index=True, nullable=True)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    evidence_id: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    processed_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    language: Mapped[str] = mapped_column(String(16), default="und", nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extraction_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class IntelligenceEntity(Base):
    __tablename__ = "intelligence_entities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    canonical_id: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(1024), nullable=False)
    normalized_label: Mapped[str] = mapped_column(String(1024), index=True, nullable=False)
    aliases: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    entity_attributes: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    source_record_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class EntityCaseLink(Base):
    __tablename__ = "entity_case_links"
    __table_args__ = (UniqueConstraint("entity_id", "case_id", name="uq_entity_case_link"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    entity_id: Mapped[str] = mapped_column(ForeignKey("intelligence_entities.id"), index=True, nullable=False)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class IntelligenceRelationship(Base):
    __tablename__ = "intelligence_relationships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    source_entity_id: Mapped[str] = mapped_column(ForeignKey("intelligence_entities.id"), index=True, nullable=False)
    target_entity_id: Mapped[str] = mapped_column(ForeignKey("intelligence_entities.id"), index=True, nullable=False)
    predicate: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    case_id: Mapped[str | None] = mapped_column(ForeignKey("cases.id"), index=True, nullable=True)
    source_record_id: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    evidence_document_id: Mapped[str | None] = mapped_column(ForeignKey("evidence_documents.id"), index=True, nullable=True)
    evidence_status: Mapped[str] = mapped_column(String(24), default=EvidenceClassification.VERIFIED.value, nullable=False)
    derivation: Mapped[str] = mapped_column(String(512), nullable=False)
    model_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(80), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    first_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    observed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    provenance: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    relationship_attributes: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class EntityResolutionRecord(Base):
    __tablename__ = "entity_resolution_records"
    __table_args__ = (UniqueConstraint("left_entity_id", "right_entity_id", name="uq_resolution_pair"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    left_entity_id: Mapped[str] = mapped_column(ForeignKey("intelligence_entities.id"), index=True, nullable=False)
    right_entity_id: Mapped[str] = mapped_column(ForeignKey("intelligence_entities.id"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    match_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    features: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    reasons: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    reviewed_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ModelRegistration(Base):
    __tablename__ = "model_registrations"
    __table_args__ = (UniqueConstraint("model_id", "version", name="uq_model_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    model_id: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    model_name: Mapped[str] = mapped_column(String(256), nullable=False)
    task: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(80), nullable=False)
    framework: Mapped[str] = mapped_column(String(80), nullable=False)
    languages: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    metrics: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bundle_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    source: Mapped[str] = mapped_column(String(256), nullable=False)
    input_schema: Mapped[str] = mapped_column(String(128), nullable=False)
    output_schema: Mapped[str] = mapped_column(String(128), nullable=False)
    health_status: Mapped[str] = mapped_column(String(32), default="unknown", nullable=False)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class AuditEvent(Base):
    """Append-only audit entry; application services deliberately never update it."""

    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(80), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    case_id: Mapped[str | None] = mapped_column(ForeignKey("cases.id"), index=True, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    event_details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class GraphSnapshotRecord(Base):
    __tablename__ = "graph_snapshot_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str | None] = mapped_column(ForeignKey("cases.id"), index=True, nullable=True)
    label: Mapped[str] = mapped_column(String(256), nullable=False)
    graph_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
