"""Validate and register one SUTRA team model bundle.

Usage (from any directory):
    py -3.11 scripts/import_model_bundle.py models/incoming/<bundle-name>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Keep the CLI directly runnable even when the caller's working directory is
# not the repository root.  model_bundle_common repeats the backend bootstrap
# before importing app.model_registry.
_SCRIPT_ROOT = Path(__file__).resolve().parent
if str(_SCRIPT_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_ROOT))

from model_bundle_common import ImportOutcome, import_bundle


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Validate a SUTRA model bundle, run adapter health/sample checks, and move it to "
            "models/registered or models/quarantine."
        )
    )
    parser.add_argument("bundle", help="Path to one incoming model-bundle directory")
    parser.add_argument(
        "--activate",
        action="store_true",
        help="Mark this model active in this command's validation registry record.",
    )
    parser.add_argument(
        "--json", action="store_true", help="Print only a JSON result object."
    )
    return parser


def _print_outcome(outcome: ImportOutcome, *, as_json: bool) -> None:
    payload = outcome.as_dict()
    if as_json:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    if outcome.accepted:
        print(f"ACCEPTED: {outcome.model_id}")
        print(f"Registered bundle: {outcome.final_path}")
        print(f"SHA-256: {outcome.checksum}")
        print(f"Active in validation registry: {outcome.active}")
        return
    print("REJECTED: model bundle was not accepted.", file=sys.stderr)
    print(f"Reason: {outcome.reason}", file=sys.stderr)
    if outcome.final_path:
        print(f"Quarantined bundle: {outcome.final_path}", file=sys.stderr)
    else:
        print(
            "No bundle was moved; inspect the failure record in models/quarantine/.",
            file=sys.stderr,
        )


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    outcome = import_bundle(args.bundle, activate=args.activate)
    _print_outcome(outcome, as_json=args.json)
    return 0 if outcome.accepted else 1


if __name__ == "__main__":
    raise SystemExit(main())
