"""A non-generative, graph-and-provenance-grounded copilot fallback.

It deliberately does not make allegations or invent evidence.  A registered LLM
can later call this service for facts and formulate prose above it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Sequence

from app.analytics import GraphAnalyticsService
from app.graph import KnowledgeGraph
from app.provenance import ProvenanceService


@dataclass(frozen=True, slots=True)
class CopilotAnswer:
    answer: str
    entity_ids: tuple[str, ...]
    edge_ids: tuple[str, ...]
    evidence: tuple[dict[str, Any], ...]
    limitations: tuple[str, ...]


class GraphGroundedCopilot:
    """Answers a small, transparent investigator-question subset without an LLM."""

    def __init__(self, analytics: GraphAnalyticsService | None = None) -> None:
        self.analytics = analytics or GraphAnalyticsService()

    def answer(
        self,
        question: str,
        graph: KnowledgeGraph,
        *,
        entity_id: str | None = None,
    ) -> CopilotAnswer:
        normalized = question.casefold()
        if "path" in normalized and "between" in normalized:
            candidates = self._nodes_named_in_question(question, graph)
            if len(candidates) >= 2:
                return self._path_answer(graph, candidates[0], candidates[1])
        target = entity_id or (self._nodes_named_in_question(question, graph) or [None])[0]
        if target is None:
            return CopilotAnswer(
                answer="Please specify an entity ID present in the graph so I can ground the answer in supplied evidence.",
                entity_ids=(), edge_ids=(), evidence=(),
                limitations=("This fallback does not guess entity identities from ungrounded text.",),
            )
        try:
            node = graph.node(target)
        except KeyError:
            return CopilotAnswer(
                answer=f"I could not find entity '{target}' in the current graph.",
                entity_ids=(), edge_ids=(), evidence=(), limitations=("No assertion was made from absent data.",),
            )
        adjacent = [edge for edge in graph.edges() if target in {edge.source_id, edge.target_id}]
        metrics = self.analytics.metrics(graph)
        bridges = {item.node_id: item for item in self.analytics.bridge_entities(graph)}
        evidence = tuple(
            ProvenanceService.why(provenance)
            for edge in adjacent
            for provenance in edge.provenance
        )
        statements = [
            f"{node.label} ({node.node_type}) has {len(adjacent)} directly observed or inferred relationships in the current graph.",
            f"Its degree centrality is {metrics.degree_centrality.get(target, 0.0):.3f} and betweenness centrality is {metrics.betweenness_centrality.get(target, 0.0):.3f}.",
        ]
        if target in bridges:
            bridge = bridges[target]
            statements.append(
                f"It is flagged as a {bridge.level.lower()} structural bridge because " + " ".join(bridge.reasons)
            )
        else:
            statements.append("It is not currently flagged as a structural bridge by the configured graph rules.")
        return CopilotAnswer(
            answer=" ".join(statements),
            entity_ids=(target,),
            edge_ids=tuple(str(edge.edge_id) for edge in adjacent),
            evidence=evidence,
            limitations=("This is decision support only; network position does not establish wrongdoing.",),
        )

    def _path_answer(self, graph: KnowledgeGraph, left: str, right: str) -> CopilotAnswer:
        path = graph.shortest_path(left, right)
        if path is None:
            return CopilotAnswer(
                answer=f"No path currently connects {left} and {right} in the loaded evidence graph.",
                entity_ids=(left, right), edge_ids=(), evidence=(),
                limitations=("A missing graph path is not proof that no real-world connection exists.",),
            )
        evidence = tuple(
            ProvenanceService.why(provenance)
            for edge in path.edges
            for provenance in edge.provenance
        )
        return CopilotAnswer(
            answer=f"The shortest evidence graph path is {' → '.join(path.node_ids)} across {len(path.edges)} relationships.",
            entity_ids=path.node_ids,
            edge_ids=tuple(str(edge.edge_id) for edge in path.edges),
            evidence=evidence,
            limitations=("The path reports supplied/inferred relationships; verify each evidence record before acting.",),
        )

    @staticmethod
    def _nodes_named_in_question(question: str, graph: KnowledgeGraph) -> list[str]:
        found: list[str] = []
        lower = question.casefold()
        for node in graph.nodes():
            if node.node_id.casefold() in lower or node.label.casefold() in lower:
                found.append(node.node_id)
        return found
