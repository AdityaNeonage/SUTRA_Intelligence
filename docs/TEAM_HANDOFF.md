# Model and Dataset Handoff

SUTRA accepts complete, versioned model bundles. Do not send a lone checkpoint
file. Copy one bundle directory into `models/incoming/` and run the importer.

## Required bundle layout

```text
models/incoming/<bundle-name>/
├── manifest.yaml
├── model/                 # model weights or framework directory
├── tokenizer/             # required for token-based models
├── label_map.json         # required when labels are external to the model
├── preprocessing.json     # required when preprocessing is non-default
├── metrics.json           # measured metrics and evaluation context
└── README.md              # owner, data licence, local test instructions
```

`tokenizer`, `label_map.json`, and `preprocessing.json` are conditional, but
the manifest must clearly state when they are not needed. `model/` must exist.

## Manifest requirements

```yaml
id: sutra_indic_ner_v3
name: Indic Criminal Entity NER
version: 3.0.0
task: ner
framework: huggingface
entrypoint: model
languages: [en, hi, bn]
source: team-member
license: research-prototype
input_schema: text
output_schema: sutra-ner-v1
metrics_file: metrics.json
priority: 100
```

Required fields are `id`, `name`, `version`, `task`, `framework`, `entrypoint`,
`languages`, `source`, `input_schema`, `output_schema`, and `priority`. IDs and
versions must be stable and unique. Accepted frameworks are `rules`,
`huggingface`, `pytorch`, `onnx`, `sklearn`, `spacy`, `sentence_transformers`,
`ollama`, `openai_compatible`, `llamacpp`, and `custom_python`.

## Output contracts

NER adapters must return:

```json
{"entities":[{"text":"Aarav Sen","type":"PERSON","start":0,"end":9,"confidence":0.96,"model_id":"id","model_version":"3.0.0"}]}
```

Relation adapters must return:

```json
{"relations":[{"subject":"Aarav Sen","predicate":"USES","object":"9876543210","confidence":0.88,"evidence_text":"...","model_id":"id","model_version":"3.0.0"}]}
```

Case-similarity adapters must return `case_a`, `case_b`, `similarity` (0–1),
and a non-empty `reasons` array. Keep confidence calibrated and document the
evaluation data; do not omit uncertain predictions silently.

## Include the full inference contract

Provide tokenizer files, label mapping, preprocessing configuration, metrics,
licence/data-authorisation information, hardware requirements, and a README
with an exact command that runs one local inference. Never embed credentials,
private data, or absolute paths in the bundle.

## Import and test

From the repository root, use Python 3.11:

```powershell
py -3.11 scripts/import_model_bundle.py models/incoming/<bundle-name>
py -3.11 scripts/test_model.py <model-id>
py -3.11 scripts/evaluate_models.py --model <model-id>
```

The importer validates the manifest, checks required files, calculates a
recursive SHA-256 checksum, loads the matching adapter, runs its health check
and a schema-checked sample inference, then registers it. A valid bundle moves
to `models/registered/`; a failed one moves to `models/quarantine/` and a
failure record is retained. The importer never silently accepts a bad model.
