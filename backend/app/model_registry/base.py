"""Stable model-adapter contract used by all pipeline services."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Mapping, Sequence


class ModelTask(str, Enum):
    NER = "ner"
    RELATION_EXTRACTION = "relation_extraction"
    ENTITY_EMBEDDING = "entity_embedding"
    TEXT_EMBEDDING = "text_embedding"
    CASE_SIMILARITY = "case_similarity"
    LLM = "llm"
    TRANSLATION = "translation"
    OCR = "ocr"
    ANOMALY = "anomaly"


class ModelAdapterError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ModelManifest:
    model_id: str
    name: str
    version: str
    task: ModelTask
    framework: str
    entrypoint: str
    languages: tuple[str, ...]
    input_schema: str
    output_schema: str
    priority: int = 0
    source: str | None = None
    license: str | None = None
    entities: tuple[str, ...] = ()
    metrics_file: str | None = None
    extra: Mapping[str, Any] = field(default_factory=dict)

    @classmethod
    def from_mapping(cls, raw: Mapping[str, Any]) -> "ModelManifest":
        required = ("id", "name", "version", "task", "framework", "entrypoint", "languages", "input_schema", "output_schema")
        missing = [field for field in required if raw.get(field) in (None, "", [])]
        if missing:
            raise ValueError(f"Model manifest is missing required field(s): {', '.join(missing)}")
        try:
            task = ModelTask(str(raw["task"]).casefold())
        except ValueError as exc:
            allowed = ", ".join(item.value for item in ModelTask)
            raise ValueError(f"Unsupported model task '{raw['task']}', expected one of: {allowed}") from exc
        languages = raw["languages"]
        if isinstance(languages, str):
            languages = [languages]
        if not isinstance(languages, Sequence):
            raise ValueError("manifest languages must be a list of language codes")
        known = {
            "id", "name", "version", "task", "framework", "entrypoint", "languages", "input_schema",
            "output_schema", "priority", "source", "license", "entities", "metrics_file",
        }
        entities = raw.get("entities") or ()
        if isinstance(entities, str):
            entities = (entities,)
        return cls(
            model_id=str(raw["id"]), name=str(raw["name"]), version=str(raw["version"]), task=task,
            framework=str(raw["framework"]).casefold(), entrypoint=str(raw["entrypoint"]),
            languages=tuple(str(value) for value in languages), input_schema=str(raw["input_schema"]),
            output_schema=str(raw["output_schema"]), priority=int(raw.get("priority", 0)),
            source=str(raw["source"]) if raw.get("source") else None,
            license=str(raw["license"]) if raw.get("license") else None,
            entities=tuple(str(value) for value in entities), metrics_file=str(raw["metrics_file"]) if raw.get("metrics_file") else None,
            extra={key: value for key, value in raw.items() if key not in known},
        )


@dataclass(frozen=True, slots=True)
class ModelMetadata:
    model_id: str
    name: str
    task: ModelTask
    version: str
    framework: str
    languages: tuple[str, ...]
    input_schema: str
    output_schema: str
    priority: int = 0
    source: str | None = None
    path: str | None = None
    checksum: str | None = None
    metrics: Mapping[str, Any] = field(default_factory=dict)
    registered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True, slots=True)
class ModelHealth:
    healthy: bool
    message: str
    details: Mapping[str, Any] = field(default_factory=dict)


class BaseModelAdapter(ABC):
    """Provider-independent model interface.

    Business services must depend on this contract, never a transformers,
    Ollama, spaCy, or Torch-specific API.
    """

    def __init__(self, manifest: ModelManifest, *, model_path: str | None = None) -> None:
        self.manifest = manifest
        self.model_path = model_path
        self._loaded = False

    @abstractmethod
    def load(self) -> None:
        """Load model state or validate a remote/local provider."""

    @abstractmethod
    def health_check(self) -> ModelHealth:
        """Return a structured health response without leaking a stack trace."""

    @abstractmethod
    def predict(self, input_data: Any) -> Mapping[str, Any]:
        """Produce the adapter's declared standardized output schema."""

    def predict_batch(self, inputs: Sequence[Any]) -> list[Mapping[str, Any]]:
        return [self.predict(item) for item in inputs]

    def metadata(self) -> ModelMetadata:
        return ModelMetadata(
            model_id=self.manifest.model_id,
            name=self.manifest.name,
            task=self.manifest.task,
            version=self.manifest.version,
            framework=self.manifest.framework,
            languages=self.manifest.languages,
            input_schema=self.manifest.input_schema,
            output_schema=self.manifest.output_schema,
            priority=self.manifest.priority,
            source=self.manifest.source,
            path=self.model_path,
        )

    def version(self) -> str:
        return self.manifest.version

    def supported_languages(self) -> tuple[str, ...]:
        return self.manifest.languages

    def output_schema(self) -> str:
        return self.manifest.output_schema

    def _require_loaded(self) -> None:
        if not self._loaded:
            raise ModelAdapterError(f"Model '{self.manifest.model_id}' is not loaded")


def validate_standard_output(task: ModelTask, output: Mapping[str, Any]) -> None:
    """Reject malformed model output before it reaches document/graph logic."""

    if task is ModelTask.NER:
        entities = output.get("entities")
        if not isinstance(entities, list):
            raise ModelAdapterError("NER output must contain an entities list")
        required = {"text", "type", "start", "end", "confidence", "model_id", "model_version"}
        for entity in entities:
            if not isinstance(entity, Mapping) or not required <= set(entity):
                raise ModelAdapterError("NER output contains an entity outside sutra-ner-v1")
    elif task is ModelTask.RELATION_EXTRACTION:
        relations = output.get("relations")
        if not isinstance(relations, list):
            raise ModelAdapterError("Relation output must contain a relations list")
        required = {"subject", "predicate", "object", "confidence", "evidence_text", "model_id", "model_version"}
        for relation in relations:
            if not isinstance(relation, Mapping) or not required <= set(relation):
                raise ModelAdapterError("Relation output contains a relation outside sutra-relation-v1")
