# SUTRA — Secure Unified Threat & Relationship Analytics

SUTRA is a working, evidence-centred criminal-network analysis prototype for
authorized investigators. It turns fragmented synthetic case files into
traceable entities, relationships, an explorable knowledge graph, analytical
leads, and evidence-grounded answers.

It is not a guilt predictor, a criminal-probability calculator, an unrestricted
surveillance system, or a replacement for human investigation. Every result is
classified as `VERIFIED`, `INFERRED`, or `HYPOTHESIS`, and the UI/API retain the
evidence and derivation behind it.

## What is implemented

- JWT login, roles, case workspaces, structured errors, and audit-oriented
  service boundaries.
- Immutable evidence ingestion with SHA-256 hashing, original/processed storage,
  CSV/JSON/TXT/PDF text extraction, deterministic baseline NER and relationship
  extraction.
- Explainable entity resolution using multiple independent signals rather than
  name matching alone.
- Graph construction and real NetworkX analytics: neighborhoods, shortest
  paths, components, centrality, communities, bridge entities, and density.
- Cross-case shared-signal discovery, transaction-network alerts, temporal
  summaries, network delta, report export, and evidence-grounded copilot
  fallback.
- Model adapter and bundle registry for local/team models without rewriting
  business logic.
- Synthetic demonstration generator with a cyber-fraud chain, an organized
  network, cross-case links, bridge entities, and duplicate-identity candidates.
- React/Vite investigator console, a backend-connected authenticated console,
  and unified Vercel Services deployment configuration.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/API.md](docs/API.md), [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md),
and [docs/DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md)
for the design and current verified status.

## Quick start — local backend (Python 3.11)

Python 3.11 is intentionally selected because it meets the project requirement
and is installed on this laptop. From PowerShell in the repository root:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe scripts\reset_demo.py
.\.venv\Scripts\python.exe scripts\seed_demo_data.py
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

Open <http://127.0.0.1:8000/docs> for the API or
<http://127.0.0.1:8000/health> for the liveness probe.

## Demo login

| Field | Value |
| --- | --- |
| Email | `admin@sutra.local` |
| Password | `sutra-demo-2026` |
| Role | `administrator` |

The account is intended only for the synthetic local demonstration. Set a
non-default `SUTRA_JWT_SECRET` and provision real users before deployment.

## Frontend

After installing a current Node.js LTS release, run in a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Then open <http://127.0.0.1:5173>. Vite proxies same-origin `/api` requests to
the local backend at port 8000. Use **Explore Platform** for the polished
synthetic experience or **Backend sign in** for the authenticated live console.

## Unified Vercel deployment

The root `vercel.json` defines two services in one deployment:

- `frontend`: the React/Vite application for `/` and all browser routes.
- `backend`: the FastAPI application for `/api/*` and `/health`.

From the repository root, link and deploy with:

```powershell
npx vercel@latest login
npx vercel@latest link
npx vercel@latest deploy --prod
```

Before the production deployment, set the Vercel project's Framework Preset to
**Services** and add the required backend environment variables. Connect a
PostgreSQL provider for persistent data; otherwise the deployment uses a
temporary `/tmp` SQLite demonstration database. Follow the exact one-time setup
and operating instructions in [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md).

## Docker Compose

After installing Docker Desktop:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Compose starts PostgreSQL, Neo4j, backend, and frontend. See `.env.example` for
the development credentials and change all defaults before non-demo use.

## Five-minute demonstration

1. Start the seeded backend and sign in with the demo credentials.
2. Open the Cyber Fraud case, select its victim, and expand a two-hop
   neighborhood.
3. Inspect the chain from complaint phone through UPI/account/device to the
   possible operator; open a relationship's **Why** panel to view provenance.
4. Open **Bridge entities** to see the cross-community intermediary and its
   centrality/case rationale.
5. Open **Related cases** to view the shared identifiers and evidence references.
6. Upload `data/synthetic/new_evidence.txt` (or the generated sample) to the
   selected case and open **What changed?** to see new nodes/edges.
7. Ask the copilot: `Why is <demo bridge entity> important?`; its answer is
   composed from graph evidence, not an unsupported claim.

## Model handoff workflow

Team members place a complete bundle in `models/incoming/`, then run:

```powershell
.\.venv\Scripts\python.exe scripts\import_model_bundle.py models\incoming\<bundle-name>
.\.venv\Scripts\python.exe scripts\test_model.py <model-id>
.\.venv\Scripts\python.exe scripts\evaluate_models.py --model <model-id>
```

The importer validates the manifest, calculates checksums, performs an adapter
health/sample-inference/schema check, registers valid models, and quarantines
invalid bundles. See [docs/TEAM_HANDOFF.md](docs/TEAM_HANDOFF.md).

## Testing

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
.\.venv\Scripts\python.exe -m ruff check backend
.\.venv\Scripts\python.exe -m black --check backend
```

After Node installation:

```powershell
Set-Location frontend
npm run build
npm test
```

## Repository layout

```text
backend/       FastAPI application, services, adapters, analytics, and tests
frontend/      React + TypeScript investigator console
data/          isolated incoming/processed/synthetic/golden/export directories
models/        incoming/registered/quarantine model-bundle lifecycle
scripts/       demo, import, evaluation, and reset commands
docs/          architecture, API, safety, model, and team handoff documentation
```

## Data safety

The included dataset is fictional and deterministic. Do not place confidential
or unauthorized data in this repository, scrape protected systems, or enable a
remote LLM provider without a reviewed data-sharing policy.
