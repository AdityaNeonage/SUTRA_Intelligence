# Report B — use the prototype

The local frontend is http://127.0.0.1:5173. The API is http://127.0.0.1:8000.
These are local prototype addresses, not a public deployment.
Login uses your existing account. The documented local-only demo account is in README.md, lines 60–61. Do not use demo credentials on a public deployment.

## Practical 1 — upload your first evidence file (REAL BACKEND)

The data in this exercise is fictional; processing and database storage are real.

1. Open http://127.0.0.1:5173/login and sign in.
2. Open Live Cases and select PRACTICE-001 — Money trail - prototype practice. This empty training case was created for you in the local database.
3. Click Upload Evidence.
4. Select D:\SIH_2026\prototype-transfers.csv. It contains two fictional transfers.
5. Optionally select Bank record as the source classification. This labels the receipt; parsing follows the file contents.
6. Click Process evidence and keep the page open. Check the individual file's completed state.
7. Click View records. Data Store opens the correct case and upload batch. You should see two stored records, the receipt and SHA-256 hash.
8. Inspect a record to read its stored source content.
9. Open Live Network and select PRACTICE-001. You should see DEMO-A → DEMO-B → DEMO-C: three accounts and two transfer relationships.
10. Click a relationship to inspect its Why panel.

You have now turned a file on your PC into database records and an inspectable graph. The graph shows reported transfers, not proof of fraud.

More files: the same intake is available in Evidence Upload. CSV, JSON, TXT, Markdown, text-based PDF and DOCX are supported. XLSX is explicitly unsupported: export CSV instead. Files are limited to 25 MB each. Remove mistaken selections before processing. A failed file does not stop the next file. Retry re-queues a failed file; click Process evidence again. A retry creates a new batch, so inspect Data Store before retrying a timed-out request.

## Practical 2 — investigate a location (SYNTHETIC DEMO)

1. Open http://127.0.0.1:5173/fusion without login.
2. Keep Investigation Map selected and choose CASE-104.
3. Pan the map or use its + / − zoom controls.
4. Click a marker. Read the event, entity, time, source and source confidence in Evidence details.
5. The corresponding entity is highlighted in the adjacent graph. Selecting an entity also highlights its related map events.
6. Try Event type and From/To date filters, then Reset filters.
7. Click Open evidence to inspect the cited sample record, or Show network entity to open the full explorer.

All coordinates are explicitly illustrative, not GPS extracted from the source documents. Basemap tiles need internet. The other fusion tabs retain their labelled sample workflows.

## Practical 3 — ask the copilot (REAL BACKEND)

Complete Practical 1 first.

1. Open SUTRA Copilot in the live sidebar.
2. Select PRACTICE-001.
3. Choose DEMO-B under Stored entity.
4. Ask: Why is DEMO-B important?
5. Click Ask Copilot.
6. Read the answer and limitations. It comes from stored graph relationships and deterministic graph analysis, not an external LLM.
7. Inspect the returned evidence references. Open source record navigates to the actual stored document.
8. Show graph context opens the selected case network. Open case timeline opens its reported activity.

Missing evidence is reported as missing; the app does not invent a source.

## Practical 4 — trace the transfer path (REAL BACKEND)

1. Open the live Copilot and select PRACTICE-001.
2. Set Stored entity to Match names from the question.
3. Ask: Show the path between DEMO-A and DEMO-C.
4. Inspect the returned path and its two source relationships.
5. Use the entity buttons to open graph context. In Live Network, select the transfer links to read their provenance.
6. Use Open case timeline to inspect the activity dates.

This checks connectivity. It does not establish chronological money tracing, ownership, intent or illegality.

For the larger existing example, upload accounts.csv then transactions.csv into a separate authorised case. The supplied role/is_fraud fields are synthetic evaluation labels, not AI discoveries.

## Practical 5 — explore without an account (SYNTHETIC DEMO)

1. Open http://127.0.0.1:5173/.
2. Click Open Sample Investigation to enter the sample case.
3. See How It Works scrolls to the landing-page workflow.
4. Explore Cases, Network Explorer, Intelligence Fusion Center and evidence sources.
5. Open AI Assistant, click Use sample statement, then Review statement.
6. Apply sample proposal & open graph explicitly adds the fixed demo proposal to browser session state.
7. Upload Evidence on a public case displays the authentication notice. Open live console takes you to real login; public screens do not persist uploads.

## Restart after closing

Run these in two separate PowerShell terminals. Keep both running.

Backend:

```powershell
Set-Location D:\SIH_2026
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
Set-Location D:\SIH_2026\frontend
& 'D:\Nodejs\npm.cmd' run dev -- --host 127.0.0.1
```

Then open http://127.0.0.1:5173. Ctrl+C in each terminal stops its server. The configured local database retains stored evidence across ordinary restarts. This phase does not solve permanent hosted storage or public deployment.
