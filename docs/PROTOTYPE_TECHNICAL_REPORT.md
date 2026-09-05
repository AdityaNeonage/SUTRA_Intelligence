# Report A — prototype update

## Outcome and boundaries

Implemented case-bound multi-file intake, a purple/magenta Copilot and landing/login presentation, and a real Leaflet map linked to a synthetic network/timeline. Existing React 18/TypeScript/Vite, TanStack Query, router, FastAPI, SQLAlchemy, JWT and ingestion architecture are retained.

Pari's existing AIInsights presentation was inspected before adaptation: dark cards, magenta accents, context and investigation actions were adapted into existing components, not imported as a second app or UI framework. Existing hacker artwork is retained.

No push, commit, deployment, database migration, external LLM, new auth system, Neo4j or object storage work was performed. The pre-existing modification to docs/VERCEL_DEPLOYMENT.md was preserved and is not part of this update.

## Modified files

- backend/app/services/intelligence.py — reject unsupported XLSX/XLS and count actual stored documents, including structured rows.
- backend/pyproject.toml; backend/requirements.txt — install the parsers already used by PDF/DOCX processing.
- frontend/package.json; frontend/package-lock.json — Leaflet dependencies.
- frontend/src/App.tsx — entry, upload/result navigation, Copilot actions, public case tab navigation and expired-session recovery.
- frontend/src/api/client.ts — source classification query parameter and authenticated 401 notification.
- frontend/src/components/AppShell.tsx — Intelligence Fusion Center and SUTRA Copilot labels.
- frontend/src/lib/router.ts; frontend/src/lib/router.test.ts — case/batch/document/entity deep links and reduced-motion navigation.
- frontend/src/main.tsx — load phase styles.
- frontend/src/pages/AssistantPage.tsx — explicitly scripted public Copilot with actionable proposal.
- frontend/src/pages/LiveAssistantPage.tsx — real conversation history, current case/entity, API citations, limitations and navigation.
- frontend/src/pages/CaseWorkspacePage.tsx — real case intake, receipt counts and timeline focus.
- frontend/src/pages/CaseWorkspaceExperiencePage.tsx; frontend/src/pages/CasesPage.tsx — public authentication gates.
- frontend/src/pages/LiveEvidencePage.tsx — shared queue and case upload receipts.
- frontend/src/pages/DataStorePage.tsx — batch/document deep links, receipt/hash display and stale-detail response guard.
- frontend/src/pages/EvidencePage.tsx — honest public selection preview and supported file types.
- frontend/src/pages/FusionIntelligencePage.tsx — renamed page, real map default, retained labelled legacy modes.
- frontend/src/pages/DashboardExperiencePage.tsx — renamed fusion reference only.
- frontend/src/pages/LandingPage.tsx — new hero copy, purple canvas and working CTAs.
- frontend/src/pages/LoginPage.tsx — prototype entry, password visibility, backend recheck and public sample route.
- frontend/src/pages/LiveNetworkPage.tsx — incoming entity highlighting.

## Created files

- frontend/src/components/EvidenceIntake.tsx
- frontend/src/components/EvidenceIntake.test.tsx
- frontend/src/components/DemoUploadGate.tsx
- frontend/src/components/InvestigationMap.tsx
- frontend/src/features/evidence/uploadQueue.ts
- frontend/src/features/evidence/uploadQueue.test.ts
- frontend/src/features/evidence/copilotSources.ts
- frontend/src/features/evidence/copilotSources.test.ts
- frontend/src/features/fusion/FusionMapWorkbench.tsx
- frontend/src/features/fusion/locationData.ts
- frontend/src/features/fusion/locationData.test.ts
- frontend/src/styles/investigation-phase.css
- backend/tests/test_evidence_intake.py
- prototype-transfers.csv — two fictional transfers for hands-on use.
- docs/PROTOTYPE_TECHNICAL_REPORT.md
- docs/PROTOTYPE_PRACTICAL_GUIDE.md

## Dependencies

- leaflet 1.9.4; @types/leaflet 1.9.21 (development types; @types/geojson transitive).
- pypdf >=5,<7 (installed 6.17.0).
- python-docx >=1.1,<2 (installed 1.2.0; lxml transitive).

No AI SDK, motion framework or second component framework was added.

## Existing endpoints reused

- POST /api/auth/login
- GET /api/cases and GET /api/cases/{id}
- POST /api/cases — used once to initialise the local fictional PRACTICE-001 case.
- POST /api/ingestion/upload — existing case_id and source_type parameters, one request per queued file.
- GET /api/ingestion
- GET /api/documents and GET /api/documents/{id}
- GET /api/graph/neighborhood
- GET /api/analytics/timeline and existing case analytics.
- POST /api/copilot/query — unchanged deterministic graph-grounded service.
- Existing health, audit and optional administrator demo seed functionality remain.

No endpoints were added. Existing backend authentication and audit calls are retained.

## Checks performed

- Existing virtual environment: backend/.venv/Scripts/python.exe -m pytest backend/tests -q --tb=short — 22 passed.
- Frontend npm test — 14 passed across six files.
- Frontend npm run build — TypeScript and Vite production build passed after final login/UI edits.
- git diff --check — passed.
- Actual local HTTP login verified against the running backend, without printing a token/password.
- Created one clearly fictional training case in the local database; left evidence empty for the user to upload.
- Local frontend and API proxy responded successfully.

Backend tests cover real CSV/JSON/TXT/Markdown/PDF/DOCX extraction, failure followed by success, document counts, case association, hashes, source labels, retained audit events, copilot path citations and login requirements. Frontend tests cover upload component submission/case propagation, cache refresh, receipt navigation, public login gate, partial failures/retry, file validation, map-to-graph identifiers/filters, citations and deep links.

The first build/test attempts encountered Windows sandbox subprocess or temporary-directory permissions. Successful reruns used the required permission; those failures were not application failures.

Manual code/route review covered landing, public/live cases, case intake, standalone live intake, both assistants, fusion/map, network and Data Store. Browser connection was unavailable: no browser screenshot, visual verification or pixel-level 1366×768 claim is made. CSS provides responsive split panels and stacked mobile layouts.

## Limitations and mode separation

- Real backend/login: live cases, intake, receipts/documents, graph, analytics and Copilot.
- Synthetic demo: public cases/evidence, public assistant, fusion locations, map/graph linkage, legacy fusion modes and sample hypothesis workbench.
- Map coordinates are illustrative area-level data, not extracted GPS; source status does not verify coordinates. No live geographic fields are fabricated. OSM basemap requires internet and has attribution.
- PDF needs selectable text; OCR is not implemented. DOCX uses the existing paragraph extractor, not comprehensive embedded-object/table extraction. XLSX is deliberately rejected.
- Uploads are sequential and in-page, not a durable background queue. Keep the page open. Retrying creates a new batch; no idempotency or deduplication guarantee is added.
- Data Store lists are capped at 200 records/batches; filters and exact document deep links help narrow inspection.
- Copilot is deterministic graph analysis, not Gemini/OpenAI or general chat. It does not infer guilt. No fake voice or unsupported hypothesis action is present.
- Existing backend graph expansion can include shared-entity cross-case context; production access-control hardening is not claimed by this UI phase.
- Local storage retains the existing configured database/filesystem. Permanent serverless storage, hosted user provisioning and public deployment remain outside this phase.
- Login uses existing provisioned accounts. An authenticated 401 clears the invalid session and returns the protected route to sign-in; no authentication bypass was added.
- Build has a non-fatal large-chunk warning. Backend tests retain the existing Starlette/httpx deprecation warning. Dependency audit reported existing frontend advisories; dependency-wide remediation was not included.

Use the accompanying practical guide for exact hands-on steps.
