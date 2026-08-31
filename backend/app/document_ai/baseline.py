"""Deterministic, explainable NER and relation extraction baselines.

These rules intentionally favour precision over aggressive guessing.  They are
always available when an optional trained model is unavailable, and expose the
same output shape as model-registry adapters.
"""

from __future__ import annotations

import ipaddress
import re
from dataclasses import replace
from typing import Iterable, Sequence

from .types import ExtractedEntity, ExtractedRelation


BASELINE_NER_MODEL_ID = "sutra_deterministic_ner"
BASELINE_RELATION_MODEL_ID = "sutra_deterministic_relations"
BASELINE_VERSION = "1.0.0"


class DeterministicNER:
    """Rule baseline for high-confidence Indian investigation identifiers."""

    model_id = BASELINE_NER_MODEL_ID
    model_version = BASELINE_VERSION

    _patterns: tuple[tuple[str, re.Pattern[str], float], ...] = (
        (
            "UPI",
            re.compile(
                r"(?<![\w.@])[A-Za-z0-9._-]{2,80}@[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?=$|[\s,;:!?]|\.(?=$|\s))"
            ),
            0.99,
        ),
        (
            "EMAIL",
            re.compile(
                r"(?<![\w.@])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?=$|[\s,;:!?]|\.(?=$|\s))"
            ),
            0.99,
        ),
        (
            "PHONE",
            re.compile(r"(?<!\d)(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)"),
            0.98,
        ),
        (
            "IMEI",
            re.compile(r"(?i)(?:imei\s*(?:no\.?|number)?\s*[:#-]?\s*)(\d{15})(?!\d)"),
            0.99,
        ),
        (
            "BANK_ACCOUNT",
            re.compile(
                r"(?i)(?:a/c|acct(?:ount)?(?:\s*(?:no\.?|number))?|bank\s+account)\s*[:#-]?\s*(\d{9,18})(?!\d)"
            ),
            0.97,
        ),
        (
            "VEHICLE",
            re.compile(r"(?i)\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}\b"),
            0.96,
        ),
        (
            "IP_ADDRESS",
            re.compile(r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])"),
            0.96,
        ),
        (
            "DATE",
            re.compile(r"\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b"),
            0.95,
        ),
        (
            "DOMAIN",
            re.compile(r"(?<![@\w.-])(?:[A-Za-z0-9-]+\.)+(?:com|in|org|net|gov|edu|co|io)(?![\w.-])", re.I),
            0.93,
        ),
        (
            "PERSON",
            re.compile(
                r"\b(?i:mr\.?|mrs\.?|ms\.?|shri|smt\.?|dr\.?|accused|suspect|complainant|victim|person\s+named)\s+"
                r"([A-Z][A-Za-z'’-]{1,}(?:\s+[A-Z][A-Za-z'’-]{1,}){1,3})"
            ),
            0.79,
        ),
        (
            "ORGANISATION",
            re.compile(
                r"\b[A-Z][A-Za-z&.'-]*(?:\s+[A-Z][A-Za-z&.'-]*){0,4}\s+"
                r"(?:Bank|Limited|Ltd\.?|LLP|Corporation|Corp\.?|Company|Co\.?|Foundation)\b"
            ),
            0.82,
        ),
        (
            "LOCATION",
            re.compile(r"(?i)\b(?:at|in|from|near)\s+([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,3})"),
            0.62,
        ),
    )

    def predict(self, text: str) -> dict[str, list[dict[str, object]]]:
        return {"entities": [entity.to_dict() for entity in self.extract(text)]}

    def predict_batch(self, texts: Sequence[str]) -> list[dict[str, list[dict[str, object]]]]:
        return [self.predict(text) for text in texts]

    def extract(self, text: str) -> list[ExtractedEntity]:
        candidates: list[ExtractedEntity] = []
        for entity_type, pattern, confidence in self._patterns:
            for match in pattern.finditer(text):
                start, end = match.span(1) if match.lastindex else match.span()
                value = text[start:end].strip()
                # IP regex permits octets above 255; reject these false positives.
                if entity_type == "IP_ADDRESS":
                    try:
                        ipaddress.ip_address(value)
                    except ValueError:
                        continue
                # UPI pattern will also match ordinary email addresses.  Keep an
                # explicitly recognized e-mail as EMAIL, not a UPI handle.
                if entity_type == "UPI" and "." in value.split("@", 1)[1]:
                    continue
                candidates.append(
                    ExtractedEntity(
                        text=value,
                        type=entity_type,
                        start=start,
                        end=end,
                        confidence=confidence,
                        model_id=self.model_id,
                        model_version=self.model_version,
                    )
                )
        return self._deduplicate(candidates)

    @staticmethod
    def _deduplicate(candidates: Iterable[ExtractedEntity]) -> list[ExtractedEntity]:
        """Remove exact repeats and prefer more specific overlapping types."""

        priority = {
            "IMEI": 10,
            "BANK_ACCOUNT": 10,
            "UPI": 9,
            "EMAIL": 9,
            "PHONE": 8,
            "VEHICLE": 8,
            "IP_ADDRESS": 8,
            "ORGANISATION": 7,
            "PERSON": 7,
            "LOCATION": 4,
            "DATE": 2,
            "DOMAIN": 1,
        }
        ordered = sorted(
            candidates,
            key=lambda item: (item.start, -(item.end - item.start), -priority.get(item.type, 0)),
        )
        accepted: list[ExtractedEntity] = []
        seen: set[tuple[str, int, int]] = set()
        for candidate in ordered:
            key = (candidate.type, candidate.start, candidate.end)
            if key in seen:
                continue
            overlaps = [
                item
                for item in accepted
                if candidate.start < item.end and item.start < candidate.end
            ]
            # Preserve a clearly more specific embedded entity, e.g. UPI inside
            # a broad pattern, but avoid an extra DOMAIN inside an email/UPI.
            if any(priority.get(item.type, 0) >= priority.get(candidate.type, 0) for item in overlaps):
                continue
            accepted = [
                item
                for item in accepted
                if not (candidate.start < item.end and item.start < candidate.end)
            ]
            accepted.append(candidate)
            seen.add(key)
        return sorted(accepted, key=lambda item: (item.start, item.end, item.type))


class DeterministicRelationExtractor:
    """Sentence-local relation rules anchored to extracted entities.

    A rule only emits a relation if an entity exists on each side of its verb,
    which makes each output inspectable and avoids inventing entity names.
    """

    model_id = BASELINE_RELATION_MODEL_ID
    model_version = BASELINE_VERSION

    _rules: tuple[tuple[re.Pattern[str], str, float, bool], ...] = (
        (re.compile(r"\b(?:uses?|used|using)\b", re.I), "USES", 0.84, False),
        (re.compile(r"\b(?:owns?|owned|owner of)\b", re.I), "OWNS", 0.84, False),
        (re.compile(r"\b(?:registered to|registered under)\b", re.I), "REGISTERED_TO", 0.87, False),
        (re.compile(r"\b(?:called|contacted|spoke to)\b", re.I), "CONTACTED", 0.82, False),
        (re.compile(r"\b(?:transferred to|sent to|paid to|received from)\b", re.I), "TRANSFERRED_TO", 0.81, False),
        (re.compile(r"\b(?:located at|lives at|resides at|stayed at)\b", re.I), "LOCATED_AT", 0.80, False),
        (re.compile(r"\b(?:employed by|works for)\b", re.I), "EMPLOYED_BY", 0.81, False),
        (re.compile(r"\b(?:member of|belongs to)\b", re.I), "MEMBER_OF", 0.79, False),
        (re.compile(r"\b(?:associated with|linked to|connected to)\b", re.I), "ASSOCIATED_WITH", 0.70, False),
    )

    def predict(
        self,
        text: str,
        entities: Sequence[ExtractedEntity] | None = None,
    ) -> dict[str, list[dict[str, object]]]:
        return {"relations": [relation.to_dict() for relation in self.extract(text, entities or [])]}

    def extract(
        self,
        text: str,
        entities: Sequence[ExtractedEntity],
    ) -> list[ExtractedRelation]:
        relations: list[ExtractedRelation] = []
        seen: set[tuple[str, str, str, int]] = set()
        for sentence_start, sentence_end in self._sentence_spans(text):
            sentence = text[sentence_start:sentence_end]
            local_entities = [
                entity
                for entity in entities
                if entity.start >= sentence_start and entity.end <= sentence_end
            ]
            if len(local_entities) < 2:
                continue
            for pattern, predicate, confidence, reverse in self._rules:
                for match in pattern.finditer(sentence):
                    absolute_start = sentence_start + match.start()
                    absolute_end = sentence_start + match.end()
                    before = [entity for entity in local_entities if entity.end <= absolute_start]
                    after = [entity for entity in local_entities if entity.start >= absolute_end]
                    if not before or not after:
                        continue
                    subject = max(before, key=lambda entity: entity.end)
                    object_ = min(after, key=lambda entity: entity.start)
                    if reverse:
                        subject, object_ = object_, subject
                    key = (subject.text.casefold(), predicate, object_.text.casefold(), sentence_start)
                    if key in seen:
                        continue
                    seen.add(key)
                    relations.append(
                        ExtractedRelation(
                            subject=subject.text,
                            predicate=predicate,
                            object=object_.text,
                            confidence=confidence,
                            evidence_text=sentence.strip(),
                            model_id=self.model_id,
                            model_version=self.model_version,
                            subject_type=subject.type,
                            object_type=object_.type,
                        )
                    )
        return relations

    @staticmethod
    def _sentence_spans(text: str) -> Iterable[tuple[int, int]]:
        start = 0
        for match in re.finditer(r"[.!?\n]+", text):
            if match.start() > start:
                yield start, match.start()
            start = match.end()
        if start < len(text):
            yield start, len(text)
