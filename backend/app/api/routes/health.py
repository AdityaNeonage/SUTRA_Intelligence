"""Liveness and truthful dependency health reporting endpoints."""

from __future__ import annotations

import logging
import os
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Request

from app.core.config import Settings
from app.db.database import Database
from app.schemas.health import LivenessResponse, ServiceHealth, SystemHealthResponse

logger = logging.getLogger("sutra.health")
router = APIRouter(tags=["System"])


def liveness_response(settings: Settings) -> LivenessResponse:
    """Return a no-I/O liveness payload suitable for container probes."""

    return LivenessResponse(version=settings.app_version)


def _database_service(database: Database) -> ServiceHealth:
    try:
        database.health_check()
    except Exception:
        logger.warning(
            "database_health_check_failed",
            extra={"event": "database_health_check_failed"},
        )
        return ServiceHealth(
            name="database",
            display_name="Relational Database",
            status="offline",
            detail="The relational database did not accept a health query.",
            details={"backend": database.engine.dialect.name},
        )
    backend = database.engine.dialect.name
    description = (
        "SQLite local demo store" if backend == "sqlite" else f"{backend.title()} database"
    )
    return ServiceHealth(
        name="database",
        display_name="Relational Database",
        status="online",
        detail=description,
        details={"backend": backend},
    )


def _neo4j_service(settings: Settings) -> ServiceHealth:
    if not settings.neo4j_uri:
        return ServiceHealth(
            name="neo4j",
            display_name="Neo4j Knowledge Graph",
            status="not_configured",
            detail=(
                "No NEO4J_URI is configured; graph features use their local "
                "fallback where available."
            ),
        )

    try:
        from neo4j import GraphDatabase

        auth = None
        if settings.neo4j_username and settings.neo4j_password:
            auth = (settings.neo4j_username, settings.neo4j_password)
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=auth,
            connection_timeout=settings.health_check_timeout_seconds,
        )
        try:
            driver.verify_connectivity()
        finally:
            driver.close()
    except Exception:
        logger.warning("neo4j_health_check_failed", extra={"event": "neo4j_health_check_failed"})
        return ServiceHealth(
            name="neo4j",
            display_name="Neo4j Knowledge Graph",
            status="offline",
            detail="Neo4j is configured but was not reachable.",
        )

    return ServiceHealth(
        name="neo4j",
        display_name="Neo4j Knowledge Graph",
        status="online",
        detail="Neo4j connectivity verified.",
    )


def _storage_service(settings: Settings) -> ServiceHealth:
    path = settings.storage_path
    try:
        path.mkdir(parents=True, exist_ok=True)
        is_writable = os.access(path, os.W_OK)
    except OSError:
        is_writable = False
    if not is_writable:
        return ServiceHealth(
            name="file_storage",
            display_name="Local File Storage",
            status="offline",
            detail="The configured local evidence-storage directory is not writable.",
        )
    return ServiceHealth(
        name="file_storage",
        display_name="Local File Storage",
        status="online",
        detail="Local evidence-storage directory is writable.",
        details={"path": str(path)},
    )


def _model_registry_service(settings: Settings) -> ServiceHealth:
    path: Path = settings.model_registry_path
    if not path.exists():
        return ServiceHealth(
            name="model_registry",
            display_name="Model Registry",
            status="not_configured",
            detail="No registered model directory exists yet.",
            details={"path": str(path)},
        )
    if not path.is_dir() or not os.access(path, os.R_OK):
        return ServiceHealth(
            name="model_registry",
            display_name="Model Registry",
            status="offline",
            detail="The registered model directory cannot be read.",
            details={"path": str(path)},
        )
    return ServiceHealth(
        name="model_registry",
        display_name="Model Registry",
        status="online",
        detail="Registered model directory is available.",
        details={"path": str(path)},
    )


def _configured_model_service(
    name: str,
    display_name: str,
    configured_value: str | None,
) -> ServiceHealth:
    if not configured_value:
        return ServiceHealth(
            name=name,
            display_name=display_name,
            status="not_configured",
            detail="No active model is configured.",
        )
    return ServiceHealth(
        name=name,
        display_name=display_name,
        status="degraded",
        detail="An active model is configured, but adapter health reporting is not yet available.",
        details={"configured_model": configured_value},
    )


def _llm_service(settings: Settings) -> ServiceHealth:
    if not settings.llm_provider:
        return ServiceHealth(
            name="llm_provider",
            display_name="LLM Provider",
            status="not_configured",
            detail="No LLM provider is configured; core analysis does not depend on one.",
        )
    return ServiceHealth(
        name="llm_provider",
        display_name="LLM Provider",
        status="degraded",
        detail="An LLM provider is configured, but provider health reporting is not yet available.",
        details={"configured_provider": settings.llm_provider},
    )


def build_system_health(settings: Settings, database: Database) -> SystemHealthResponse:
    """Build an accurate status report without claiming optional services are live."""

    services = [
        _database_service(database),
        _neo4j_service(settings),
        _model_registry_service(settings),
        _configured_model_service(
            "active_ner_model",
            "Active NER Model",
            settings.active_ner_model,
        ),
        _configured_model_service(
            "active_relation_model", "Active Relation Model", settings.active_relation_model
        ),
        _configured_model_service(
            "active_embedding_model", "Active Embedding Model", settings.active_embedding_model
        ),
        _llm_service(settings),
        _storage_service(settings),
    ]
    essential = {"database", "file_storage"}
    overall_status = "healthy" if all(
        service.status == "online" for service in services if service.name in essential
    ) else "degraded"
    return SystemHealthResponse(
        status=overall_status,
        timestamp=datetime.now(UTC),
        environment=settings.environment,
        services=services,
    )


@router.get("/health", response_model=LivenessResponse)
def api_liveness(request: Request) -> LivenessResponse:
    """Liveness probe under the API namespace for browser clients."""

    return liveness_response(request.app.state.settings)


@router.get("/system/health", response_model=SystemHealthResponse)
def system_health(request: Request) -> SystemHealthResponse:
    """Report relational, graph, model, provider, and storage readiness."""

    return build_system_health(request.app.state.settings, request.app.state.database)
