# SUTRA REST API

The FastAPI OpenAPI document is available at `/docs` when the backend runs. All
mutating and case-data endpoints require a bearer token unless explicitly marked
as a health endpoint.

## Authentication and health

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Lightweight liveness response. |
| `GET` | `/api/system/health` | Database, graph, registry, storage, and active-model status. |
| `POST` | `/api/auth/login` | Obtain a JWT from email/password. |
| `GET` | `/api/auth/me` | Read the authenticated user. |

The local synthetic-demo account is `admin@sutra.local` with password
`sutra-demo-2026`. Change it outside local demonstration mode.

## Cases and evidence

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`, `POST` | `/api/cases` | List/create cases. |
| `GET`, `PATCH` | `/api/cases/{case_id}` | Read/update a permitted case. |
| `POST` | `/api/ingestion/upload` | Store and process a TXT, CSV, JSON, or PDF evidence file. |
| `GET` | `/api/ingestion` | List ingestion batches with hashes/statuses. |
| `GET` | `/api/documents/{document_id}` | Read document text, extractions, and provenance. |
| `GET` | `/api/entities` | Search/paginate canonical entities. |
| `GET` | `/api/entities/{entity_id}` | Entity profile, evidence, metrics, and relationships. |
| `GET` | `/api/relationships/{edge_id}` | Explainable WHY panel payload. |

## Graph and intelligence

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/graph/neighborhood` | Server-side one-to-three-hop expansion. |
| `GET` | `/api/graph/path` | Shortest evidence-supported path. |
| `GET` | `/api/graph/community` | Communities and summary metrics. |
| `GET` | `/api/analytics/centrality` | Degree, betweenness, PageRank. |
| `GET` | `/api/analytics/bridges` | Explainable bridge candidates; never guilt labels. |
| `GET` | `/api/analytics/financial` | Rule-based financial-network analytical alerts. |
| `GET` | `/api/analytics/timeline` | Activity frequency and temporal events. |
| `GET` | `/api/analytics/delta` | Network changes between two snapshots. |
| `GET` | `/api/cross-case` | Related-case leads and supporting shared signals. |
| `POST` | `/api/copilot/query` | Evidence-grounded graph question; no unsupported claims. |
| `GET` | `/api/reports/cases/{case_id}.json` | Export a JSON investigation summary. |

## Models, feedback, and audit

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/models` | Registered models and active state. |
| `POST` | `/api/models/import` | Validate/register a local model bundle. |
| `POST` | `/api/models/{model_id}/test` | Health/test an adapter. |
| `POST` | `/api/models/{model_id}/activate` | Activate a compatible model. |
| `POST` | `/api/feedback/entity-resolution` | Confirm/reject an auditable candidate match. |
| `POST` | `/api/feedback/relationship` | Confirm/reject an inference/hypothesis. |
| `GET` | `/api/audit` | Read permitted append-only audit events. |

## Error shape

Non-validation application errors use a safe structured response:

```json
{
  "error": {
    "code": "MODEL_LOAD_FAILED",
    "message": "The model could not be loaded.",
    "details": {}
  }
}
```

Server stack traces and secrets are logged server-side and are not returned to
the investigator UI.
