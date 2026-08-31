"""Add evidence provenance, graph projection, model, and audit tables.

Revision ID: 20260830_0002
Revises: 20260830_0001
Create Date: 2026-08-30
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260830_0002"
down_revision = "20260830_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ingestion_batches",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id"), nullable=True),
        sa.Column("source_type", sa.String(80), nullable=False),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=False),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column("uploaded_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("document_count", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("batch_metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ingestion_batches_case_id", "ingestion_batches", ["case_id"])
    op.create_index("ix_ingestion_batches_file_hash", "ingestion_batches", ["file_hash"])
    op.create_index("ix_ingestion_batches_uploaded_by_id", "ingestion_batches", ["uploaded_by_id"])

    op.create_table(
        "evidence_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ingestion_id", sa.String(36), sa.ForeignKey("ingestion_batches.id"), nullable=False),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id"), nullable=True),
        sa.Column("original_filename", sa.String(512), nullable=False),
        sa.Column("evidence_id", sa.String(128), nullable=False, unique=True),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("processed_text", sa.Text(), nullable=False),
        sa.Column("language", sa.String(16), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("extraction_metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_evidence_documents_ingestion_id", "evidence_documents", ["ingestion_id"])
    op.create_index("ix_evidence_documents_case_id", "evidence_documents", ["case_id"])
    op.create_index("ix_evidence_documents_evidence_id", "evidence_documents", ["evidence_id"], unique=True)

    op.create_table(
        "intelligence_entities",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("canonical_id", sa.String(128), nullable=False, unique=True),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("label", sa.String(1024), nullable=False),
        sa.Column("normalized_label", sa.String(1024), nullable=False),
        sa.Column("aliases", sa.JSON(), nullable=False),
        sa.Column("entity_attributes", sa.JSON(), nullable=False),
        sa.Column("source_record_ids", sa.JSON(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_intelligence_entities_canonical_id", "intelligence_entities", ["canonical_id"], unique=True)
    op.create_index("ix_intelligence_entities_entity_type", "intelligence_entities", ["entity_type"])
    op.create_index("ix_intelligence_entities_normalized_label", "intelligence_entities", ["normalized_label"])

    op.create_table(
        "entity_case_links",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("entity_id", sa.String(36), sa.ForeignKey("intelligence_entities.id"), nullable=False),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("entity_id", "case_id", name="uq_entity_case_link"),
    )
    op.create_index("ix_entity_case_links_entity_id", "entity_case_links", ["entity_id"])
    op.create_index("ix_entity_case_links_case_id", "entity_case_links", ["case_id"])

    op.create_table(
        "intelligence_relationships",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("source_entity_id", sa.String(36), sa.ForeignKey("intelligence_entities.id"), nullable=False),
        sa.Column("target_entity_id", sa.String(36), sa.ForeignKey("intelligence_entities.id"), nullable=False),
        sa.Column("predicate", sa.String(100), nullable=False),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id"), nullable=True),
        sa.Column("source_record_id", sa.String(160), nullable=True),
        sa.Column("evidence_document_id", sa.String(36), sa.ForeignKey("evidence_documents.id"), nullable=True),
        sa.Column("evidence_status", sa.String(24), nullable=False),
        sa.Column("derivation", sa.String(512), nullable=False),
        sa.Column("model_id", sa.String(160), nullable=True),
        sa.Column("model_version", sa.String(80), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evidence_text", sa.Text(), nullable=True),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("relationship_attributes", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    for name, column in (
        ("ix_intelligence_relationships_source_entity_id", "source_entity_id"),
        ("ix_intelligence_relationships_target_entity_id", "target_entity_id"),
        ("ix_intelligence_relationships_predicate", "predicate"),
        ("ix_intelligence_relationships_case_id", "case_id"),
        ("ix_intelligence_relationships_source_record_id", "source_record_id"),
        ("ix_intelligence_relationships_evidence_document_id", "evidence_document_id"),
    ):
        op.create_index(name, "intelligence_relationships", [column])

    op.create_table(
        "entity_resolution_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("left_entity_id", sa.String(36), sa.ForeignKey("intelligence_entities.id"), nullable=False),
        sa.Column("right_entity_id", sa.String(36), sa.ForeignKey("intelligence_entities.id"), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("match_confidence", sa.Float(), nullable=False),
        sa.Column("features", sa.JSON(), nullable=False),
        sa.Column("reasons", sa.JSON(), nullable=False),
        sa.Column("reviewed_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("left_entity_id", "right_entity_id", name="uq_resolution_pair"),
    )
    op.create_index("ix_entity_resolution_records_left_entity_id", "entity_resolution_records", ["left_entity_id"])
    op.create_index("ix_entity_resolution_records_right_entity_id", "entity_resolution_records", ["right_entity_id"])

    op.create_table(
        "model_registrations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("model_id", sa.String(160), nullable=False),
        sa.Column("model_name", sa.String(256), nullable=False),
        sa.Column("task", sa.String(80), nullable=False),
        sa.Column("version", sa.String(80), nullable=False),
        sa.Column("framework", sa.String(80), nullable=False),
        sa.Column("languages", sa.JSON(), nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("bundle_path", sa.String(1024), nullable=False),
        sa.Column("source", sa.String(256), nullable=False),
        sa.Column("input_schema", sa.String(128), nullable=False),
        sa.Column("output_schema", sa.String(128), nullable=False),
        sa.Column("health_status", sa.String(32), nullable=False),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("model_id", "version", name="uq_model_version"),
    )
    op.create_index("ix_model_registrations_model_id", "model_registrations", ["model_id"])
    op.create_index("ix_model_registrations_task", "model_registrations", ["task"])
    op.create_index("ix_model_registrations_checksum", "model_registrations", ["checksum"])

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("actor_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("resource_type", sa.String(80), nullable=False),
        sa.Column("resource_id", sa.String(160), nullable=True),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id"), nullable=True),
        sa.Column("request_id", sa.String(80), nullable=True),
        sa.Column("event_details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    for name, column in (
        ("ix_audit_events_actor_id", "actor_id"), ("ix_audit_events_action", "action"),
        ("ix_audit_events_resource_id", "resource_id"), ("ix_audit_events_case_id", "case_id"),
        ("ix_audit_events_request_id", "request_id"),
    ):
        op.create_index(name, "audit_events", [column])

    op.create_table(
        "graph_snapshot_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("case_id", sa.String(36), sa.ForeignKey("cases.id"), nullable=True),
        sa.Column("label", sa.String(256), nullable=False),
        sa.Column("graph_data", sa.JSON(), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_graph_snapshot_records_case_id", "graph_snapshot_records", ["case_id"])


def downgrade() -> None:
    op.drop_index("ix_graph_snapshot_records_case_id", table_name="graph_snapshot_records")
    op.drop_table("graph_snapshot_records")
    for name in ("ix_audit_events_request_id", "ix_audit_events_case_id", "ix_audit_events_resource_id", "ix_audit_events_action", "ix_audit_events_actor_id"):
        op.drop_index(name, table_name="audit_events")
    op.drop_table("audit_events")
    for name in ("ix_model_registrations_checksum", "ix_model_registrations_task", "ix_model_registrations_model_id"):
        op.drop_index(name, table_name="model_registrations")
    op.drop_table("model_registrations")
    op.drop_index("ix_entity_resolution_records_right_entity_id", table_name="entity_resolution_records")
    op.drop_index("ix_entity_resolution_records_left_entity_id", table_name="entity_resolution_records")
    op.drop_table("entity_resolution_records")
    for name in ("ix_intelligence_relationships_evidence_document_id", "ix_intelligence_relationships_source_record_id", "ix_intelligence_relationships_case_id", "ix_intelligence_relationships_predicate", "ix_intelligence_relationships_target_entity_id", "ix_intelligence_relationships_source_entity_id"):
        op.drop_index(name, table_name="intelligence_relationships")
    op.drop_table("intelligence_relationships")
    op.drop_index("ix_entity_case_links_case_id", table_name="entity_case_links")
    op.drop_index("ix_entity_case_links_entity_id", table_name="entity_case_links")
    op.drop_table("entity_case_links")
    for name in ("ix_intelligence_entities_normalized_label", "ix_intelligence_entities_entity_type", "ix_intelligence_entities_canonical_id"):
        op.drop_index(name, table_name="intelligence_entities")
    op.drop_table("intelligence_entities")
    op.drop_index("ix_evidence_documents_evidence_id", table_name="evidence_documents")
    op.drop_index("ix_evidence_documents_case_id", table_name="evidence_documents")
    op.drop_index("ix_evidence_documents_ingestion_id", table_name="evidence_documents")
    op.drop_table("evidence_documents")
    for name in ("ix_ingestion_batches_uploaded_by_id", "ix_ingestion_batches_file_hash", "ix_ingestion_batches_case_id"):
        op.drop_index(name, table_name="ingestion_batches")
    op.drop_table("ingestion_batches")
