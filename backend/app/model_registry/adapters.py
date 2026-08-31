"""Baseline and optional framework adapters behind the stable contract."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, Mapping

from .base import (
    BaseModelAdapter,
    ModelAdapterError,
    ModelHealth,
    ModelManifest,
    ModelTask,
    validate_standard_output,
)


class CallableModelAdapter(BaseModelAdapter):
    """Adapter for team-supplied Python callables in controlled deployments."""

    def __init__(self, manifest: ModelManifest, predictor: Callable[[Any], Mapping[str, Any]], *, model_path: str | None = None) -> None:
        super().__init__(manifest, model_path=model_path)
        self._predictor = predictor

    def load(self) -> None:
        self._loaded = True

    def health_check(self) -> ModelHealth:
        return ModelHealth(self._loaded, "ready" if self._loaded else "not loaded")

    def predict(self, input_data: Any) -> Mapping[str, Any]:
        self._require_loaded()
        output = self._predictor(input_data)
        validate_standard_output(self.manifest.task, output)
        return output


class RuleBasedNERAdapter(BaseModelAdapter):
    def load(self) -> None:
        from app.document_ai import DeterministicNER

        self._model = DeterministicNER()
        self._loaded = True

    def health_check(self) -> ModelHealth:
        return ModelHealth(self._loaded, "deterministic NER baseline ready" if self._loaded else "not loaded")

    def predict(self, input_data: Any) -> Mapping[str, Any]:
        self._require_loaded()
        output = self._model.predict(str(input_data))
        # Present registry metadata, rather than a hidden internal baseline ID.
        for entity in output["entities"]:
            entity["model_id"] = self.manifest.model_id
            entity["model_version"] = self.manifest.version
        validate_standard_output(ModelTask.NER, output)
        return output


class RuleBasedRelationAdapter(BaseModelAdapter):
    def load(self) -> None:
        from app.document_ai import DeterministicNER, DeterministicRelationExtractor

        self._ner = DeterministicNER()
        self._model = DeterministicRelationExtractor()
        self._loaded = True

    def health_check(self) -> ModelHealth:
        return ModelHealth(self._loaded, "deterministic relation baseline ready" if self._loaded else "not loaded")

    def predict(self, input_data: Any) -> Mapping[str, Any]:
        self._require_loaded()
        text = str(input_data)
        output = self._model.predict(text, self._ner.extract(text))
        for relation in output["relations"]:
            relation["model_id"] = self.manifest.model_id
            relation["model_version"] = self.manifest.version
        validate_standard_output(ModelTask.RELATION_EXTRACTION, output)
        return output


class SklearnModelAdapter(BaseModelAdapter):
    """Generic local joblib adapter for classifiers/anomaly models."""

    def load(self) -> None:
        try:
            import joblib  # type: ignore[import-not-found]
        except ImportError as exc:
            raise ModelAdapterError("joblib is required for sklearn model bundles") from exc
        if not self.model_path:
            raise ModelAdapterError("A sklearn adapter requires a model path")
        self._model = joblib.load(self.model_path)
        self._loaded = True

    def health_check(self) -> ModelHealth:
        return ModelHealth(self._loaded, "sklearn model ready" if self._loaded else "not loaded")

    def predict(self, input_data: Any) -> Mapping[str, Any]:
        self._require_loaded()
        prediction = self._model.predict([input_data])[0]
        output: dict[str, Any] = {"prediction": prediction}
        if hasattr(self._model, "predict_proba"):
            output["probabilities"] = self._model.predict_proba([input_data])[0].tolist()
        return output


class UnavailableModelAdapter(BaseModelAdapter):
    """Safe failure for a bundle whose optional runtime is not installed."""

    def __init__(self, manifest: ModelManifest, reason: str, *, model_path: str | None = None) -> None:
        super().__init__(manifest, model_path=model_path)
        self.reason = reason

    def load(self) -> None:
        raise ModelAdapterError(self.reason)

    def health_check(self) -> ModelHealth:
        return ModelHealth(False, self.reason)

    def predict(self, input_data: Any) -> Mapping[str, Any]:
        raise ModelAdapterError(self.reason)


# Named task adapters are intentionally thin: they document capability and let
# team model wrappers subclass the appropriate type without leaking frameworks.
class NERModelAdapter(CallableModelAdapter):
    pass


class RelationExtractionAdapter(CallableModelAdapter):
    pass


class EntityEmbeddingAdapter(CallableModelAdapter):
    pass


class TextEmbeddingAdapter(CallableModelAdapter):
    pass


class CaseSimilarityAdapter(CallableModelAdapter):
    pass


class LLMAdapter(CallableModelAdapter):
    pass


class TranslationAdapter(CallableModelAdapter):
    pass


class OCRAdapter(CallableModelAdapter):
    pass


class AnomalyModelAdapter(CallableModelAdapter):
    pass


class AdapterFactory:
    """Select an adapter without coupling pipeline code to a model framework."""

    @staticmethod
    def create(manifest: ModelManifest, *, bundle_path: Path | None = None) -> BaseModelAdapter:
        entrypoint = str((bundle_path / manifest.entrypoint) if bundle_path else manifest.entrypoint)
        if manifest.framework in {"rules", "baseline", "deterministic"}:
            if manifest.task is ModelTask.NER:
                return RuleBasedNERAdapter(manifest, model_path=entrypoint)
            if manifest.task is ModelTask.RELATION_EXTRACTION:
                return RuleBasedRelationAdapter(manifest, model_path=entrypoint)
        if manifest.framework in {"sklearn", "joblib"}:
            return SklearnModelAdapter(manifest, model_path=entrypoint)
        return UnavailableModelAdapter(
            manifest,
            f"No runtime adapter is installed for framework '{manifest.framework}'. "
            "Install its optional runtime or supply a custom callable adapter.",
            model_path=entrypoint,
        )
