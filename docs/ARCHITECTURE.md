# SUTRA Architecture

SUTRA (Secure Unified Threat & Relationship Analytics) is an evidence-centred,
synthetic-data-only investigator decision-support prototype. It exposes
relationships and analytical leads; it does not predict guilt or make automated
investigative decisions.

## Runtime topology

```text
Evidence file / structured record
        |
        v
ingestion + immutable SHA-256 provenance
        |
        v
text extraction -> baseline NER / relation extraction -> entity resolution
        |                                                    |
        +------------------- canonical records --------------+
                                     |
                                     v
                         graph projection / NetworkX baseline
                                     |
                     +---------------+----------------+
                     v                                v
            analytics + cross-case                 REST API
       (bridges, paths, finance, delta)               |
                                                      v
                                         React investigator workspace
```

## Deployment modes

### Local demonstration mode

The backend uses SQLite and an in-process NetworkX graph so the prototype can
run on one laptop without external services. Original evidence is written to
`data/incoming/`; processed copies are separate from original files.

### Container / shared mode

Docker Compose provisions PostgreSQL, Neo4j, the FastAPI backend, and the React
frontend. Database and graph adapters are configuration-driven; business logic
uses service interfaces rather than database-driver calls.

## Trust and provenance model

Every graph edge has an evidence status:

| Status | Meaning | UI convention |
| --- | --- | --- |
| `VERIFIED` | Directly represented in an authorized source record | Solid edge |
| `INFERRED` | Derived from corroborating records or a deterministic rule | Dashed edge |
| `HYPOTHESIS` | A lead that requires investigator review | Dotted edge |

An edge references its evidence/document record, source-record ID, case,
confidence, derivation, timestamp, and any model ID/version. The application
never upgrades an inferred relationship to verified without an analyst action.

## Replaceable model boundary

`BaseModelAdapter` defines loading, health, prediction, batching, metadata,
version, supported languages, and output-schema methods. Task adapters normalise
their outputs to SUTRA schemas, allowing a baseline rules engine, a local model,
or a team-supplied bundle to use the same ingestion pipeline.

The model registry validates a bundle before registering it and quarantines a
failed bundle with its failure reason. A model output always retains its model
identifier and version.

## Security baseline

The prototype implements password hashing, signed bearer tokens, role-aware
case access, validation, CORS configuration, structured error responses, and
append-only application audit events. Configuration and credentials belong in
environment variables, never source files.

## Deliberate local fallbacks

- NetworkX provides real graph calculations when Neo4j/GDS is unavailable.
- Regex plus deterministic rules provides real baseline identifier extraction
  without downloading external model weights.
- `difflib`/RapidFuzz-compatible matching provides explainable entity-resolution
  features when optional ML packages are unavailable.
- Copilot answers are graph-grounded templates unless a configured local LLM
  provider is available; they never invent missing evidence.
