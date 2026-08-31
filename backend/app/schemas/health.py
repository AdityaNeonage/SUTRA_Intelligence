"""System readiness response contracts."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ServiceState = Literal["online", "offline", "degraded", "not_configured"]
SystemState = Literal["healthy", "degraded"]


class ServiceHealth(BaseModel):
    name: str
    display_name: str
    status: ServiceState
    detail: str
    details: dict[str, Any] = Field(default_factory=dict)


class LivenessResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "sutra-api"
    version: str


class SystemHealthResponse(BaseModel):
    status: SystemState
    timestamp: datetime
    environment: str
    services: list[ServiceHealth]

