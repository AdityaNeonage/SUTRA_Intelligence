"""Non-destructive source-file parsing and lightweight schema mapping."""

from .models import (
    IngestionBatch,
    IngestionResult,
    IngestionStatus,
    ParsedDocument,
    ParsedRow,
    SourceType,
)
from .service import IngestionError, IngestionService

__all__ = [
    "IngestionBatch",
    "IngestionError",
    "IngestionResult",
    "IngestionService",
    "IngestionStatus",
    "ParsedDocument",
    "ParsedRow",
    "SourceType",
]
