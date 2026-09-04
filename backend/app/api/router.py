"""Single API aggregation point for SUTRA route modules.

Future bounded routers should be imported here and included on ``api_router``;
``app.main.create_app`` applies the configured ``/api`` prefix once.
"""

from fastapi import APIRouter

from app.api.routes import auth, cases, health, intelligence

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(cases.router)
api_router.include_router(intelligence.ingestion_router)
api_router.include_router(intelligence.document_router)
api_router.include_router(intelligence.entity_router)
api_router.include_router(intelligence.relationship_router)
api_router.include_router(intelligence.graph_router)
api_router.include_router(intelligence.analytics_router)
api_router.include_router(intelligence.cross_case_router)
api_router.include_router(intelligence.copilot_router)
api_router.include_router(intelligence.feedback_router)
api_router.include_router(intelligence.audit_router)
api_router.include_router(intelligence.model_router)
api_router.include_router(intelligence.report_router)
api_router.include_router(intelligence.demo_router)
