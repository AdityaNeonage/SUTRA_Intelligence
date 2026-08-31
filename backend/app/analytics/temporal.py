"""Evidence-aware temporal aggregation and change-friendly event summaries."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping


def _time(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


@dataclass(frozen=True, slots=True)
class TimelineBucket:
    bucket_start: datetime
    bucket_end: datetime
    event_count: int
    event_types: Mapping[str, int]
    case_ids: tuple[str, ...]
    entity_ids: tuple[str, ...]


class TemporalAnalyticsService:
    """Groups supplied events; it never fabricates timestamps for missing data."""

    def timeline(
        self,
        events: Iterable[Mapping[str, Any]],
        *,
        granularity: str = "day",
    ) -> list[TimelineBucket]:
        if granularity not in {"hour", "day", "month"}:
            raise ValueError("granularity must be hour, day, or month")
        grouped: dict[datetime, list[Mapping[str, Any]]] = defaultdict(list)
        for event in events:
            raw = event.get("timestamp") or event.get("occurred_at") or event.get("time")
            if raw is None:
                continue
            timestamp = _time(raw)
            key = self._bucket_start(timestamp, granularity)
            grouped[key].append(event)
        buckets: list[TimelineBucket] = []
        for start, entries in sorted(grouped.items()):
            types = Counter(str(item.get("event_type") or item.get("type") or "UNKNOWN") for item in entries)
            case_ids = {str(item["case_id"]) for item in entries if item.get("case_id")}
            entity_ids: set[str] = set()
            for item in entries:
                raw_entities = item.get("entity_ids") or item.get("entities") or ()
                if isinstance(raw_entities, str):
                    raw_entities = (raw_entities,)
                entity_ids.update(str(value) for value in raw_entities)
            buckets.append(
                TimelineBucket(
                    bucket_start=start,
                    bucket_end=self._next_bucket(start, granularity),
                    event_count=len(entries),
                    event_types=dict(sorted(types.items())),
                    case_ids=tuple(sorted(case_ids)),
                    entity_ids=tuple(sorted(entity_ids)),
                )
            )
        return buckets

    @staticmethod
    def _bucket_start(timestamp: datetime, granularity: str) -> datetime:
        if granularity == "hour":
            return timestamp.replace(minute=0, second=0, microsecond=0)
        if granularity == "day":
            return timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
        return timestamp.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def _next_bucket(timestamp: datetime, granularity: str) -> datetime:
        if granularity == "hour":
            from datetime import timedelta

            return timestamp + timedelta(hours=1)
        if granularity == "day":
            from datetime import timedelta

            return timestamp + timedelta(days=1)
        year, month = timestamp.year, timestamp.month
        return timestamp.replace(year=year + 1, month=1) if month == 12 else timestamp.replace(month=month + 1)
