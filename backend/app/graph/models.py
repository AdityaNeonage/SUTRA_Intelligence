"""Graph DTOs; graph persistence adapters can serialize these values directly."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any, Mapping

from app.provenance import EvidenceStatus, ProvenanceRecord


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True, slots=True)
class GraphNode:
    node_id: str
    node_type: str
    label: str
    attributes: Mapping[str, Any] = field(default_factory=dict)
    case_ids: tuple[str, ...] = ()
    created_at: datetime = field(default_factory=utc_now)

    def to_dict(self) -> dict[str, Any]:
        return {
            "node_id": self.node_id,
            "node_type": self.node_type,
            "label": self.label,
            "attributes": dict(self.attributes),
            "case_ids": list(self.case_ids),
            "created_at": self.created_at.isoformat(),
        }


@dataclass(frozen=True, slots=True)
class GraphEdge:
    source_id: str
    target_id: str
    relationship: str
    edge_id: str | None = None
    case_id: str | None = None
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    timestamp: datetime | None = None
    weight: float = 1.0
    confidence: float = 1.0
    evidence_status: EvidenceStatus = EvidenceStatus.VERIFIED
    derivation: str = "supplied record"
    model_id: str | None = None
    model_version: str | None = None
    provenance: tuple[ProvenanceRecord, ...] = ()
    attributes: Mapping[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=utc_now)

    def __post_init__(self) -> None:
        if not self.source_id or not self.target_id:
            raise ValueError("Graph edges need source and target node IDs")
        if self.weight <= 0:
            raise ValueError("Graph edge weight must be positive")
        if not 0 <= self.confidence <= 1:
            raise ValueError("Graph edge confidence must be between 0 and 1")
        if self.edge_id is None:
            evidence_ids = ",".join(sorted(item.provenance_id for item in self.provenance))
            raw = f"{self.source_id}|{self.target_id}|{self.relationship}|{self.case_id or ''}|{evidence_ids}|{self.derivation}"
            object.__setattr__(self, "edge_id", f"edge_{sha256(raw.encode('utf-8')).hexdigest()[:20]}")

    def to_dict(self) -> dict[str, Any]:
        return {
            "edge_id": self.edge_id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "relationship": self.relationship,
            "case_id": self.case_id,
            "first_seen": self.first_seen.isoformat() if self.first_seen else None,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "weight": self.weight,
            "confidence": self.confidence,
            "evidence_status": self.evidence_status.value,
            "derivation": self.derivation,
            "model_id": self.model_id,
            "model_version": self.model_version,
            "provenance": [item.to_dict() for item in self.provenance],
            "attributes": dict(self.attributes),
            "created_at": self.created_at.isoformat(),
        }


@dataclass(frozen=True, slots=True)
class GraphSlice:
    center_id: str
    hops: int
    nodes: tuple[GraphNode, ...]
    edges: tuple[GraphEdge, ...]
    truncated: bool = False


@dataclass(frozen=True, slots=True)
class GraphPath:
    source_id: str
    target_id: str
    node_ids: tuple[str, ...]
    edges: tuple[GraphEdge, ...]
    total_cost: float
