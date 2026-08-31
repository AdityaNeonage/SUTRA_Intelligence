"""Framework-neutral data transfer objects for evidence ingestion."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Mapping
from uuid import uuid4


class SourceType(str, Enum):
    CSV = "CSV"
    JSON = "JSON"
    TXT = "TXT"
    PDF = "PDF"
    DOCX = "DOCX"
    XLSX = "XLSX"
    UNKNOWN = "UNKNOWN"


class IngestionStatus(str, Enum):
    RECEIVED = "RECEIVED"
    PARSED = "PARSED"
    PARTIALLY_PARSED = "PARTIALLY_PARSED"
    FAILED = "FAILED"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True, slots=True)
class IngestionBatch:
    """Metadata that must be retained alongside an original evidence file."""

    ingestion_id: str
    filename: str
    source_type: SourceType
    sha256: str
    mime_type: str | None = None
    case_id: str | None = None
    uploaded_by: str | None = None
    received_at: datetime = field(default_factory=utc_now)
    status: IngestionStatus = IngestionStatus.RECEIVED
    byte_count: int = 0
    row_count: int = 0
    document_count: int = 0

    @classmethod
    def new(
        cls,
        *,
        filename: str,
        source_type: SourceType,
        sha256: str,
        byte_count: int,
        mime_type: str | None = None,
        case_id: str | None = None,
        uploaded_by: str | None = None,
    ) -> "IngestionBatch":
        return cls(
            ingestion_id=f"ing_{uuid4().hex}",
            filename=filename,
            source_type=source_type,
            sha256=sha256,
            mime_type=mime_type,
            case_id=case_id,
            uploaded_by=uploaded_by,
            byte_count=byte_count,
        )


@dataclass(frozen=True, slots=True)
class ParsedRow:
    """A processed copy of one structured source row; raw input is untouched."""

    source_row_number: int
    source_record_id: str
    record_kind: str
    raw: Mapping[str, Any]
    normalized: Mapping[str, Any]


@dataclass(frozen=True, slots=True)
class ParsedDocument:
    """A document payload handed to document intelligence."""

    source_record_id: str
    filename: str
    source_type: SourceType
    payload: bytes
    text: str | None = None


@dataclass(frozen=True, slots=True)
class IngestionResult:
    batch: IngestionBatch
    rows: tuple[ParsedRow, ...] = ()
    documents: tuple[ParsedDocument, ...] = ()
    warnings: tuple[str, ...] = ()

    @property
    def successful(self) -> bool:
        return self.batch.status in {
            IngestionStatus.PARSED,
            IngestionStatus.PARTIALLY_PARSED,
        }
