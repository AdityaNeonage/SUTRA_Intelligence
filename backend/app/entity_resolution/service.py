"""Conservative deterministic entity resolution.

Names alone never produce automatic merging.  Each result exposes all signals,
contradictions and thresholding logic so an investigator can review it.
"""

from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from dataclasses import replace
from difflib import SequenceMatcher
from itertools import combinations
from typing import Any, Iterable, Mapping, Sequence

from .models import (
    CandidatePair,
    EntityRecord,
    MatchFeature,
    ResolutionDecision,
    ResolutionStatus,
)


_IDENTIFIER_FIELDS: dict[str, tuple[str, ...]] = {
    "phone": ("phone", "phones", "mobile", "mobile_number", "phone_number"),
    "email": ("email", "emails"),
    "account": ("account", "accounts", "account_number", "bank_account"),
    "upi": ("upi", "upi_id", "upi_ids"),
    "vehicle": ("vehicle", "vehicles", "vehicle_registration"),
    "device": ("device", "devices", "imei", "imeis"),
    "identifier": ("identifier", "identifiers", "id_number"),
}
_IDENTIFIER_STRENGTH = {
    "phone": 0.72,
    "email": 0.80,
    "account": 0.86,
    "upi": 0.86,
    "vehicle": 0.65,
    "device": 0.70,
    "identifier": 0.82,
}


def _as_values(value: Any) -> set[str]:
    if value is None:
        return set()
    if isinstance(value, (list, tuple, set, frozenset)):
        values = value
    else:
        values = [value]
    return {str(item) for item in values if item is not None and str(item).strip()}


def normalize_identifier(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKC", value).casefold())


def normalize_name(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value)
    without_marks = "".join(char for char in folded if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", without_marks.casefold())).strip()


def name_similarity(left: str, right: str) -> float:
    """Token-aware similarity, with RapidFuzz when the optional package exists."""

    left_normalized, right_normalized = normalize_name(left), normalize_name(right)
    if not left_normalized or not right_normalized:
        return 0.0
    try:
        from rapidfuzz.fuzz import token_set_ratio  # type: ignore[import-not-found]

        return float(token_set_ratio(left_normalized, right_normalized)) / 100.0
    except ImportError:
        left_tokens, right_tokens = set(left_normalized.split()), set(right_normalized.split())
        token_score = len(left_tokens & right_tokens) / len(left_tokens | right_tokens)
        char_score = SequenceMatcher(None, left_normalized, right_normalized).ratio()
        return round(max(token_score, char_score), 4)


class EntityResolutionService:
    """Generate candidates and score them using independent evidence signals."""

    def __init__(
        self,
        *,
        auto_match_threshold: float = 0.88,
        possible_match_threshold: float = 0.55,
    ) -> None:
        self.auto_match_threshold = auto_match_threshold
        self.possible_match_threshold = possible_match_threshold

    def generate_candidates(self, records: Sequence[EntityRecord]) -> list[CandidatePair]:
        """Block candidates by shared identifiers, aliases, or compatible names.

        Blocking avoids O(n²) comparisons for typical source imports while still
        admitting near-duplicate names for investigator review.
        """

        buckets: dict[tuple[str, str], list[tuple[str, str]]] = defaultdict(list)
        by_id = {record.record_id: record for record in records}
        for record in records:
            for kind, values in self._identifiers(record).items():
                for value in values:
                    buckets[(kind, value)].append((record.record_id, f"shared_{kind}"))
            for value in self._names(record):
                tokens = normalize_name(value).split()
                if tokens:
                    # Initial + surname is intentionally only a candidate block,
                    # never evidence adequate for automatic resolution.
                    buckets[("name", f"{tokens[0][0]}:{tokens[-1]}")].append(
                        (record.record_id, "similar_name_block")
                    )
        reasons: dict[tuple[str, str], set[str]] = defaultdict(set)
        for entries in buckets.values():
            for (left, reason_left), (right, reason_right) in combinations(entries, 2):
                if left == right or by_id[left].entity_type != by_id[right].entity_type:
                    continue
                key = tuple(sorted((left, right)))
                reasons[key].update((reason_left, reason_right))
        return [
            CandidatePair(left_id=left, right_id=right, blocking_reasons=tuple(sorted(reason)))
            for (left, right), reason in sorted(reasons.items())
        ]

    def resolve_pair(self, left: EntityRecord, right: EntityRecord) -> ResolutionDecision:
        if left.record_id == right.record_id:
            raise ValueError("Cannot resolve a record against itself")
        features: list[MatchFeature] = []
        reasons: list[str] = []
        if left.entity_type != right.entity_type:
            return ResolutionDecision(
                left_id=left.record_id,
                right_id=right.record_id,
                status=ResolutionStatus.NOT_MATCH,
                match_confidence=0.0,
                features=(
                    MatchFeature(
                        name="entity_type",
                        value=False,
                        weight=1.0,
                        contribution=-1.0,
                        explanation=f"Type mismatch: {left.entity_type} vs {right.entity_type}",
                    ),
                ),
                auto_match_eligible=False,
                reasons=("Different canonical entity types are not merged.",),
            )

        strong_matches = 0
        support_for_strong_identifier = False
        score = 0.0
        for kind, strength in _IDENTIFIER_STRENGTH.items():
            overlap = self._identifiers(left)[kind] & self._identifiers(right)[kind]
            if overlap:
                strong_matches += 1
                score += strength
                features.append(
                    MatchFeature(
                        name=f"same_{kind}",
                        value=True,
                        weight=strength,
                        contribution=strength,
                        explanation=f"Exact shared {kind}: {', '.join(sorted(overlap))}",
                    )
                )
            elif self._identifiers(left)[kind] and self._identifiers(right)[kind]:
                features.append(
                    MatchFeature(
                        name=f"same_{kind}",
                        value=False,
                        weight=strength,
                        contribution=0.0,
                        explanation=f"Both records supply different {kind} values.",
                    )
                )

        names_left, names_right = self._names(left), self._names(right)
        best_name = max(
            (name_similarity(a, b) for a in names_left for b in names_right),
            default=0.0,
        )
        if best_name:
            contribution = 0.14 * best_name
            score += contribution
            features.append(
                MatchFeature(
                    name="name_similarity",
                    value=round(best_name, 4),
                    weight=0.14,
                    contribution=round(contribution, 4),
                    explanation="Token-aware normalized name similarity.",
                )
            )
            if best_name >= 0.75:
                support_for_strong_identifier = True

        alias_score = self._best_overlap_similarity(self._aliases(left), self._aliases(right))
        if alias_score:
            contribution = 0.10 * alias_score
            score += contribution
            features.append(
                MatchFeature(
                    name="alias_similarity",
                    value=round(alias_score, 4),
                    weight=0.10,
                    contribution=round(contribution, 4),
                    explanation="Aliases were normalized before comparison.",
                )
            )
            if alias_score >= 0.80:
                support_for_strong_identifier = True

        dob_left, dob_right = self._single_value(left, "date_of_birth", "dob"), self._single_value(right, "date_of_birth", "dob")
        contradiction = False
        if dob_left and dob_right:
            if normalize_identifier(dob_left) == normalize_identifier(dob_right):
                score += 0.12
                support_for_strong_identifier = True
                features.append(
                    MatchFeature("same_dob", True, 0.12, 0.12, "Exact supplied date of birth."))
            else:
                contradiction = True
                score -= 0.30
                features.append(
                    MatchFeature("same_dob", False, 0.30, -0.30, "Conflicting supplied dates of birth."))

        address_score = self._best_overlap_similarity(self._values(left, "address", "addresses"), self._values(right, "address", "addresses"))
        if address_score:
            contribution = 0.10 * address_score
            score += contribution
            features.append(
                MatchFeature("address_similarity", round(address_score, 4), 0.10, round(contribution, 4), "Normalized address similarity."))
            if address_score >= 0.85:
                support_for_strong_identifier = True

        relative_score = self._best_overlap_similarity(self._values(left, "relative_name", "relative_names", "relatives"), self._values(right, "relative_name", "relative_names", "relatives"))
        if relative_score:
            contribution = 0.05 * relative_score
            score += contribution
            features.append(
                MatchFeature("relative_similarity", round(relative_score, 4), 0.05, round(contribution, 4), "Normalized relative-name similarity."))

        if self._contradictory_gender(left, right):
            contradiction = True
            score -= 0.10
            features.append(MatchFeature("gender_consistency", False, 0.10, -0.10, "Conflicting supplied gender values."))

        confidence = round(max(0.0, min(1.0, score)), 4)
        auto_eligible = (
            not contradiction
            and confidence >= self.auto_match_threshold
            and (strong_matches >= 2 or (strong_matches >= 1 and support_for_strong_identifier))
        )
        if auto_eligible:
            status = ResolutionStatus.AUTO_MATCHED
            reasons.append("High confidence with independent identifier evidence and corroboration.")
        elif confidence >= self.possible_match_threshold:
            status = ResolutionStatus.POSSIBLE_MATCH
            if strong_matches == 0:
                reasons.append("Fuzzy attributes can only create a review candidate, never an automatic merge.")
            else:
                reasons.append("Identifier evidence needs investigator confirmation or more corroboration.")
        else:
            status = ResolutionStatus.NOT_MATCH
            reasons.append("Insufficient corroborating evidence for a match.")
        if contradiction:
            reasons.append("Conflicting supplied attributes reduced confidence.")
        return ResolutionDecision(
            left_id=left.record_id,
            right_id=right.record_id,
            status=status,
            match_confidence=confidence,
            features=tuple(features),
            auto_match_eligible=auto_eligible,
            reasons=tuple(reasons),
        )

    def resolve(self, records: Sequence[EntityRecord]) -> list[ResolutionDecision]:
        by_id = {record.record_id: record for record in records}
        return [
            self.resolve_pair(by_id[candidate.left_id], by_id[candidate.right_id])
            for candidate in self.generate_candidates(records)
        ]

    @staticmethod
    def apply_manual_review(
        decision: ResolutionDecision,
        *,
        confirmed: bool,
        reviewed_by: str,
        note: str | None = None,
    ) -> ResolutionDecision:
        return replace(
            decision,
            status=(ResolutionStatus.MANUALLY_CONFIRMED if confirmed else ResolutionStatus.MANUALLY_REJECTED),
            auto_match_eligible=False,
            reviewed_by=reviewed_by,
            review_note=note,
            reasons=decision.reasons + (("Investigator confirmed match." if confirmed else "Investigator rejected match."),),
        )

    @staticmethod
    def auto_match_groups(decisions: Iterable[ResolutionDecision]) -> list[set[str]]:
        """Return only safe auto-match clusters; review candidates are excluded."""

        parent: dict[str, str] = {}

        def find(node: str) -> str:
            parent.setdefault(node, node)
            if parent[node] != node:
                parent[node] = find(parent[node])
            return parent[node]

        def union(left: str, right: str) -> None:
            root_left, root_right = find(left), find(right)
            if root_left != root_right:
                parent[root_right] = root_left

        for decision in decisions:
            if decision.status in {ResolutionStatus.AUTO_MATCHED, ResolutionStatus.MANUALLY_CONFIRMED}:
                union(decision.left_id, decision.right_id)
        groups: dict[str, set[str]] = defaultdict(set)
        for node in parent:
            groups[find(node)].add(node)
        return [group for group in groups.values() if len(group) > 1]

    @staticmethod
    def _values(record: EntityRecord, *keys: str) -> set[str]:
        output: set[str] = set()
        for key in keys:
            output.update(_as_values(record.attributes.get(key)))
        return output

    def _identifiers(self, record: EntityRecord) -> dict[str, set[str]]:
        return {
            kind: {normalize_identifier(value) for value in self._values(record, *keys)}
            for kind, keys in _IDENTIFIER_FIELDS.items()
        }

    def _names(self, record: EntityRecord) -> set[str]:
        return self._values(record, "name", "full_name", "legal_name") | self._aliases(record)

    def _aliases(self, record: EntityRecord) -> set[str]:
        return self._values(record, "alias", "aliases", "known_as")

    @staticmethod
    def _single_value(record: EntityRecord, *keys: str) -> str | None:
        values = EntityResolutionService._values(record, *keys)
        return sorted(values)[0] if values else None

    @staticmethod
    def _best_overlap_similarity(left: set[str], right: set[str]) -> float:
        return max((name_similarity(a, b) for a in left for b in right), default=0.0)

    @staticmethod
    def _contradictory_gender(left: EntityRecord, right: EntityRecord) -> bool:
        left_gender = EntityResolutionService._single_value(left, "gender")
        right_gender = EntityResolutionService._single_value(right, "gender")
        if not left_gender or not right_gender:
            return False
        return normalize_name(left_gender) != normalize_name(right_gender)
