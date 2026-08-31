# Model Registry and Adapter Integration

The business pipeline depends on task interfaces, not model frameworks. The
registry chooses active adapters by task and priority; an ensemble policy can
later use primary-only, highest-confidence, voting, weighted, or rules-plus-
model strategies.

## Adapter contract

Every adapter implements these operations:

```python
load()
health_check()
predict(input)
predict_batch(inputs)
metadata()
version()
supported_languages()
output_schema()
```

Available task contracts include `NERModelAdapter`, `RelationExtractionAdapter`,
`EntityEmbeddingAdapter`, `TextEmbeddingAdapter`, `CaseSimilarityAdapter`,
`LLMAdapter`, `TranslationAdapter`, `OCRAdapter`, and `AnomalyModelAdapter`.

## Baseline behaviour

Until a validated model arrives, SUTRA uses deterministic identifier extraction,
rule-based relation extraction, explainable fuzzy/entity-identifier features,
NetworkX graph algorithms, and rule-based analytical alerts. This permits a
complete local demonstration without downloading model weights or exposing data
to third parties.

## Supported bundle frameworks

Framework adapters are selected from `rules`, Hugging Face transformer
directories, PyTorch checkpoints, ONNX, scikit-learn/joblib, spaCy,
SentenceTransformer, Ollama, OpenAI-compatible local inference endpoints,
GGUF/llama.cpp providers, and custom Python adapters. Unsupported or malformed
bundles are quarantined rather than partially registered.

## Import lifecycle

1. Validate the manifest and required path layout.
2. Compute a recursive SHA-256 bundle checksum.
3. Build the matching adapter and run health checks.
4. Run a safe sample prediction and validate its standard output schema.
5. Save registration metadata and activation state.
6. Move the bundle atomically to `models/registered/`, or quarantine it with a
   durable failure reason.

See [TEAM_HANDOFF.md](TEAM_HANDOFF.md) for the handoff format and commands.
