# Teammate UI integration

The active Vercel service is still `frontend/`; the backend and API routing are unchanged.
Root-level `src/`, `public/` and the teammate's config files are retained as the supplied reference.
Adapted, type-checked components live in `frontend/src/features/teammate/`.
Root `npm run dev`, `build` and `preview` now forward to the integrated frontend.

## Included

- Teammate landing page, logo, purple palette, compact navigation and Copilot artwork.
- Redesigned authenticated shell, login, shared cards/forms/tables and evidence upload treatment.
- New sample workspace with the actual teammate graph, timeline, identity, hotspot map and insights components.
- Live Network renders API entities/edges through the new graph with original identifiers and evidence provenance.
- Live Map & Identity includes the teammate map and identity comparison; the existing linked-evidence map is retained as a separate view.
- Identity review in the sample is local-only. Fake media processing and random AI replies were not imported.

## Prototype boundaries

Map incidents, identity matches and predictive AI examples are synthetic, including when opened after login.
Map tiles require internet access to OpenStreetMap. Live geographic ingestion is not implemented.
Live login, evidence processing, Data Store and Copilot still use the existing backend.
No new generative model or image/audio/video extraction has been added.
The Copilot remains deterministic and evidence-grounded.

## Run

PowerShell terminal 1:

```powershell
cd D:\SIH_2026\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

PowerShell terminal 2:

```powershell
cd D:\SIH_2026\frontend
& 'D:\Nodejs\npm.cmd' run dev
```

Open http://localhost:5173. Use Sample for the teammate demo, or Sign in for stored cases.
If dependencies are missing, run `npm ci` inside `frontend/`.
Keep using your existing backend environment and investigator account; no credentials were changed.

## Manual acceptance checks

1. Home: verify the teammate logo, purple hero, pipeline, responsive header and both entry buttons.
2. Sample: select a graph node; filter/search/zoom; export the sample JSON; play timeline events.
3. Sample map: filter incident severity and category; revisit the map to check remounting.
4. Login: sign in, open Cases, Network, Evidence Hub and Data Store without losing the session.
5. Upload a supported synthetic CSV into a case, process it and open its stored records.
6. Live Network: select a relationship and confirm the WHY panel shows backend evidence IDs.
7. Live Map & Identity: verify synthetic labels and access to the existing linked evidence map.
8. Check at a phone viewport and with keyboard/reduced-motion settings.

This change does not publish a deployment or push to GitHub. Vercel receives it only after your normal commit/push or deployment.
