"""Evidence, graph, analytics, feedback, reporting, and model-registry APIs."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Query, Request, UploadFile
from sqlalchemy import desc, or_, select

from app.api.deps import CurrentUser, SessionDependency, SettingsDependency
from app.core.errors import APIError
from app.entity_resolution import EntityResolutionService
from app.model_registry import ModelBundleImporter, ModelRegistry
from app.models.intelligence import (
    AuditEvent,
    EntityCaseLink,
    EntityResolutionRecord,
    EvidenceDocument,
    IngestionBatch,
    IntelligenceEntity,
    IntelligenceRelationship,
    ModelRegistration,
)
from app.models.user import UserRole
from app.schemas.intelligence import (
    CopilotQuery,
    ModelActivationRequest,
    ModelImportRequest,
    RelationshipFeedbackRequest,
    ResolutionFeedbackRequest,
)
from app.services.access import accessible_case_ids, require_case_access
from app.services.audit import record_audit
from app.services.intelligence import IntelligenceService


ingestion_router = APIRouter(prefix="/ingestion", tags=["Evidence ingestion"])
entity_router = APIRouter(prefix="/entities", tags=["Entities"])
document_router = APIRouter(prefix="/documents", tags=["Documents"])
relationship_router = APIRouter(prefix="/relationships", tags=["Relationships"])
graph_router = APIRouter(prefix="/graph", tags=["Knowledge graph"])
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])
cross_case_router = APIRouter(prefix="/cross-case", tags=["Cross-case intelligence"])
copilot_router = APIRouter(prefix="/copilot", tags=["Evidence-grounded copilot"])
feedback_router = APIRouter(prefix="/feedback", tags=["Investigator feedback"])
audit_router = APIRouter(prefix="/audit", tags=["Audit"])
model_router = APIRouter(prefix="/models", tags=["Model registry"])
report_router = APIRouter(prefix="/reports", tags=["Reporting"])

service = IntelligenceService()
model_registry = ModelRegistry()


def _case_access(case_id: str | None, session: SessionDependency, user: CurrentUser, *, write: bool = False) -> None:
    if case_id:
        require_case_access(session, case_id=case_id, user=user, write=write)


def _entity_access(entity_id: str, session: SessionDependency, user: CurrentUser) -> IntelligenceEntity:
    entity = session.get(IntelligenceEntity, entity_id)
    if entity is None:
        raise APIError(404, "ENTITY_NOT_FOUND", "The requested entity was not found.")
    ids = [item.case_id for item in session.scalars(select(EntityCaseLink).where(EntityCaseLink.entity_id == entity_id))]
    if user.role not in {UserRole.ADMINISTRATOR, UserRole.SUPERVISOR}:
        visible = accessible_case_ids(session, user) or set()
        if ids and not visible.intersection(ids):
            raise APIError(403, "CASE_ACCESS_DENIED", "You do not have access to this entity's case evidence.")
    return entity


def _audit_read(session: SessionDependency, request: Request, user: CurrentUser, *, resource_type: str, resource_id: str | None = None, case_id: str | None = None) -> None:
    record_audit(
        session,
        action="read",
        resource_type=resource_type,
        resource_id=resource_id,
        case_id=case_id,
        actor_id=user.id,
        request_id=getattr(request.state, "request_id", None),
    )
    session.commit()


@ingestion_router.post("/upload")
async def upload_evidence(
    request: Request,
    file: UploadFile = File(...),
    case_id: str | None = Query(default=None),
    source_type: str | None = Query(default=None, max_length=80),
    session: SessionDependency = None,  # type: ignore[assignment]
    settings: SettingsDependency = None,  # type: ignore[assignment]
    user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _case_access(case_id, session, user, write=True)
    return await service.upload_and_process(
        session,
        settings=settings,
        upload=file,
        case_id=case_id,
        actor=user,
        source_type=source_type,
        request_id=getattr(request.state, "request_id", None),
    )


@ingestion_router.get("")
def list_ingestions(
    request: Request,
    case_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    session: SessionDependency = None,  # type: ignore[assignment]
    user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _case_access(case_id, session, user)
    statement = select(IngestionBatch).order_by(desc(IngestionBatch.created_at)).limit(limit)
    if case_id:
        statement = statement.where(IngestionBatch.case_id == case_id)
    elif user.role not in {UserRole.ADMINISTRATOR, UserRole.SUPERVISOR}:
        visible = accessible_case_ids(session, user) or set()
        statement = statement.where(IngestionBatch.case_id.in_(visible))
    rows = list(session.scalars(statement))
    _audit_read(session, request, user, resource_type="ingestion_batch", case_id=case_id)
    return {
        "items": [
            {
                "id": row.id, "case_id": row.case_id, "source_type": row.source_type, "filename": row.filename,
                "file_hash": row.file_hash, "status": row.status, "row_count": row.row_count,
                "document_count": row.document_count, "created_at": row.created_at, "completed_at": row.completed_at,
            }
            for row in rows
        ]
    }


@document_router.get("/{document_id}")
def read_document(
    document_id: str,
    request: Request,
    session: SessionDependency = None,  # type: ignore[assignment]
    user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    document = session.get(EvidenceDocument, document_id)
    if document is None:
        raise APIError(404, "DOCUMENT_NOT_FOUND", "The requested evidence document was not found.")
    _case_access(document.case_id, session, user)
    _audit_read(session, request, user, resource_type="document", resource_id=document_id, case_id=document.case_id)
    return {
        "id": document.id, "ingestion_id": document.ingestion_id, "case_id": document.case_id,
        "evidence_id": document.evidence_id, "filename": document.original_filename, "raw_text": document.raw_text,
        "processed_text": document.processed_text, "language": document.language, "page_count": document.page_count,
        "extraction_metadata": document.extraction_metadata or {}, "created_at": document.created_at,
    }


@entity_router.get("")
def list_entities(
    request: Request,
    case_id: str | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
    entity_type: str | None = Query(default=None, max_length=80),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    session: SessionDependency = None,  # type: ignore[assignment]
    user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _case_access(case_id, session, user)
    statement = select(IntelligenceEntity)
    if case_id:
        statement = statement.join(EntityCaseLink, EntityCaseLink.entity_id == IntelligenceEntity.id).where(EntityCaseLink.case_id == case_id)
    elif user.role not in {UserRole.ADMINISTRATOR, UserRole.SUPERVISOR}:
        visible = accessible_case_ids(session, user) or set()
        statement = statement.join(EntityCaseLink, EntityCaseLink.entity_id == IntelligenceEntity.id).where(EntityCaseLink.case_id.in_(visible))
    if q and q.strip():
        statement = statement.where(IntelligenceEntity.label.ilike(f"%{q.strip()}%"))
    if entity_type:
        statement = statement.where(IntelligenceEntity.entity_type.ilike(entity_type))
    rows = list(session.scalars(statement.order_by(IntelligenceEntity.label).offset(offset).limit(limit)))
    _audit_read(session, request, user, resource_type="entity", case_id=case_id)
    return {
        "items": [
            {"id": row.id, "canonical_id": row.canonical_id, "entity_type": row.entity_type, "label": row.label,
             "aliases": row.aliases or [], "confidence": row.confidence, "attributes": row.entity_attributes or {}}
            for row in rows
        ],
        "offset": offset, "limit": limit,
    }


@entity_router.get("/{entity_id}")
def read_entity(entity_id: str, request: Request, session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    _entity_access(entity_id, session, user)
    payload = service.entity_payload(session, entity_id)
    _audit_read(session, request, user, resource_type="entity", resource_id=entity_id)
    return payload


@relationship_router.get("/{relationship_id}")
def read_relationship(relationship_id: str, request: Request, session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    edge = session.get(IntelligenceRelationship, relationship_id)
    if edge is None:
        raise APIError(404, "RELATIONSHIP_NOT_FOUND", "The requested relationship was not found.")
    _case_access(edge.case_id, session, user)
    payload = service.relationship_payload(session, relationship_id)
    _audit_read(session, request, user, resource_type="relationship", resource_id=relationship_id, case_id=edge.case_id)
    return payload


@graph_router.get("/neighborhood")
def graph_neighborhood(
    request: Request,
    case_id: str | None = Query(default=None),
    seed_id: str | None = Query(default=None),
    depth: int = Query(default=1, ge=1, le=3),
    max_nodes: int = Query(default=200, ge=1, le=500),
    session: SessionDependency = None,  # type: ignore[assignment]
    user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _case_access(case_id, session, user)
    graph = service.build_graph(session, case_id=case_id)
    if seed_id and seed_id not in {item.node_id for item in graph.nodes()}:
        raise APIError(404, "GRAPH_NODE_NOT_FOUND", "The seed entity is not present in the permitted graph.")
    payload = service.graph_payload(graph, center_id=seed_id, hops=depth, max_nodes=max_nodes)
    _audit_read(session, request, user, resource_type="graph_neighborhood", resource_id=seed_id, case_id=case_id)
    return payload


@graph_router.get("/path")
def graph_path(
    request: Request,
    source_id: str,
    target_id: str,
    case_id: str | None = Query(default=None),
    session: SessionDependency = None,  # type: ignore[assignment]
    user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _case_access(case_id, session, user)
    graph = service.build_graph(session, case_id=case_id)
    path = graph.shortest_path(source_id, target_id)
    _audit_read(session, request, user, resource_type="graph_path", case_id=case_id)
    if path is None:
        return {"found": False, "message": "No path exists in the currently permitted evidence graph."}
    return {"found": True, "node_ids": list(path.node_ids), "total_cost": path.total_cost, "edges": service.graph_payload(graph, center_id=source_id, hops=3)["edges"]}


@graph_router.get("/community")
def graph_communities(request: Request, case_id: str | None = Query(default=None), session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    _case_access(case_id, session, user)
    payload = service.analytics_payload(session, case_id=case_id)
    _audit_read(session, request, user, resource_type="graph_communities", case_id=case_id)
    return {"communities": payload["communities"], "clusters": payload["clusters"]}


@analytics_router.get("/centrality")
def centrality(request: Request, case_id: str | None = Query(default=None), session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    _case_access(case_id, session, user)
    payload = service.analytics_payload(session, case_id=case_id)
    _audit_read(session, request, user, resource_type="analytics_centrality", case_id=case_id)
    return payload


@analytics_router.get("/bridges")
def bridges(request: Request, case_id: str | None = Query(default=None), session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    _case_access(case_id, session, user)
    payload = service.bridge_payload(session, case_id=case_id)
    _audit_read(session, request, user, resource_type="analytics_bridges", case_id=case_id)
    return {"items": payload, "bridges": payload}


@analytics_router.get("/financial")
def financial(request: Request, case_id: str | None = Query(default=None), session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    _case_access(case_id, session, user)
    payload = service.financial_payload(session, case_id=case_id)
    _audit_read(session, request, user, resource_type="analytics_financial", case_id=case_id)
    return {"items": payload, "alerts": payload}


@analytics_router.get("/timeline")
def timeline(
    request: Request,
    case_id: str | None = Query(default=None),
    granularity: str = Query(default="day", pattern="^(hour|day|month)$"),
    session: SessionDependency = None,  # type: ignore[assignment]
    user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _case_access(case_id, session, user)
    payload = service.timeline_payload(session, case_id=case_id, granularity=granularity)
    _audit_read(session, request, user, resource_type="analytics_timeline", case_id=case_id)
    return {"items": payload, "events": payload}


@analytics_router.get("/delta")
def graph_delta(
    request: Request,
    case_id: str | None = Query(default=None),
    previous_id: str | None = Query(default=None),
    current_id: str | None = Query(default=None),
    session: SessionDependency = None,  # type: ignore[assignment]
    user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _case_access(case_id, session, user)
    payload = service.delta_payload(session, case_id=case_id, previous_id=previous_id, current_id=current_id)
    _audit_read(session, request, user, resource_type="analytics_delta", case_id=case_id)
    return payload


@cross_case_router.get("")
def related_cases(request: Request, case_id: str | None = Query(default=None), session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    _case_access(case_id, session, user)
    payload = service.related_cases_payload(session, case_id=case_id)
    _audit_read(session, request, user, resource_type="cross_case", case_id=case_id)
    return {"items": payload, "related_cases": payload}


@copilot_router.post("/query")
def copilot_query(payload: CopilotQuery, request: Request, session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    _case_access(payload.case_id, session, user)
    result = service.copilot_payload(session, question=payload.question, entity_id=payload.entity_id, case_id=payload.case_id)
    record_audit(session, action="copilot_query", resource_type="copilot", actor_id=user.id, case_id=payload.case_id, request_id=getattr(request.state, "request_id", None), details={"entity_id": payload.entity_id})
    session.commit()
    return result


@feedback_router.post("/entity-resolution/{resolution_id}")
def review_entity_resolution(
    resolution_id: str,
    payload: ResolutionFeedbackRequest,
    request: Request,
    session: SessionDependency = None,
    user: CurrentUser = None,
) -> dict[str, Any]:
    if user.role is UserRole.VIEWER:
        raise APIError(403, "PERMISSION_DENIED", "Viewer accounts cannot submit analyst feedback.")
    record = session.get(EntityResolutionRecord, resolution_id)
    if record is None:
        raise APIError(404, "RESOLUTION_NOT_FOUND", "The requested entity-resolution decision was not found.")
    current = service.resolution_payload(record)
    decision = EntityResolutionService.apply_manual_review(
        # Minimal DTO reconstruction preserves the original transparent features.
        __import__("app.entity_resolution", fromlist=["ResolutionDecision"]).ResolutionDecision(
            left_id=record.left_entity_id,
            right_id=record.right_entity_id,
            status=__import__("app.entity_resolution", fromlist=["ResolutionStatus"]).ResolutionStatus(record.status),
            match_confidence=record.match_confidence,
            features=tuple(__import__("app.entity_resolution", fromlist=["MatchFeature"]).MatchFeature(**feature) for feature in (record.features or [])),
            auto_match_eligible=False,
            reasons=tuple(record.reasons or []),
        ),
        confirmed=payload.confirmed,
        reviewed_by=user.id,
        note=payload.note,
    )
    record.status = decision.status.value
    record.reviewed_by_id = user.id
    record.review_note = payload.note
    from app.services.intelligence import utc_now
    record.reviewed_at = utc_now()
    record_audit(session, action="entity_resolution_reviewed", resource_type="entity_resolution", resource_id=record.id, actor_id=user.id, request_id=getattr(request.state, "request_id", None), details={"old_status": current["status"], "new_status": record.status, "confirmed": payload.confirmed})
    session.commit()
    return service.resolution_payload(record)


@feedback_router.post("/relationship/{relationship_id}")
def review_relationship(
    relationship_id: str,
    payload: RelationshipFeedbackRequest,
    request: Request,
    session: SessionDependency = None,
    user: CurrentUser = None,
) -> dict[str, Any]:
    edge = session.get(IntelligenceRelationship, relationship_id)
    if edge is None:
        raise APIError(404, "RELATIONSHIP_NOT_FOUND", "The requested relationship was not found.")
    _case_access(edge.case_id, session, user, write=True)
    previous = edge.evidence_status
    edge.evidence_status = payload.status
    edge.provenance = {**(edge.provenance or {}), "investigator_note": payload.note, "reviewed_by": user.id}
    record_audit(session, action="relationship_reviewed", resource_type="relationship", resource_id=edge.id, case_id=edge.case_id, actor_id=user.id, request_id=getattr(request.state, "request_id", None), details={"old_status": previous, "new_status": edge.evidence_status})
    session.commit()
    return service.relationship_payload(session, edge.id)


@audit_router.get("")
def list_audit(
    request: Request,
    case_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    session: SessionDependency = None,  # type: ignore[assignment]
    user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _case_access(case_id, session, user)
    if user.role is UserRole.VIEWER:
        raise APIError(403, "PERMISSION_DENIED", "Viewer accounts cannot access audit records.")
    statement = select(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(limit)
    if case_id:
        statement = statement.where(AuditEvent.case_id == case_id)
    rows = list(session.scalars(statement))
    _audit_read(session, request, user, resource_type="audit", case_id=case_id)
    return {"items": [{"id": row.id, "actor_id": row.actor_id, "action": row.action, "resource_type": row.resource_type, "resource_id": row.resource_id, "case_id": row.case_id, "details": row.event_details or {}, "created_at": row.created_at} for row in rows]}


@report_router.get("/cases/{case_id}.json")
def export_case(case_id: str, request: Request, session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    _case_access(case_id, session, user)
    payload = service.export_case_report(session, case_id=case_id)
    record_audit(session, action="case_exported", resource_type="case_report", resource_id=case_id, case_id=case_id, actor_id=user.id, request_id=getattr(request.state, "request_id", None))
    session.commit()
    return payload


def _models_root(settings: SettingsDependency) -> Path:
    return settings.model_registry_path.parent.resolve()


@model_router.get("")
def list_models(request: Request, session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    if user.role not in {UserRole.ADMINISTRATOR, UserRole.SUPERVISOR}:
        raise APIError(403, "PERMISSION_DENIED", "Only administrators or supervisors can view model registry metadata.")
    rows = list(session.scalars(select(ModelRegistration).order_by(ModelRegistration.task, desc(ModelRegistration.priority))))
    _audit_read(session, request, user, resource_type="model_registry")
    return {"items": [{"id": row.id, "model_id": row.model_id, "model_name": row.model_name, "task": row.task, "version": row.version, "framework": row.framework, "languages": row.languages, "checksum": row.checksum, "metrics": row.metrics, "active": row.is_active, "priority": row.priority, "path": row.bundle_path, "source": row.source, "input_schema": row.input_schema, "output_schema": row.output_schema, "health_status": row.health_status, "registered_at": row.registered_at} for row in rows]}


@model_router.post("/import")
def import_model(payload: ModelImportRequest, request: Request, settings: SettingsDependency = None, session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    if user.role is not UserRole.ADMINISTRATOR:
        raise APIError(403, "PERMISSION_DENIED", "Only administrators can import a model bundle.")
    root = _models_root(settings)
    incoming = (root / "incoming").resolve()
    candidate = Path(payload.bundle_path).resolve()
    try:
        candidate.relative_to(incoming)
    except ValueError as exc:
        raise APIError(422, "MODEL_PATH_NOT_ALLOWED", "Bundles must be imported from models/incoming.") from exc
    result = ModelBundleImporter(model_registry).import_bundle(candidate, activate=payload.activate)
    target_base = root / ("registered" if result.accepted else "quarantine")
    target_base.mkdir(parents=True, exist_ok=True)
    target = target_base / candidate.name
    if target.exists():
        target = target_base / f"{candidate.name}_{candidate.stat().st_mtime_ns}"
    shutil.move(str(candidate), str(target))
    if not result.accepted or result.registered is None:
        record_audit(session, action="model_import_failed", resource_type="model_bundle", actor_id=user.id, request_id=getattr(request.state, "request_id", None), details={"path": str(target), "reason": result.reason})
        session.commit()
        raise APIError(422, "MODEL_LOAD_FAILED", "Model bundle was quarantined after validation failed.", {"reason": result.reason, "path": str(target)})
    metadata = result.registered.metadata
    previous = session.scalar(select(ModelRegistration).where(ModelRegistration.model_id == metadata.model_id, ModelRegistration.version == metadata.version))
    if previous is None:
        previous = ModelRegistration(
            model_id=metadata.model_id, model_name=metadata.name, task=metadata.task.value, version=metadata.version,
            framework=metadata.framework, languages=list(metadata.languages), checksum=result.checksum or "", metrics=dict(metadata.metrics),
            is_active=result.registered.active, priority=metadata.priority, bundle_path=str(target), source=metadata.source or "unknown",
            input_schema=metadata.input_schema, output_schema=metadata.output_schema,
            health_status="healthy" if result.registered.health.healthy else "unhealthy",
        )
        session.add(previous)
    else:
        previous.is_active = result.registered.active
        previous.bundle_path = str(target)
        previous.health_status = "healthy" if result.registered.health.healthy else "unhealthy"
    if result.registered.active:
        for row in session.scalars(select(ModelRegistration).where(ModelRegistration.task == metadata.task.value, ModelRegistration.id != previous.id)):
            row.is_active = False
    record_audit(session, action="model_registered", resource_type="model", resource_id=metadata.model_id, actor_id=user.id, request_id=getattr(request.state, "request_id", None), details={"version": metadata.version, "task": metadata.task.value, "checksum": result.checksum})
    session.commit()
    return {"accepted": True, "model_id": metadata.model_id, "version": metadata.version, "registered_path": str(target), "checksum": result.checksum, "health": result.registered.health.message}


@model_router.post("/{model_id}/activate")
def activate_model(model_id: str, payload: ModelActivationRequest, request: Request, session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    if user.role is not UserRole.ADMINISTRATOR:
        raise APIError(403, "PERMISSION_DENIED", "Only administrators can activate a model.")
    row = session.scalar(select(ModelRegistration).where(ModelRegistration.model_id == model_id).order_by(desc(ModelRegistration.priority)))
    if row is None:
        raise APIError(404, "MODEL_NOT_FOUND", "The requested registered model was not found.")
    if payload.active:
        for candidate in session.scalars(select(ModelRegistration).where(ModelRegistration.task == row.task)):
            candidate.is_active = candidate.id == row.id
    else:
        row.is_active = False
    record_audit(session, action="model_activation_changed", resource_type="model", resource_id=row.model_id, actor_id=user.id, request_id=getattr(request.state, "request_id", None), details={"active": row.is_active})
    session.commit()
    return {"model_id": row.model_id, "version": row.version, "active": row.is_active}


@model_router.post("/{model_id}/test")
def test_model(model_id: str, request: Request, session: SessionDependency = None, user: CurrentUser = None) -> dict[str, Any]:
    if user.role not in {UserRole.ADMINISTRATOR, UserRole.SUPERVISOR}:
        raise APIError(403, "PERMISSION_DENIED", "Your role cannot test model bundles.")
    row = session.scalar(select(ModelRegistration).where(ModelRegistration.model_id == model_id).order_by(desc(ModelRegistration.registered_at)))
    if row is None:
        raise APIError(404, "MODEL_NOT_FOUND", "The requested registered model was not found.")
    # Installed adapters are tested by the CLI/importer; this endpoint reports
    # the persisted verification rather than pretending to reload an unavailable framework.
    record_audit(session, action="model_tested", resource_type="model", resource_id=model_id, actor_id=user.id, request_id=getattr(request.state, "request_id", None))
    session.commit()
    return {"model_id": row.model_id, "version": row.version, "healthy": row.health_status == "healthy", "health_status": row.health_status, "message": "Last import-time adapter health check."}
