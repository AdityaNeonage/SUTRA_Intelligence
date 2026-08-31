# Model directories

- `incoming/`: drop complete, untrusted model bundles here.
- `registered/`: importer-managed accepted bundles.
- `quarantine/`: importer-managed rejected bundles; inspect the recorded reason.

Do not manually copy a bundle from `incoming` to `registered`. Use
`py -3.11 scripts/import_model_bundle.py <bundle-path>` so checksum, health,
schema, and metadata validation occur first.
