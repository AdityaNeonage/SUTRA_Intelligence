"""Pluggable model adapters and a safe in-memory registry/bundle importer."""

from .adapters import (
    AdapterFactory,
    AnomalyModelAdapter,
    CaseSimilarityAdapter,
    EntityEmbeddingAdapter,
    LLMAdapter,
    NERModelAdapter,
    OCRAdapter,
    RelationExtractionAdapter,
    TextEmbeddingAdapter,
    TranslationAdapter,
)
from .base import BaseModelAdapter, ModelHealth, ModelManifest, ModelMetadata, ModelTask
from .registry import BundleImportResult, ModelBundleImporter, ModelRegistry

__all__ = [
    "AdapterFactory",
    "AnomalyModelAdapter",
    "BaseModelAdapter",
    "BundleImportResult",
    "CaseSimilarityAdapter",
    "EntityEmbeddingAdapter",
    "LLMAdapter",
    "ModelBundleImporter",
    "ModelHealth",
    "ModelManifest",
    "ModelMetadata",
    "ModelRegistry",
    "ModelTask",
    "NERModelAdapter",
    "OCRAdapter",
    "RelationExtractionAdapter",
    "TextEmbeddingAdapter",
    "TranslationAdapter",
]
