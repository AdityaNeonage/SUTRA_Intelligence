# Canonical Data and Provenance Model

## Canonical entity envelope

Every entity has a stable `canonical_id`, a `type`, a display name/value,
normalised search value, confidence, creation/update times, optional aliases,
and one or more source-record references. Core types are `Person`, `Phone`,
`SIM`, `Device`, `BankAccount`, `UPI`, `Vehicle`, `Organisation`, `Location`,
`IPAddress`, `Domain`, `SocialAccount`, `Case`, `Document`, `Event`, and
`Transaction`.

The system supports sparse records. Missing fields mean "not supplied", never
"negative evidence".

## Person fields

| Field | Purpose |
| --- | --- |
| `canonical_id` | Stable internal identifier; never derived only from a name. |
| `name`, `normalized_name`, `aliases` | Identity and search values. |
| `date_of_birth`, `age`, `gender` | Optional supplied attributes. |
| `relative_names`, `addresses`, `phones`, `identifiers` | Multi-value corroborating signals. |
| `source_records` | Immutable links to supporting evidence. |
| `confidence` | Record/extraction confidence, not a guilt score. |

## Relationship fields

Relationships use a generated `edge_id` and `source_id`/`target_id` plus a
predicate such as `CALLS`, `OWNS`, `USES`, `TRANSFERRED_TO`, `ASSOCIATED_WITH`,
`APPEARS_IN`, or `RELATED_TO`. Each contains:

```text
case_id, source_record_id, evidence_id, first_seen, last_seen, timestamp,
weight, confidence, evidence_status, derivation, model_id, model_version,
created_at
```

`evidence_status` is always `VERIFIED`, `INFERRED`, or `HYPOTHESIS`; inference
must include a readable derivation and cannot be rendered as a verified fact.

## Ingestion and documents

An ingestion batch records `ingestion_id`, source type, optional case, original
filename, immutable SHA-256 hash, uploader, timestamp, status, and document/row
counts. A document retains the raw evidence path, extracted text, language,
processing timestamp, and page/location references when available. Processing
outputs always point to the input evidence and do not mutate it.

## Entity-resolution decisions

Resolution candidates retain both entity IDs, a status (`AUTO_MATCHED`,
`POSSIBLE_MATCH`, `NOT_MATCH`, `MANUALLY_CONFIRMED`, or `MANUALLY_REJECTED`),
the overall score, individual feature values, contradiction flags, reviewer,
timestamp, and explanation. Name similarity alone is insufficient for automatic
merging.

## Model registration

Each registration records model ID/name, task, version, framework, languages,
registered time, recursive checksum, metrics, active state, priority, bundle
path, team source, input/output schemas, and health/test result. AI outputs keep
the producing model ID/version.

## Audit events

Audit records are append-only at application level and include actor, action,
resource type/id, case context where applicable, timestamp, request metadata,
and a redacted structured detail payload. Examples include login, case open,
upload, export, feedback, and model registration.
