"""NetworkX graph measures, communities, and explainable bridge detection."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from math import isfinite
from typing import Any

try:
    import networkx as nx
except ImportError as exc:  # pragma: no cover
    raise RuntimeError("SUTRA analytics require networkx") from exc

from app.graph import KnowledgeGraph


@dataclass(frozen=True, slots=True)
class GraphMetrics:
    node_count: int
    edge_count: int
    component_count: int
    density: float
    degree_centrality: Mapping[str, float]
    betweenness_centrality: Mapping[str, float]
    pagerank: Mapping[str, float]
    communities: Mapping[str, int]


@dataclass(frozen=True, slots=True)
class ClusterSummary:
    community_id: int
    node_ids: tuple[str, ...]
    edge_count: int
    density: float
    case_ids: tuple[str, ...]
    top_nodes: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class BridgeEntity:
    """A network-position alert, not a guilt or threat assessment."""

    node_id: str
    bridge_score: float
    level: str
    betweenness: float
    articulation_point: bool
    connects_communities: tuple[int, ...]
    related_cases: tuple[str, ...]
    supporting_relationships: int
    reasons: tuple[str, ...]


class GraphAnalyticsService:
    """Computes graph metrics from a KnowledgeGraph or NetworkX graph."""

    def metrics(self, graph: KnowledgeGraph | nx.Graph | nx.DiGraph | nx.MultiGraph | nx.MultiDiGraph) -> GraphMetrics:
        simple = self._simple_undirected(graph)
        directed = self._simple_directed(graph)
        if simple.number_of_nodes() == 0:
            return GraphMetrics(0, 0, 0, 0.0, {}, {}, {}, {})
        components = list(nx.connected_components(simple))
        degree = nx.degree_centrality(simple)
        betweenness = nx.betweenness_centrality(simple, weight="cost", normalized=True)
        pagerank = self._pagerank(directed)
        communities = self.community_map(simple)
        return GraphMetrics(
            node_count=simple.number_of_nodes(),
            edge_count=simple.number_of_edges(),
            component_count=len(components),
            density=round(nx.density(simple), 6),
            degree_centrality=self._round_mapping(degree),
            betweenness_centrality=self._round_mapping(betweenness),
            pagerank=self._round_mapping(pagerank),
            communities=communities,
        )

    @staticmethod
    def _pagerank(
        graph: nx.DiGraph,
        *,
        alpha: float = 0.85,
        max_iterations: int = 100,
        tolerance: float = 1.0e-6,
    ) -> dict[str, float]:
        """Compute weighted PageRank without NetworkX's optional SciPy dependency."""

        nodes = list(graph.nodes)
        if not nodes:
            return {}
        count = len(nodes)
        ranks = {node: 1.0 / count for node in nodes}
        outgoing = {
            node: sum(
                float(data.get("weight", 1.0))
                for _, _, data in graph.out_edges(node, data=True)
            )
            for node in nodes
        }
        teleport = (1.0 - alpha) / count
        for _ in range(max_iterations):
            dangling = alpha * sum(ranks[node] for node in nodes if outgoing[node] <= 0) / count
            next_ranks = {node: teleport + dangling for node in nodes}
            for source in nodes:
                total = outgoing[source]
                if total <= 0:
                    continue
                for _, target, data in graph.out_edges(source, data=True):
                    weight = float(data.get("weight", 1.0))
                    next_ranks[target] += alpha * ranks[source] * weight / total
            error = sum(abs(next_ranks[node] - ranks[node]) for node in nodes)
            ranks = next_ranks
            if error < count * tolerance:
                break
        total_rank = sum(ranks.values()) or 1.0
        return {str(node): rank / total_rank for node, rank in ranks.items()}

    def community_map(self, graph: KnowledgeGraph | nx.Graph | nx.DiGraph | nx.MultiGraph | nx.MultiDiGraph) -> dict[str, int]:
        simple = self._simple_undirected(graph)
        if simple.number_of_nodes() == 0:
            return {}
        communities: list[set[str]] = []
        for component in nx.connected_components(simple):
            subgraph = simple.subgraph(component)
            if len(component) <= 2 or subgraph.number_of_edges() == 0:
                communities.append(set(component))
            else:
                # Greedy modularity is deterministic for a stable insertion order.
                communities.extend(set(group) for group in nx.community.greedy_modularity_communities(subgraph, weight="weight"))
        ordered = sorted(communities, key=lambda group: (-len(group), tuple(sorted(group))))
        return {node: index for index, group in enumerate(ordered, start=1) for node in group}

    def cluster_summaries(
        self, graph: KnowledgeGraph | nx.Graph | nx.DiGraph | nx.MultiGraph | nx.MultiDiGraph
    ) -> list[ClusterSummary]:
        simple = self._simple_undirected(graph)
        metrics = self.metrics(graph)
        groups: dict[int, set[str]] = {}
        for node, community in metrics.communities.items():
            groups.setdefault(community, set()).add(node)
        summaries: list[ClusterSummary] = []
        for community_id, nodes in sorted(groups.items()):
            subgraph = simple.subgraph(nodes)
            case_ids = set()
            for node in nodes:
                case_ids.update(self._node_case_ids(graph, node))
            top_nodes = sorted(
                nodes,
                key=lambda node: (metrics.betweenness_centrality.get(node, 0.0), metrics.degree_centrality.get(node, 0.0), node),
                reverse=True,
            )[:5]
            summaries.append(
                ClusterSummary(
                    community_id=community_id,
                    node_ids=tuple(sorted(nodes)),
                    edge_count=subgraph.number_of_edges(),
                    density=round(nx.density(subgraph), 6) if len(nodes) > 1 else 0.0,
                    case_ids=tuple(sorted(case_ids)),
                    top_nodes=tuple(top_nodes),
                )
            )
        return summaries

    def bridge_entities(
        self,
        graph: KnowledgeGraph | nx.Graph | nx.DiGraph | nx.MultiGraph | nx.MultiDiGraph,
        *,
        minimum_score: float = 0.25,
    ) -> list[BridgeEntity]:
        """Flag structural connectors using several explainable graph signals."""

        simple = self._simple_undirected(graph)
        if simple.number_of_nodes() < 3:
            return []
        metrics = self.metrics(graph)
        articulation_points = set(nx.articulation_points(simple))
        communities = metrics.communities
        bridge_entities: list[BridgeEntity] = []
        for node in simple.nodes:
            neighbours = set(simple.neighbors(node))
            connected = tuple(sorted({communities.get(neighbour, 0) for neighbour in neighbours if communities.get(neighbour)}))
            cross_community_score = min(1.0, max(0, len(connected) - 1) / 2)
            related_cases = tuple(sorted(self._node_case_ids(graph, node)))
            multi_case_score = min(1.0, max(0, len(related_cases) - 1) / 2)
            betweenness = metrics.betweenness_centrality.get(node, 0.0)
            articulation_score = 1.0 if node in articulation_points else 0.0
            score = round(
                min(
                    1.0,
                    0.48 * betweenness
                    + 0.30 * articulation_score
                    + 0.14 * cross_community_score
                    + 0.08 * multi_case_score,
                ),
                4,
            )
            # Articulation points are meaningful even when a small network gives
            # low normalized centrality, so retain them at the configured floor.
            if node in articulation_points and score < minimum_score:
                score = minimum_score
            if score < minimum_score:
                continue
            reasons: list[str] = []
            if betweenness > 0:
                reasons.append(f"High betweenness centrality ({betweenness:.3f}) creates short paths across the network.")
            if node in articulation_points:
                reasons.append("Removing this entity separates at least two parts of the observed network.")
            if len(connected) > 1:
                reasons.append(f"Direct relationships reach {len(connected)} detected communities.")
            if len(related_cases) > 1:
                reasons.append(f"Evidence places this entity in {len(related_cases)} cases.")
            level = "HIGH" if score >= 0.65 else "MEDIUM" if score >= 0.40 else "LOW"
            bridge_entities.append(
                BridgeEntity(
                    node_id=str(node),
                    bridge_score=score,
                    level=level,
                    betweenness=betweenness,
                    articulation_point=node in articulation_points,
                    connects_communities=connected,
                    related_cases=related_cases,
                    supporting_relationships=len(neighbours),
                    reasons=tuple(reasons),
                )
            )
        return sorted(bridge_entities, key=lambda item: (-item.bridge_score, item.node_id))

    def shortest_path(
        self,
        graph: KnowledgeGraph | nx.Graph | nx.DiGraph | nx.MultiGraph | nx.MultiDiGraph,
        source_id: str,
        target_id: str,
    ) -> list[str] | None:
        simple = self._simple_undirected(graph)
        try:
            return list(nx.shortest_path(simple, source_id, target_id, weight="cost"))
        except nx.NetworkXNoPath:
            return None

    @staticmethod
    def _round_mapping(values: Mapping[Any, float]) -> dict[str, float]:
        return {str(key): round(value if isfinite(value) else 0.0, 6) for key, value in values.items()}

    @staticmethod
    def _simple_undirected(
        graph: KnowledgeGraph | nx.Graph | nx.DiGraph | nx.MultiGraph | nx.MultiDiGraph
    ) -> nx.Graph:
        if isinstance(graph, KnowledgeGraph):
            return graph.as_simple_graph(directed=False)
        result = nx.Graph()
        result.add_nodes_from(graph.nodes(data=True))
        edge_iter = graph.edges(data=True, keys=True) if graph.is_multigraph() else ((left, right, None, data) for left, right, data in graph.edges(data=True))
        for left, right, _, data in edge_iter:
            weight = float(data.get("weight", 1.0))
            if result.has_edge(left, right):
                result[left][right]["weight"] += weight
                result[left][right]["cost"] = 1.0 / result[left][right]["weight"]
            else:
                result.add_edge(left, right, weight=weight, cost=1.0 / max(weight, 1e-9))
        return result

    @staticmethod
    def _simple_directed(
        graph: KnowledgeGraph | nx.Graph | nx.DiGraph | nx.MultiGraph | nx.MultiDiGraph
    ) -> nx.DiGraph:
        if isinstance(graph, KnowledgeGraph):
            return graph.as_simple_graph(directed=True)  # type: ignore[return-value]
        result = nx.DiGraph()
        result.add_nodes_from(graph.nodes(data=True))
        edge_iter = graph.edges(data=True, keys=True) if graph.is_multigraph() else ((left, right, None, data) for left, right, data in graph.edges(data=True))
        for left, right, _, data in edge_iter:
            weight = float(data.get("weight", 1.0))
            if result.has_edge(left, right):
                result[left][right]["weight"] += weight
                result[left][right]["cost"] = 1.0 / result[left][right]["weight"]
            else:
                result.add_edge(left, right, weight=weight, cost=1.0 / max(weight, 1e-9))
        return result

    @staticmethod
    def _node_case_ids(graph: Any, node: str) -> set[str]:
        if isinstance(graph, KnowledgeGraph):
            return graph.node_case_ids(node)
        data = graph.nodes[node]
        raw = data.get("case_ids", ())
        return {str(item) for item in raw}
