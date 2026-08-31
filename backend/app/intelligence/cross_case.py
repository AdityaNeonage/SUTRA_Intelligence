"""Evidence-led case similarity and potential cross-case link discovery."""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping, Sequence

from app.entity_resolution.service import normalize_identifier
from app.graph import KnowledgeGraph


@dataclass(frozen=True, slots=True)
class CaseProfile:
    case_id: str
    summary: str = ""
    entity_ids: tuple[str, ...] = ()
    identifiers: Mapping[str, tuple[str, ...] | list[str] | str] = field(default_factory=dict)
    patterns: tuple[str, ...] = ()

    @classmethod
    def from_mapping(cls, item: Mapping[str, Any]) -> "CaseProfile":
        identifiers = item.get("identifiers") or {}
        if not isinstance(identifiers, Mapping):
            identifiers = {}
        raw_entities = item.get("entity_ids") or item.get("entities") or ()
        if isinstance(raw_entities, str):
            raw_entities = (raw_entities,)
        raw_patterns = item.get("patterns") or ()
        if isinstance(raw_patterns, str):
            raw_patterns = (raw_patterns,)
        return cls(
            case_id=str(item["case_id"]),
            summary=str(item.get("summary") or item.get("description") or ""),
            entity_ids=tuple(str(value) for value in raw_entities),
            identifiers=dict(identifiers),
            patterns=tuple(str(value) for value in raw_patterns),
        )


@dataclass(frozen=True, slots=True)
class RelatedCaseLink:
    case_a: str
    case_b: str
    confidence: float
    shared_entities: tuple[str, ...]
    shared_identifiers: Mapping[str, tuple[str, ...]]
    shared_patterns: tuple[str, ...]
    text_similarity: float
    reasons: tuple[str, ...]
    evidence_status: str = "INFERRED"


class CaseSimilarityService:
    """Transparent token baseline until a registered embedding model replaces it."""

    _STOPWORDS = {
        "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "with",
        "was", "were", "is", "are", "that", "this", "from", "by", "case", "complaint",
    }

    def similarity(self, left: CaseProfile, right: CaseProfile) -> tuple[float, tuple[str, ...]]:
        left_tokens, right_tokens = self._tokens(left.summary), self._tokens(right.summary)
        text_score = len(left_tokens & right_tokens) / len(left_tokens | right_tokens) if left_tokens | right_tokens else 0.0
        shared_patterns = set(left.patterns) & set(right.patterns)
        pattern_score = len(shared_patterns) / max(len(set(left.patterns) | set(right.patterns)), 1)
        shared_entities = set(left.entity_ids) & set(right.entity_ids)
        entity_score = min(1.0, len(shared_entities) / 3)
        score = round(min(1.0, 0.45 * text_score + 0.25 * pattern_score + 0.30 * entity_score), 4)
        reasons: list[str] = []
        if text_score:
            common = sorted(left_tokens & right_tokens)[:5]
            reasons.append(f"Overlapping case-description terms: {', '.join(common)}.")
        if shared_patterns:
            reasons.append(f"Shared supplied patterns: {', '.join(sorted(shared_patterns))}.")
        if shared_entities:
            reasons.append(f"Shared canonical entities: {', '.join(sorted(shared_entities))}.")
        return score, tuple(reasons)

    def _tokens(self, text: str) -> set[str]:
        return {
            token
            for token in re.findall(r"[a-z0-9]{3,}", text.casefold())
            if token not in self._STOPWORDS
        }


class CrossCaseDiscoveryService:
    """Find potential related cases without presenting them as established fact."""

    _STRONG_KINDS = {"phone", "account", "upi", "device", "imei", "vehicle", "ip", "domain"}

    def __init__(self, similarity_service: CaseSimilarityService | None = None) -> None:
        self.similarity_service = similarity_service or CaseSimilarityService()

    def discover(
        self,
        profiles: Sequence[CaseProfile],
        *,
        minimum_confidence: float = 0.35,
    ) -> list[RelatedCaseLink]:
        links: list[RelatedCaseLink] = []
        for index, left in enumerate(profiles):
            for right in profiles[index + 1 :]:
                link = self.compare(left, right)
                if link.confidence >= minimum_confidence:
                    links.append(link)
        return sorted(links, key=lambda link: (-link.confidence, link.case_a, link.case_b))

    def compare(self, left: CaseProfile, right: CaseProfile) -> RelatedCaseLink:
        shared_entities = tuple(sorted(set(left.entity_ids) & set(right.entity_ids)))
        shared_identifiers = self._shared_identifiers(left, right)
        shared_patterns = tuple(sorted(set(left.patterns) & set(right.patterns)))
        text_similarity, similarity_reasons = self.similarity_service.similarity(left, right)
        strong_hits = sum(len(values) for kind, values in shared_identifiers.items() if kind.casefold() in self._STRONG_KINDS)
        score = min(
            0.98,
            0.48 * min(1.0, strong_hits)
            + 0.20 * min(1.0, len(shared_entities) / 2)
            + 0.14 * min(1.0, len(shared_patterns) / 2)
            + 0.18 * text_similarity,
        )
        reasons: list[str] = []
        for kind, values in sorted(shared_identifiers.items()):
            reasons.append(f"Shared {kind}: {', '.join(values)}.")
        if shared_entities:
            reasons.append(f"Shared graph entities: {', '.join(shared_entities)}.")
        if shared_patterns:
            reasons.append(f"Shared supplied patterns: {', '.join(shared_patterns)}.")
        reasons.extend(similarity_reasons)
        if not reasons:
            reasons.append("No corroborating evidence was found.")
        return RelatedCaseLink(
            case_a=left.case_id,
            case_b=right.case_id,
            confidence=round(score, 4),
            shared_entities=shared_entities,
            shared_identifiers=shared_identifiers,
            shared_patterns=shared_patterns,
            text_similarity=text_similarity,
            reasons=tuple(reasons),
        )

    def discover_from_graph(self, graph: KnowledgeGraph, *, minimum_confidence: float = 0.35) -> list[RelatedCaseLink]:
        """Build case profiles from shared node/edge provenance in a graph."""

        case_entities: dict[str, set[str]] = defaultdict(set)
        identifiers: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
        for node in graph.nodes():
            cases = graph.node_case_ids(node.node_id)
            for case_id in cases:
                case_entities[case_id].add(node.node_id)
                # Node types are useful candidate signals, but only exact node IDs
                # shared between cases affect comparison below.
                identifiers[case_id][node.node_type.casefold()].add(node.node_id)
        profiles = [
            CaseProfile(
                case_id=case_id,
                entity_ids=tuple(sorted(nodes)),
                identifiers={kind: tuple(sorted(values)) for kind, values in identifiers[case_id].items()},
            )
            for case_id, nodes in case_entities.items()
        ]
        return self.discover(profiles, minimum_confidence=minimum_confidence)

    @staticmethod
    def _shared_identifiers(left: CaseProfile, right: CaseProfile) -> dict[str, tuple[str, ...]]:
        shared: dict[str, tuple[str, ...]] = {}
        for kind in set(left.identifiers) & set(right.identifiers):
            left_values = left.identifiers[kind]
            right_values = right.identifiers[kind]
            if isinstance(left_values, str):
                left_values = (left_values,)
            if isinstance(right_values, str):
                right_values = (right_values,)
            overlap = {normalize_identifier(str(value)) for value in left_values} & {
                normalize_identifier(str(value)) for value in right_values
            }
            if overlap:
                shared[kind] = tuple(sorted(overlap))
        return shared
