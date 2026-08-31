"""Model metadata registry and validating bundle importer.

Persistence is optional: this module is deliberately usable before a database is
wired, while route/database layers can store the returned metadata and results.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any, Mapping, Sequence

from .adapters import AdapterFactory
from .base import (
    BaseModelAdapter,
    ModelAdapterError,
    ModelHealth,
    ModelManifest,
    ModelMetadata,
    ModelTask,
    validate_standard_output,
)


class ModelRegistrationError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class RegisteredModel:
    metadata: ModelMetadata
    active: bool
    health: ModelHealth


@dataclass(frozen=True, slots=True)
class BundleImportResult:
    accepted: bool
    bundle_path: str
    model_id: str | None = None
    checksum: str | None = None
    reason: str | None = None
    registered: RegisteredModel | None = None


class ModelRegistry:
    """In-memory registry with explicit per-task activation."""

    def __init__(self) -> None:
        self._adapters: dict[str, BaseModelAdapter] = {}
        self._records: dict[str, RegisteredModel] = {}
        self._active_by_task: dict[ModelTask, str] = {}

    def register(
        self,
        adapter: BaseModelAdapter,
        *,
        checksum: str | None = None,
        metrics: Mapping[str, Any] | None = None,
        activate: bool = False,
        sample_input: Any | None = None,
    ) -> RegisteredModel:
        try:
            adapter.load()
            health = adapter.health_check()
            if not health.healthy:
                raise ModelRegistrationError(health.message)
            if sample_input is not None:
                output = adapter.predict(sample_input)
                validate_standard_output(adapter.manifest.task, output)
        except (ModelAdapterError, OSError, ValueError) as exc:
            raise ModelRegistrationError(f"Model validation failed: {exc}") from exc
        metadata = replace(adapter.metadata(), checksum=checksum, metrics=dict(metrics or {}))
        record = RegisteredModel(metadata=metadata, active=False, health=health)
        self._adapters[metadata.model_id] = adapter
        self._records[metadata.model_id] = record
        if activate or metadata.task not in self._active_by_task:
            self.activate(metadata.model_id)
        return self._records[metadata.model_id]

    def activate(self, model_id: str) -> RegisteredModel:
        if model_id not in self._records:
            raise KeyError(f"Unknown model: {model_id}")
        record = self._records[model_id]
        task = record.metadata.task
        previous = self._active_by_task.get(task)
        if previous:
            self._records[previous] = replace(self._records[previous], active=False)
        self._active_by_task[task] = model_id
        self._records[model_id] = replace(record, active=True)
        return self._records[model_id]

    def deactivate(self, model_id: str) -> RegisteredModel:
        if model_id not in self._records:
            raise KeyError(f"Unknown model: {model_id}")
        record = self._records[model_id]
        if self._active_by_task.get(record.metadata.task) == model_id:
            del self._active_by_task[record.metadata.task]
        self._records[model_id] = replace(record, active=False)
        return self._records[model_id]

    def active(self, task: ModelTask | str) -> BaseModelAdapter | None:
        normalized_task = task if isinstance(task, ModelTask) else ModelTask(str(task).casefold())
        model_id = self._active_by_task.get(normalized_task)
        return self._adapters.get(model_id) if model_id else None

    def list(self, task: ModelTask | str | None = None) -> list[RegisteredModel]:
        target = task if isinstance(task, ModelTask) or task is None else ModelTask(str(task).casefold())
        records = self._records.values()
        if target is not None:
            records = (record for record in records if record.metadata.task is target)
        return sorted(records, key=lambda record: (record.metadata.task.value, -record.metadata.priority, record.metadata.model_id))

    def predict(self, task: ModelTask | str, input_data: Any) -> Mapping[str, Any]:
        adapter = self.active(task)
        if adapter is None:
            raise ModelRegistrationError(f"No active model for task '{task}'")
        return adapter.predict(input_data)


class ModelBundleImporter:
    """Validate model bundles before a caller persists/moves them.

    The importer itself does not move files.  A command-layer caller may only
    move a bundle after `accepted` is true, preserving a safe quarantine flow.
    """

    def __init__(self, registry: ModelRegistry, factory: type[AdapterFactory] = AdapterFactory) -> None:
        self.registry = registry
        self.factory = factory

    def import_bundle(self, bundle_path: str | Path, *, activate: bool = False) -> BundleImportResult:
        path = Path(bundle_path).resolve()
        try:
            if not path.is_dir():
                raise ModelRegistrationError("Model bundle path is not a directory")
            manifest_path = self._find_manifest(path)
            manifest = ModelManifest.from_mapping(self._read_manifest(manifest_path))
            self._validate_entrypoint(path, manifest)
            checksum = self.checksum(path)
            metrics = self._metrics(path, manifest)
            adapter = self.factory.create(manifest, bundle_path=path)
            registered = self.registry.register(
                adapter,
                checksum=checksum,
                metrics=metrics,
                activate=activate,
                sample_input=self._sample_input(manifest.task),
            )
            return BundleImportResult(True, str(path), manifest.model_id, checksum, registered=registered)
        except (ModelRegistrationError, ModelAdapterError, OSError, ValueError, json.JSONDecodeError) as exc:
            return BundleImportResult(False, str(path), reason=str(exc))

    @staticmethod
    def checksum(bundle_path: Path) -> str:
        digest = hashlib.sha256()
        for file_path in sorted((item for item in bundle_path.rglob("*") if item.is_file()), key=lambda item: item.relative_to(bundle_path).as_posix()):
            digest.update(file_path.relative_to(bundle_path).as_posix().encode("utf-8"))
            with file_path.open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def _find_manifest(path: Path) -> Path:
        for name in ("manifest.yaml", "manifest.yml", "manifest.json"):
            candidate = path / name
            if candidate.is_file():
                return candidate
        raise ModelRegistrationError("Bundle has no manifest.yaml, manifest.yml, or manifest.json")

    @staticmethod
    def _read_manifest(path: Path) -> Mapping[str, Any]:
        if path.suffix == ".json":
            return json.loads(path.read_text(encoding="utf-8"))
        try:
            import yaml  # type: ignore[import-not-found]
        except ImportError as exc:
            raise ModelRegistrationError("YAML manifests require the optional PyYAML package") from exc
        parsed = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(parsed, Mapping):
            raise ModelRegistrationError("Model manifest must be a mapping")
        return parsed

    @staticmethod
    def _validate_entrypoint(bundle: Path, manifest: ModelManifest) -> None:
        candidate = (bundle / manifest.entrypoint).resolve()
        try:
            candidate.relative_to(bundle)
        except ValueError as exc:
            raise ModelRegistrationError("Manifest entrypoint must remain inside the model bundle") from exc
        # Rules can be self-contained and need no model artifact; all other
        # frameworks must make the promised path available to the adapter.
        if manifest.framework not in {"rules", "baseline", "deterministic"} and not candidate.exists():
            raise ModelRegistrationError(f"Manifest entrypoint does not exist: {manifest.entrypoint}")
        if manifest.metrics_file:
            metric_path = (bundle / manifest.metrics_file).resolve()
            try:
                metric_path.relative_to(bundle)
            except ValueError as exc:
                raise ModelRegistrationError("metrics_file must remain inside the model bundle") from exc

    @staticmethod
    def _metrics(path: Path, manifest: ModelManifest) -> Mapping[str, Any]:
        if not manifest.metrics_file:
            return {}
        metric_path = path / manifest.metrics_file
        if not metric_path.is_file():
            raise ModelRegistrationError(f"Declared metrics file is missing: {manifest.metrics_file}")
        try:
            loaded = json.loads(metric_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ModelRegistrationError("metrics_file must be valid JSON") from exc
        if not isinstance(loaded, Mapping):
            raise ModelRegistrationError("metrics_file must contain a JSON object")
        return loaded

    @staticmethod
    def _sample_input(task: ModelTask) -> Any:
        if task in {ModelTask.NER, ModelTask.RELATION_EXTRACTION}:
            return "Mr. Rahul Sharma uses phone +91 98765 43210."
        if task in {ModelTask.TEXT_EMBEDDING, ModelTask.ENTITY_EMBEDDING, ModelTask.CASE_SIMILARITY}:
            return "synthetic model health-check text"
        return [0.0, 1.0]
