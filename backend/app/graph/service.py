"""NetworkX-backed graph construction with evidence-preserving edge attributes."""

from __future__ import annotations

from collections import deque
from dataclasses import replace
from typing import Any, Iterable, Mapping, Sequence

try:
    import networkx as nx
except ImportError as exc:  # pragma: no cover - dependency failure is actionable
    raise RuntimeError("SUTRA graph services require networkx") from exc

from .models import GraphEdge, GraphNode, GraphPath, GraphSlice


class GraphNotFoundError(KeyError):
    pass


class KnowledgeGraph:
    """In-memory baseline graph compatible with later Neo4j persistence adapters.

    Multiple evidence-bearing edges are kept in a ``MultiDiGraph``; callers do
    not lose provenance merely because two entities have several relationships.
    """

    def __init__(self, graph: nx.MultiDiGraph | None = None) -> None:
        self._graph: nx.MultiDiGraph = graph if graph is not None else nx.MultiDiGraph()

    @property
    def networkx(self) -> nx.MultiDiGraph:
        return self._graph

    def add_node(self, node: GraphNode) -> GraphNode:
        if self._graph.has_node(node.node_id):
            current = self.node(node.node_id)
            merged = GraphNode(
                node_id=node.node_id,
                node_type=node.node_type or current.node_type,
                label=node.label or current.label,
                attributes={**dict(current.attributes), **dict(node.attributes)},
                case_ids=tuple(sorted(set(current.case_ids) | set(node.case_ids))),
                created_at=current.created_at,
            )
            node = merged
        self._graph.add_node(node.node_id, graph_node=node)
        return node

    def add_nodes(self, nodes: Iterable[GraphNode]) -> list[GraphNode]:
        return [self.add_node(node) for node in nodes]

    def node(self, node_id: str) -> GraphNode:
        try:
            return self._graph.nodes[node_id]["graph_node"]
        except KeyError as exc:
            raise GraphNotFoundError(f"Unknown graph node: {node_id}") from exc

    def add_edge(self, edge: GraphEdge) -> GraphEdge:
        if not self._graph.has_node(edge.source_id) or not self._graph.has_node(edge.target_id):
            missing = [
                node_id
                for node_id in (edge.source_id, edge.target_id)
                if not self._graph.has_node(node_id)
            ]
            raise GraphNotFoundError(f"Cannot create edge; missing node(s): {', '.join(missing)}")
        assert edge.edge_id is not None
        if self._graph.has_edge(edge.source_id, edge.target_id, key=edge.edge_id):
            existing = self.edge(edge.edge_id)
            # Repeat ingestion updates rolling weights and source evidence rather
            # than producing a visually indistinguishable duplicate edge.
            merged_provenance = {item.provenance_id: item for item in existing.provenance}
            merged_provenance.update({item.provenance_id: item for item in edge.provenance})
            edge = replace(
                existing,
                weight=existing.weight + edge.weight,
                confidence=max(existing.confidence, edge.confidence),
                first_seen=min(filter(None, (existing.first_seen, edge.first_seen)), default=None),
                last_seen=max(filter(None, (existing.last_seen, edge.last_seen)), default=None),
                provenance=tuple(merged_provenance.values()),
                attributes={**dict(existing.attributes), **dict(edge.attributes)},
            )
        self._graph.add_edge(edge.source_id, edge.target_id, key=edge.edge_id, graph_edge=edge)
        return edge

    def add_edges(self, edges: Iterable[GraphEdge]) -> list[GraphEdge]:
        return [self.add_edge(edge) for edge in edges]

    def edge(self, edge_id: str) -> GraphEdge:
        for _, _, key, data in self._graph.edges(keys=True, data=True):
            if key == edge_id:
                return data["graph_edge"]
        raise GraphNotFoundError(f"Unknown graph edge: {edge_id}")

    def edges(self) -> list[GraphEdge]:
        return [data["graph_edge"] for _, _, data in self._graph.edges(data=True)]

    def nodes(self) -> list[GraphNode]:
        return [data["graph_node"] for _, data in self._graph.nodes(data=True)]

    def neighborhood(
        self,
        center_id: str,
        *,
        hops: int = 1,
        max_nodes: int = 200,
        relationship_types: set[str] | None = None,
    ) -> GraphSlice:
        if hops < 0:
            raise ValueError("hops must not be negative")
        self.node(center_id)
        visited: set[str] = {center_id}
        queue: deque[tuple[str, int]] = deque([(center_id, 0)])
        truncated = False
        while queue:
            current, depth = queue.popleft()
            if depth >= hops:
                continue
            for neighbour in self._undirected_neighbours(current, relationship_types):
                if neighbour in visited:
                    continue
                if len(visited) >= max_nodes:
                    truncated = True
                    queue.clear()
                    break
                visited.add(neighbour)
                queue.append((neighbour, depth + 1))
        selected_edges = [
            edge
            for edge in self.edges()
            if edge.source_id in visited
            and edge.target_id in visited
            and (relationship_types is None or edge.relationship in relationship_types)
        ]
        return GraphSlice(
            center_id=center_id,
            hops=hops,
            nodes=tuple(self.node(node_id) for node_id in sorted(visited)),
            edges=tuple(sorted(selected_edges, key=lambda edge: str(edge.edge_id))),
            truncated=truncated,
        )

    def shortest_path(
        self,
        source_id: str,
        target_id: str,
        *,
        directed: bool = False,
        relationship_types: set[str] | None = None,
    ) -> GraphPath | None:
        self.node(source_id)
        self.node(target_id)
        graph = self._simple_graph(directed=directed, relationship_types=relationship_types)
        try:
            node_ids = nx.shortest_path(graph, source_id, target_id, weight="cost")
        except nx.NetworkXNoPath:
            return None
        selected_edges = tuple(
            self._best_edge_between(node_ids[index], node_ids[index + 1], directed=directed, relationship_types=relationship_types)
            for index in range(len(node_ids) - 1)
        )
        return GraphPath(
            source_id=source_id,
            target_id=target_id,
            node_ids=tuple(node_ids),
            edges=selected_edges,
            total_cost=round(sum(1.0 / edge.weight for edge in selected_edges), 6),
        )

    def common_neighbours(self, left_id: str, right_id: str) -> list[GraphNode]:
        self.node(left_id)
        self.node(right_id)
        left_neighbours = set(self._undirected_neighbours(left_id))
        right_neighbours = set(self._undirected_neighbours(right_id))
        return [self.node(node_id) for node_id in sorted(left_neighbours & right_neighbours)]

    def node_case_ids(self, node_id: str) -> set[str]:
        node = self.node(node_id)
        case_ids = set(node.case_ids)
        for edge in self._graph.in_edges(node_id, data=True):
            if edge[2]["graph_edge"].case_id:
                case_ids.add(edge[2]["graph_edge"].case_id)
        for edge in self._graph.out_edges(node_id, data=True):
            if edge[2]["graph_edge"].case_id:
                case_ids.add(edge[2]["graph_edge"].case_id)
        return case_ids

    def as_simple_graph(self, *, directed: bool = False) -> nx.Graph | nx.DiGraph:
        """Public collapsed graph used by analytics without losing original edges."""

        return self._simple_graph(directed=directed)

    def _undirected_neighbours(
        self, node_id: str, relationship_types: set[str] | None = None
    ) -> Iterable[str]:
        for source, target, data in self._graph.in_edges(node_id, data=True):
            edge: GraphEdge = data["graph_edge"]
            if relationship_types is None or edge.relationship in relationship_types:
                yield source
        for source, target, data in self._graph.out_edges(node_id, data=True):
            edge = data["graph_edge"]
            if relationship_types is None or edge.relationship in relationship_types:
                yield target

    def _simple_graph(
        self,
        *,
        directed: bool,
        relationship_types: set[str] | None = None,
    ) -> nx.Graph | nx.DiGraph:
        result: nx.Graph | nx.DiGraph = nx.DiGraph() if directed else nx.Graph()
        for node in self.nodes():
            result.add_node(node.node_id, graph_node=node)
        for edge in self.edges():
            if relationship_types is not None and edge.relationship not in relationship_types:
                continue
            source, target = edge.source_id, edge.target_id
            if result.has_edge(source, target):
                result[source][target]["weight"] += edge.weight
                result[source][target]["confidence"] = max(result[source][target]["confidence"], edge.confidence)
                result[source][target]["edge_ids"].append(edge.edge_id)
                result[source][target]["cost"] = 1.0 / result[source][target]["weight"]
            else:
                result.add_edge(
                    source,
                    target,
                    weight=edge.weight,
                    confidence=edge.confidence,
                    cost=1.0 / edge.weight,
                    edge_ids=[edge.edge_id],
                )
        return result

    def _best_edge_between(
        self,
        left_id: str,
        right_id: str,
        *,
        directed: bool,
        relationship_types: set[str] | None,
    ) -> GraphEdge:
        candidates: list[GraphEdge] = []
        for source, target in ((left_id, right_id),) if directed else ((left_id, right_id), (right_id, left_id)):
            if self._graph.has_edge(source, target):
                candidates.extend(
                    data["graph_edge"]
                    for data in self._graph[source][target].values()
                    if relationship_types is None or data["graph_edge"].relationship in relationship_types
                )
        if not candidates:
            raise GraphNotFoundError(f"No graph edge joins {left_id} and {right_id}")
        return max(candidates, key=lambda edge: (edge.weight, edge.confidence, str(edge.edge_id)))
