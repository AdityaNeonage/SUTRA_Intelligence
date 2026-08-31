"""Load and smoke-test a registered SUTRA model bundle.

Usage:
    py -3.11 scripts/test_model.py <model-id-or-bundle-path>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SCRIPT_ROOT = Path(__file__).resolve().parent
if str(_SCRIPT_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_ROOT))

from model_bundle_common import (
    BundleWorkflowError,
    json_safe,
    resolve_model_reference,
    test_bundle,
    test_result_payload,
)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run manifest, checksum, adapter health, and schema-checked sample inference checks."
    )
    parser.add_argument(
        "model", help="Registered model id or an existing bundle directory path"
    )
    parser.add_argument(
        "--json", action="store_true", help="Print only a JSON result object."
    )
    return parser


def _print_success(payload: dict[str, object], *, as_json: bool) -> None:
    if as_json:
        print(json.dumps(payload, indent=2, sort_keys=True, default=str))
        return
    model = payload["model"]
    health = payload["health"]
    assert isinstance(model, dict)
    assert isinstance(health, dict)
    print(f"PASS: {model['id']} ({model['task']} {model['version']})")
    print(f"Bundle: {payload['bundle_path']}")
    print(f"SHA-256: {payload['checksum']}")
    print(f"Health: {health['message']}")
    print("Sample output:")
    print(
        json.dumps(
            json_safe(payload["sample_output"]), indent=2, sort_keys=True, default=str
        )
    )


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        bundle_path = resolve_model_reference(args.model)
        result = test_bundle(bundle_path)
    except BundleWorkflowError as exc:
        if args.json:
            print(
                json.dumps(
                    {"passed": False, "reason": str(exc)}, indent=2, sort_keys=True
                )
            )
        else:
            print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    payload = test_result_payload(result)
    _print_success(payload, as_json=args.json)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
