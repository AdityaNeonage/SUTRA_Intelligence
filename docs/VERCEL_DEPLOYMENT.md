# SUTRA unified Vercel deployment

## What runs where

SUTRA is one Vercel project with two independently built services behind one
public domain:

```text
Browser
  |-- /, /dashboard, /live/*  -> React + Vite frontend
  `-- /api/*, /health         -> Python + FastAPI backend
                                      |
                                      `-- PostgreSQL (persistent data)
```

The browser deliberately uses relative `/api` URLs. Preview and production
deployments therefore call their own backend without a hard-coded hostname,
CORS workaround, ngrok tunnel, or separately managed API URL.

## One-time Vercel setup

Run these commands from `D:\SIH_2026`:

```powershell
npx vercel@latest login
npx vercel@latest link
```

When `link` asks, choose your Vercel scope and create or select the SUTRA
project. Keep the Vercel Root Directory at the repository root, because
`vercel.json` owns both sub-applications.

In the Vercel dashboard open **Project Settings > Build and Deployment** and set
**Framework Preset** to **Services**. Both the Framework Preset and the
`services` block in `vercel.json` are required.

## Persistent database

For a public app, open the project's **Storage** tab and connect a PostgreSQL
provider such as Neon. Make sure its connection string is exposed as
`DATABASE_URL` for Production, Preview, and Development. SUTRA automatically
converts ordinary `postgres://` and `postgresql://` URLs to the installed
psycopg v3 driver.

Without `DATABASE_URL`, SUTRA can still start using `/tmp/sutra.db`, but that
database is temporary and may reset whenever Vercel replaces a function
instance. This fallback is useful only for a quick preview.

## Environment variables

In **Project Settings > Environment Variables**, add these values to Production
and Preview:

| Variable | Required value |
| --- | --- |
| `SUTRA_JWT_SECRET` | A long random secret; never commit it |
| `SUTRA_ENVIRONMENT` | `production` |
| `SUTRA_SEED_DEMO_USER` | `true` for the SIH demo |
| `SUTRA_DEMO_USER_EMAIL` | The administrator email you will use |
| `SUTRA_DEMO_USER_PASSWORD` | A strong password you will use |
| `SUTRA_SEED_DEMO_DATA` | `true` to initialize the fictional dataset automatically |
| `DATABASE_URL` | Supplied by the connected PostgreSQL provider |

Generate a suitable JWT secret locally:

```powershell
py -3.11 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Paste only the generated value into Vercel. Do not paste the secret into source
files or commit it to Git.

## Deploy

Create a preview deployment first:

```powershell
npx vercel@latest deploy
```

After checking the preview, publish production:

```powershell
npx vercel@latest deploy --prod
```

Vercel prints the public URL. Anyone on any network can open that URL; your
laptop and local development servers do not need to remain running.

## Operate the deployed app

1. Open the Vercel URL. **Explore Platform** opens the polished, deterministic
   frontend experience without a backend login.
2. Select **Backend sign in** to use the actual FastAPI service and database.
3. Sign in with `SUTRA_DEMO_USER_EMAIL` and `SUTRA_DEMO_USER_PASSWORD`.
4. The live dashboard reads cases from PostgreSQL. If automatic seeding is off
   and the database is empty, select **Load demo data** as an administrator.
5. Use **Live Cases**, **Live Network**, **Live Analytics**, and **System Health**
   to query backend data. The graph's relationship panel preserves evidence
   status, confidence, derivation, and supporting-record identifiers.

Useful checks:

```text
https://YOUR-DOMAIN.vercel.app/health
https://YOUR-DOMAIN.vercel.app/api/system/health
https://YOUR-DOMAIN.vercel.app/docs
```

The deployment routes `/docs`, `/redoc`, and `/openapi.json` to FastAPI, so the
interactive API reference remains available alongside the web application.

## Updating production

If Vercel is connected to the GitHub repository, every push creates a Preview
deployment and pushes to the production branch create Production deployments.
For a manual production update from this machine:

```powershell
Set-Location D:\SIH_2026
npx vercel@latest deploy --prod
```

Use the Vercel dashboard's **Deployments** page to inspect build logs, function
logs, environment configuration, and previous deployments available for
rollback.
