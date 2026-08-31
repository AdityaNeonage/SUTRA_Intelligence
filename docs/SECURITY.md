# Security and Data-Safety Notes

SUTRA is a prototype for authorized, synthetic, public, anonymized, or otherwise
explicitly supplied data. It does not scrape restricted systems, bypass access
controls, or transmit uploaded evidence to external cloud models by default.

## Prototype controls

- Passwords are hashed; bearer tokens are signed and expire.
- Roles are `ADMIN`, `SUPERVISOR`, `INVESTIGATOR`, `ANALYST`, and `VIEWER`.
- Case access is checked in API services and sensitive values can be masked.
- Uploads are size/type-validated, copied into controlled evidence storage, and
  SHA-256-hashed before processing.
- Structured errors avoid stack traces and secrets; detailed failures are logged
  server-side.
- Audit records retain login, read, upload, export, model, and analyst-feedback
  actions as append-only application events.

## Operational requirements before real deployment

Use a managed secret store, HTTPS, database encryption/backups, centralised
immutable auditing, SSO/Keycloak, malware scanning, retention controls,
penetration testing, and a formal authorization/data-governance process. The
prototype's local storage must not be treated as production evidence custody.
