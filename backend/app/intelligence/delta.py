"""Snapshots and explicit 'What changed?' graph intelligence results."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Mapping, Sequence

from app.analytics.graph_analytics import BridgeEntity, GraphAnalyticsService
from app.graph import GraphEdge, GraphNode, KnowledgeGraph


@dataclass(frozen=True, slots=True)
class GraphSnapshot:
    snapshot_id: str
    node_ids: frozenset[str]
    edge_ids: frozenset[str]
    centrality: Mapping[str, float]
    bridge_node_ids: frozenset[str]
    captured_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def capture(
        cls,
        graph: KnowledgeGraph,
        *,
        snapshot_id: str,
        analytics: GraphAnalyticsService | None = None,
    ) -> "GraphSnapshot":
        service = analytics or GraphAnalyticsService()
        metrics = service.metrics(graph)
        bridges = service.bridge_entities(graph)
        return cls(
            snapshot_id=snapshot_id,
            node_ids=frozenset(node.node_id for node in graph.nodes()),
            edge_ids=frozenset(str(edge.edge_id) for edge in graph.edges()),
            centrality=metrics.betweenness_centrality,
            bridge_node_ids=frozenset(bridge.node_id for bridge in bridges),
        )


@dataclass(frozen=True, slots=True)
class GraphDelta:
    previous_snapshot_id: str
    current_snapshot_id: str
    new_node_ids: tuple[str, ...]
    removed_node_ids: tuple[str, ...]
    new_edge_ids: tuple[str, ...]
    removed_edge_ids: tuple[str, ...]
    new_bridge_node_ids: tuple[str, ...]
    changed_centrality: Mapping[str, float]
    summary: tuple[str, ...]


class GraphDeltaService:
    """Compare immutable snapshots; no hidden mutable 'before' graph state."""

    def compare(
        self,
        previous: GraphSnapshot,
        current: GraphSnapshot,
        *,
        centrality_change_threshold: float = 0.05,
    ) -> GraphDelta:
        new_nodes = tuple(sorted(current.node_ids - previous.node_ids))
        removed_nodes = tuple(sorted(previous.node_ids - current.node_ids))
        new_edges = tuple(sorted(current.edge_ids - previous.edge_ids))
        removed_edges = tuple(sorted(previous.edge_ids - current.edge_ids))
        new_bridges = tuple(sorted(current.bridge_node_ids - previous.bridge_node_ids))
        changed = {
            node: round(value - previous.centrality.get(node, 0.0), 6)
            for node, value in current.centrality.items()
            if abs(value - previous.centrality.get(node, 0.0)) >= centrality_change_threshold
        }
        summary = (
            f"+{len(new_nodes)} entities",
            f"+{len(new_edges)} relationships",
            f"+{len(new_bridges)} bridge entities",
            f"{len(changed)} material centrality changes",
        )
        return GraphDelta(
            previous_snapshot_id=previous.snapshot_id,
            current_snapshot_id=current.snapshot_id,
            new_node_ids=new_nodes,
            removed_node_ids=removed_nodes,
            new_edge_ids=new_edges,
            removed_edge_ids=removed_edges,
            new_bridge_node_ids=new_bridges,
            changed_centrality=changed,
            summary=summary,
        )
