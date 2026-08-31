"""Safe parsing, hashing and loose schema detection for supplied files.

The service never writes back to, alters, or reuses the original file bytes.
Storage adapters should persist the original bytes independently and can pass
them here for deterministic parsing.
"""

from __future__ import annotations

import csv
import io
import json
import re
from dataclasses import replace
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Mapping

from .models import (
    IngestionBatch,
    IngestionResult,
    IngestionStatus,
    ParsedDocument,
    ParsedRow,
    SourceType,
)


class IngestionError(ValueError):
    """Raised for a malformed or unsupported supplied source file."""


_COLUMN_ALIASES: dict[str, str] = {
    "mobile": "phone",
    "mobile_no": "phone",
    "mobile_number": "phone",
    "phone_number": "phone",
    "telephone": "phone",
    "caller": "caller_phone",
    "calling_number": "caller_phone",
    "a_party": "caller_phone",
    "callee": "callee_phone",
    "called": "callee_phone",
    "called_party": "callee_phone",
    "called_number": "callee_phone",
    "b_party": "callee_phone",
    "imei_no": "imei",
    "device_id": "imei",
    "account_no": "account_number",
    "acct_no": "account_number",
    "a_c_no": "account_number",
    "upi_id": "upi",
    "transaction_id": "transaction_reference",
    "txn_id": "transaction_reference",
    "amount_inr": "amount",
    "vehicle_no": "vehicle_registration",
    "vehicle_number": "vehicle_registration",
    "fir_no": "fir_number",
    "case_no": "case_reference",
    "date_time": "timestamp",
    "event_time": "timestamp",
    "timestamp_utc": "timestamp",
}


class IngestionService:
    """Parses CSV, JSON and text with deterministic record identifiers."""

    @staticmethod
    def file_hash(payload: bytes) -> str:
        return sha256(payload).hexdigest()

    @staticmethod
    def detect_source_type(filename: str, mime_type: str | None = None) -> SourceType:
        suffix = Path(filename).suffix.lower()
        by_suffix = {
            ".csv": SourceType.CSV,
            ".json": SourceType.JSON,
            ".txt": SourceType.TXT,
            ".pdf": SourceType.PDF,
            ".docx": SourceType.DOCX,
            ".xlsx": SourceType.XLSX,
            ".xls": SourceType.XLSX,
        }
        if suffix in by_suffix:
            return by_suffix[suffix]
        mime = (mime_type or "").lower()
        if "json" in mime:
            return SourceType.JSON
        if "csv" in mime:
            return SourceType.CSV
        if "text" in mime:
            return SourceType.TXT
        if "pdf" in mime:
            return SourceType.PDF
        return SourceType.UNKNOWN

    def ingest(
        self,
        *,
        filename: str,
        payload: bytes,
        case_id: str | None = None,
        uploaded_by: str | None = None,
        mime_type: str | None = None,
        source_type: SourceType | None = None,
    ) -> IngestionResult:
        """Build a parsed result without persisting or mutating source bytes."""

        kind = source_type or self.detect_source_type(filename, mime_type)
        batch = IngestionBatch.new(
            filename=filename,
            source_type=kind,
            sha256=self.file_hash(payload),
            byte_count=len(payload),
            mime_type=mime_type,
            case_id=case_id,
            uploaded_by=uploaded_by,
        )
        try:
            if kind is SourceType.CSV:
                rows, warnings = self._parse_csv(payload, batch.ingestion_id)
                return IngestionResult(
                    batch=replace(
                        batch,
                        status=IngestionStatus.PARSED,
                        row_count=len(rows),
                    ),
                    rows=tuple(rows),
                    warnings=tuple(warnings),
                )
            if kind is SourceType.JSON:
                rows, docs, warnings = self._parse_json(payload, batch.ingestion_id, filename)
                return IngestionResult(
                    batch=replace(
                        batch,
                        status=IngestionStatus.PARSED,
                        row_count=len(rows),
                        document_count=len(docs),
                    ),
                    rows=tuple(rows),
                    documents=tuple(docs),
                    warnings=tuple(warnings),
                )
            if kind in {SourceType.TXT, SourceType.PDF, SourceType.DOCX, SourceType.XLSX}:
                text = payload.decode("utf-8", errors="replace") if kind is SourceType.TXT else None
                doc = ParsedDocument(
                    source_record_id=f"{batch.ingestion_id}:document:1",
                    filename=filename,
                    source_type=kind,
                    payload=payload,
                    text=text,
                )
                return IngestionResult(
                    batch=replace(
                        batch,
                        status=IngestionStatus.PARSED,
                        document_count=1,
                    ),
                    documents=(doc,),
                )
            raise IngestionError(
                "Unable to determine input type. Supply a supported extension or MIME type."
            )
        except (UnicodeDecodeError, csv.Error, json.JSONDecodeError, IngestionError) as exc:
            return IngestionResult(
                batch=replace(batch, status=IngestionStatus.FAILED),
                warnings=(str(exc),),
            )

    def normalize_row(self, raw: Mapping[str, Any]) -> dict[str, Any]:
        """Normalise key names but preserve values and the raw mapping separately."""

        normalized: dict[str, Any] = {}
        for key, value in raw.items():
            clean_key = re.sub(r"[^a-z0-9]+", "_", str(key).strip().lower()).strip("_")
            clean_key = _COLUMN_ALIASES.get(clean_key, clean_key)
            normalized[clean_key] = value.strip() if isinstance(value, str) else value
        return normalized

    @staticmethod
    def detect_record_kind(row: Mapping[str, Any]) -> str:
        fields = set(row)
        if {"caller_phone", "callee_phone"} <= fields:
            return "CALL_DETAIL_RECORD"
        if "transaction_reference" in fields or (
            "amount" in fields
            and ({"from_account", "to_account"} <= fields or {"sender", "receiver"} <= fields)
        ):
            return "TRANSACTION"
        if "vehicle_registration" in fields:
            return "VEHICLE_RECORD"
        if "fir_number" in fields or "case_reference" in fields:
            return "CASE_RECORD"
        if {"latitude", "longitude"} <= fields:
            return "LOCATION_EVENT"
        return "GENERIC_RECORD"

    def _row(
        self,
        raw: Mapping[str, Any],
        row_number: int,
        ingestion_id: str,
    ) -> ParsedRow:
        raw_copy = dict(raw)
        normalized = self.normalize_row(raw_copy)
        row_fingerprint = json.dumps(raw_copy, default=str, sort_keys=True, ensure_ascii=False)
        record_id = sha256(
            f"{ingestion_id}|{row_number}|{row_fingerprint}".encode("utf-8")
        ).hexdigest()[:20]
        return ParsedRow(
            source_row_number=row_number,
            source_record_id=f"src_{record_id}",
            record_kind=self.detect_record_kind(normalized),
            raw=raw_copy,
            normalized=normalized,
        )

    def _parse_csv(self, payload: bytes, ingestion_id: str) -> tuple[list[ParsedRow], list[str]]:
        text = payload.decode("utf-8-sig")
        sample = text[:4096]
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(io.StringIO(text), dialect=dialect)
        if not reader.fieldnames:
            raise IngestionError("CSV has no header row")
        rows: list[ParsedRow] = []
        warnings: list[str] = []
        for row_number, raw in enumerate(reader, start=2):
            if not raw or not any(value not in (None, "") for value in raw.values()):
                continue
            if None in raw:
                warnings.append(f"CSV row {row_number} has more values than headers")
            rows.append(self._row({key: value for key, value in raw.items() if key is not None}, row_number, ingestion_id))
        return rows, warnings

    def _parse_json(
        self,
        payload: bytes,
        ingestion_id: str,
        filename: str,
    ) -> tuple[list[ParsedRow], list[ParsedDocument], list[str]]:
        value = json.loads(payload.decode("utf-8-sig"))
        rows: list[ParsedRow] = []
        docs: list[ParsedDocument] = []
        warnings: list[str] = []
        if isinstance(value, list):
            values: Iterable[Any] = value
        elif isinstance(value, dict) and isinstance(value.get("records"), list):
            values = value["records"]
        elif isinstance(value, dict):
            values = [value]
        else:
            raise IngestionError("JSON must be an object, a record list, or contain a records list")
        for number, item in enumerate(values, start=1):
            if isinstance(item, Mapping):
                rows.append(self._row(item, number, ingestion_id))
            elif isinstance(item, str):
                docs.append(
                    ParsedDocument(
                        source_record_id=f"{ingestion_id}:json-text:{number}",
                        filename=filename,
                        source_type=SourceType.JSON,
                        payload=item.encode("utf-8"),
                        text=item,
                    )
                )
            else:
                warnings.append(f"JSON item {number} was skipped because it is not an object or text")
        return rows, docs, warnings
