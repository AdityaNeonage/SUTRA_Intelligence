"""Transaction-network rules for explainable financial-pattern alerts."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Mapping, Sequence


def _parse_time(value: datetime | str | None) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


@dataclass(frozen=True, slots=True)
class Transaction:
    transaction_id: str
    source_id: str
    target_id: str
    amount: float
    timestamp: datetime | str | None = None
    case_id: str | None = None
    reference: str | None = None
    attributes: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.transaction_id or not self.source_id or not self.target_id:
            raise ValueError("A transaction needs id, source, and target")
        if self.amount < 0:
            raise ValueError("Transaction amount must not be negative")
        object.__setattr__(self, "timestamp", _parse_time(self.timestamp))


@dataclass(frozen=True, slots=True)
class FinancialAlert:
    pattern_name: str
    entity_ids: tuple[str, ...]
    transaction_ids: tuple[str, ...]
    confidence: float
    why_flagged: str
    interval_start: datetime | None = None
    interval_end: datetime | None = None
    case_ids: tuple[str, ...] = ()
    evidence_status: str = "INFERRED"


class FinancialAnalyticsService:
    """Runs deterministic, bounded transaction-network analysis."""

    def __init__(
        self,
        *,
        fan_threshold: int = 3,
        rapid_hours: int = 24,
        frequency_window_hours: int = 24,
        frequency_threshold: int = 5,
    ) -> None:
        self.fan_threshold = fan_threshold
        self.rapid_hours = rapid_hours
        self.frequency_window_hours = frequency_window_hours
        self.frequency_threshold = frequency_threshold

    def analyze(self, transactions: Sequence[Transaction]) -> list[FinancialAlert]:
        alerts = [
            *self.fan_in(transactions),
            *self.fan_out(transactions),
            *self.rapid_pass_through(transactions),
            *self.circular_flows(transactions),
            *self.repeated_counterparties(transactions),
            *self.high_frequency_transfers(transactions),
            *self.shared_beneficiaries(transactions),
            *self.long_chains(transactions),
        ]
        # A stable dedupe key makes repeat runs idempotent for the same evidence.
        unique: dict[tuple[str, tuple[str, ...], tuple[str, ...]], FinancialAlert] = {}
        for alert in alerts:
            key = (alert.pattern_name, alert.entity_ids, alert.transaction_ids)
            unique.setdefault(key, alert)
        return sorted(unique.values(), key=lambda item: (item.pattern_name, item.entity_ids, item.transaction_ids))

    def fan_in(self, transactions: Sequence[Transaction]) -> list[FinancialAlert]:
        incoming: dict[str, list[Transaction]] = defaultdict(list)
        for transaction in transactions:
            incoming[transaction.target_id].append(transaction)
        return [
            self._alert(
                "FAN_IN",
                (target,), entries,
                min(0.95, 0.55 + 0.08 * len({entry.source_id for entry in entries})),
                f"{len({entry.source_id for entry in entries})} distinct sources transferred to one beneficiary.",
            )
            for target, entries in incoming.items()
            if len({entry.source_id for entry in entries}) >= self.fan_threshold
        ]

    def fan_out(self, transactions: Sequence[Transaction]) -> list[FinancialAlert]:
        outgoing: dict[str, list[Transaction]] = defaultdict(list)
        for transaction in transactions:
            outgoing[transaction.source_id].append(transaction)
        return [
            self._alert(
                "FAN_OUT",
                (source,), entries,
                min(0.95, 0.55 + 0.08 * len({entry.target_id for entry in entries})),
                f"One source paid {len({entry.target_id for entry in entries})} distinct beneficiaries.",
            )
            for source, entries in outgoing.items()
            if len({entry.target_id for entry in entries}) >= self.fan_threshold
        ]

    def rapid_pass_through(self, transactions: Sequence[Transaction]) -> list[FinancialAlert]:
        incoming: dict[str, list[Transaction]] = defaultdict(list)
        outgoing: dict[str, list[Transaction]] = defaultdict(list)
        for transaction in transactions:
            incoming[transaction.target_id].append(transaction)
            outgoing[transaction.source_id].append(transaction)
        interval = timedelta(hours=self.rapid_hours)
        alerts: list[FinancialAlert] = []
        for intermediary in sorted(set(incoming) & set(outgoing)):
            for received in incoming[intermediary]:
                if received.timestamp is None:
                    continue
                for sent in outgoing[intermediary]:
                    if sent.timestamp is None or sent.timestamp < received.timestamp:
                        continue
                    if sent.timestamp - received.timestamp > interval:
                        continue
                    amount_ratio = min(received.amount, sent.amount) / max(received.amount, sent.amount, 1.0)
                    if amount_ratio < 0.65 or received.source_id == sent.target_id:
                        continue
                    alerts.append(
                        self._alert(
                            "RAPID_PASS_THROUGH",
                            (received.source_id, intermediary, sent.target_id),
                            (received, sent),
                            round(min(0.94, 0.62 + 0.25 * amount_ratio), 4),
                            f"Funds moved through {intermediary} within {sent.timestamp - received.timestamp}; amounts are materially similar.",
                        )
                    )
        return alerts

    def circular_flows(
        self,
        transactions: Sequence[Transaction],
        *,
        max_cycle_length: int = 5,
        max_cycles: int = 250,
    ) -> list[FinancialAlert]:
        adjacency: dict[str, list[Transaction]] = defaultdict(list)
        for transaction in transactions:
            adjacency[transaction.source_id].append(transaction)
        alerts: list[FinancialAlert] = []
        seen: set[tuple[str, ...]] = set()

        def dfs(start: str, current: str, path: list[Transaction], visited: set[str]) -> None:
            if len(alerts) >= max_cycles or len(path) >= max_cycle_length:
                return
            for transaction in adjacency.get(current, []):
                if transaction.target_id == start and len(path) >= 2:
                    cycle = path + [transaction]
                    entities = tuple(item.source_id for item in cycle)
                    canonical = self._canonical_cycle(entities)
                    if canonical not in seen:
                        seen.add(canonical)
                        alerts.append(
                            self._alert(
                                "CIRCULAR_FLOW",
                                canonical,
                                cycle,
                                min(0.95, 0.60 + 0.07 * len(cycle)),
                                f"Directed transfers form a closed cycle of {len(cycle)} accounts.",
                            )
                        )
                elif transaction.target_id not in visited:
                    dfs(start, transaction.target_id, path + [transaction], visited | {transaction.target_id})

        for start in sorted(adjacency):
            dfs(start, start, [], {start})
        return alerts

    def repeated_counterparties(self, transactions: Sequence[Transaction], *, threshold: int = 3) -> list[FinancialAlert]:
        pairs: dict[tuple[str, str], list[Transaction]] = defaultdict(list)
        for transaction in transactions:
            pairs[(transaction.source_id, transaction.target_id)].append(transaction)
        return [
            self._alert(
                "REPEATED_COUNTERPARTY",
                pair,
                entries,
                min(0.9, 0.50 + 0.08 * len(entries)),
                f"The same directed counterparty pair appears in {len(entries)} supplied transactions.",
            )
            for pair, entries in pairs.items()
            if len(entries) >= threshold
        ]

    def high_frequency_transfers(self, transactions: Sequence[Transaction]) -> list[FinancialAlert]:
        by_source: dict[str, list[Transaction]] = defaultdict(list)
        for transaction in transactions:
            if transaction.timestamp is not None:
                by_source[transaction.source_id].append(transaction)
        alerts: list[FinancialAlert] = []
        window = timedelta(hours=self.frequency_window_hours)
        for source, entries in by_source.items():
            ordered = sorted(entries, key=lambda item: item.timestamp or datetime.min.replace(tzinfo=timezone.utc))
            start = 0
            for end, item in enumerate(ordered):
                assert item.timestamp is not None
                while ordered[start].timestamp and item.timestamp - ordered[start].timestamp > window:
                    start += 1
                group = ordered[start : end + 1]
                if len(group) >= self.frequency_threshold:
                    alerts.append(
                        self._alert(
                            "HIGH_FREQUENCY_TRANSFERS",
                            (source,),
                            group,
                            min(0.92, 0.48 + 0.06 * len(group)),
                            f"{len(group)} outgoing transfers occurred within {self.frequency_window_hours} hours.",
                        )
                    )
                    break
        return alerts

    def shared_beneficiaries(self, transactions: Sequence[Transaction]) -> list[FinancialAlert]:
        """Express fan-in as the investigator-facing shared-beneficiary pattern."""

        return [
            replace(
                alert,
                pattern_name="SHARED_BENEFICIARY",
                why_flagged=alert.why_flagged.replace("one beneficiary", "a shared beneficiary"),
            )
            for alert in self.fan_in(transactions)
        ]

    def long_chains(
        self,
        transactions: Sequence[Transaction],
        *,
        minimum_hops: int = 3,
        max_hops: int = 5,
        max_alerts: int = 250,
    ) -> list[FinancialAlert]:
        adjacency: dict[str, list[Transaction]] = defaultdict(list)
        for transaction in transactions:
            adjacency[transaction.source_id].append(transaction)
        alerts: list[FinancialAlert] = []
        seen: set[tuple[str, ...]] = set()

        def walk(path: list[Transaction], visited: set[str]) -> None:
            if len(alerts) >= max_alerts:
                return
            if len(path) >= minimum_hops:
                ids = tuple(item.transaction_id for item in path)
                if ids not in seen:
                    seen.add(ids)
                    entity_ids = tuple([path[0].source_id] + [item.target_id for item in path])
                    alerts.append(
                        self._alert(
                            "LONG_TRANSFER_CHAIN",
                            entity_ids,
                            path,
                            min(0.85, 0.45 + 0.08 * len(path)),
                            f"Observed a directed transfer chain spanning {len(path)} hops.",
                        )
                    )
            if len(path) >= max_hops:
                return
            for next_transaction in adjacency.get(path[-1].target_id if path else "", []):
                if next_transaction.target_id not in visited:
                    walk(path + [next_transaction], visited | {next_transaction.target_id})

        for transaction in transactions:
            walk([transaction], {transaction.source_id, transaction.target_id})
        return alerts

    @staticmethod
    def _canonical_cycle(nodes: tuple[str, ...]) -> tuple[str, ...]:
        rotations = [nodes[index:] + nodes[:index] for index in range(len(nodes))]
        return min(rotations)

    @staticmethod
    def _alert(
        pattern: str,
        entities: Sequence[str],
        transactions: Sequence[Transaction],
        confidence: float,
        explanation: str,
    ) -> FinancialAlert:
        items = tuple(transactions)
        times = [item.timestamp for item in items if item.timestamp is not None]
        return FinancialAlert(
            pattern_name=pattern,
            entity_ids=tuple(entities),
            transaction_ids=tuple(item.transaction_id for item in items),
            confidence=round(confidence, 4),
            why_flagged=explanation,
            interval_start=min(times) if times else None,
            interval_end=max(times) if times else None,
            case_ids=tuple(sorted({item.case_id for item in items if item.case_id})),
        )
