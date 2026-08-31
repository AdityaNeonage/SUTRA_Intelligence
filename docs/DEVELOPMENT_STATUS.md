# SUTRA Development Status

Last updated: 2026-08-30

## Repository baseline

The repository was inspected before implementation began. It contained no tracked
or untracked project files, no Git repository, and no existing application code
to preserve. Python 3.11 and Python 3.13 are installed; SUTRA uses Python 3.11
because it is explicitly supported by the requested backend stack.

## Current implementation status

| Area | Status | Notes |
| --- | --- | --- |
| Architecture and status baseline | [COMPLETE] | Empty repository recorded; local SQLite/NetworkX baseline with PostgreSQL/Neo4j adapters is the implementation path. |
| Backend foundation and authentication | [PARTIAL] | In active implementation. |
| Canonical entities, cases, provenance, and audit | [PARTIAL] | In active implementation. |
| Ingestion and document intelligence | [PARTIAL] | In active implementation. |
| Entity resolution | [PARTIAL] | Deterministic, explainable baseline in active implementation. |
| Knowledge graph and graph analytics | [PARTIAL] | NetworkX baseline in active implementation. |
| Cross-case, financial, temporal, and delta intelligence | [PARTIAL] | In active implementation. |
| Model registry and bundle import | [PARTIAL] | In active implementation. |
| Synthetic demo data and command-line workflow | [PARTIAL] | In active implementation. |
| Investigator web application | [PARTIAL] | Source implementation in progress; Node.js is not installed locally for build verification. |
| Docker deployment | [PARTIAL] | Compose artifacts will be supplied; Docker is not installed locally for runtime verification. |
| Automated backend tests | [PARTIAL] | In active implementation. |
| Frontend build verification | [BLOCKED] | Requires Node.js/npm on this laptop. |
| Docker integration verification | [BLOCKED] | Requires Docker Desktop/CLI on this laptop. |

## Design commitments

- SUTRA is an evidence-centred investigator decision-support prototype, not a
  guilt predictor or surveillance product.
- Every relationship carries provenance and an explicit evidence classification:
  `VERIFIED`, `INFERRED`, or `HYPOTHESIS`.
- Baseline rules and algorithms remain replaceable through typed adapters and a
  model-bundle registry.
- Demo data is synthetic only.
