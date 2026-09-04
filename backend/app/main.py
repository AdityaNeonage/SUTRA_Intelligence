"""FastAPI application factory and production ASGI entry point."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.api.routes.health import liveness_response
from app.core.config import Settings, get_settings
from app.core.errors import APIError
from app.core.logging import configure_logging
from app.db.bootstrap import create_schema, ensure_demo_user
from app.db.database import Database
from app.models.user import User
from app.schemas.common import ErrorDetail, ErrorResponse
from app.schemas.health import LivenessResponse
from app.services.intelligence import IntelligenceService

logger = logging.getLogger("sutra")


def _error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict | None = None,
) -> JSONResponse:
    body = ErrorResponse(error=ErrorDetail(code=code, message=message, details=details or {}))
    return JSONResponse(status_code=status_code, content=jsonable_encoder(body))


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create an isolated application instance, making tests and deployments explicit."""

    active_settings = settings or get_settings()
    active_settings.validate_runtime_safety()
    configure_logging("DEBUG" if active_settings.debug else "INFO")
    database = Database(active_settings.database_url, echo=active_settings.database_echo)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings.storage_path.mkdir(parents=True, exist_ok=True)
        if app.state.settings.database_auto_create:
            create_schema(app.state.database)
        demo_user_id = ensure_demo_user(app.state.database, app.state.settings)
        if app.state.settings.seed_demo_data and demo_user_id:
            with app.state.database.session() as session:
                demo_user = session.get(User, demo_user_id)
                if demo_user is not None:
                    IntelligenceService().seed_demo(
                        session,
                        settings=app.state.settings,
                        actor=demo_user,
                    )
        logger.info("application_started", extra={"event": "application_started"})
        try:
            yield
        finally:
            app.state.database.dispose()
            logger.info("application_stopped", extra={"event": "application_stopped"})

    app = FastAPI(
        title=active_settings.app_name,
        version=active_settings.app_version,
        description=(
            "Evidence-centric decision-support APIs. Analytical results must be "
            "distinguished from verified evidence and investigator hypotheses."
        ),
        lifespan=lifespan,
        debug=active_settings.debug,
    )
    app.state.settings = active_settings
    app.state.database = database

    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_logging(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request.state.request_id = request_id
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "request_failed",
                extra={
                    "event": "request_failed",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                },
            )
            raise
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_completed",
            extra={
                "event": "request_completed",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response

    @app.exception_handler(APIError)
    async def handle_api_error(_: Request, exc: APIError) -> JSONResponse:
        return _error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            details=exc.details,
        )

    @app.exception_handler(HTTPException)
    async def handle_http_error(_: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "code" in exc.detail and "message" in exc.detail:
            return _error_response(
                status_code=exc.status_code,
                code=str(exc.detail["code"]),
                message=str(exc.detail["message"]),
                details=exc.detail.get("details", {}),
            )
        return _error_response(
            status_code=exc.status_code,
            code="HTTP_ERROR",
            message=str(exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _error_response(
            status_code=422,
            code="REQUEST_VALIDATION_ERROR",
            message="The request payload or parameters are invalid.",
            details={"issues": jsonable_encoder(exc.errors())},
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "unhandled_application_error",
            extra={
                "event": "unhandled_application_error",
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        return _error_response(
            status_code=500,
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred.",
        )

    @app.get("/health", response_model=LivenessResponse, tags=["System"])
    def root_liveness() -> LivenessResponse:
        """Container-friendly liveness probe outside the versioned API prefix."""

        return liveness_response(active_settings)

    app.include_router(api_router, prefix=active_settings.api_prefix)
    return app


app = create_app()
