"""Report measured metrics shipped with a registered SUTRA model bundle.

The command never invents a score: it validates and reloads the model, then
reports the JSON metrics included in its bundle.  A labelled external evaluator
can be added later without changing the import/adapter contract.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

_SCRIPT_ROOT = Path(__file__).resolve().parent
if str(_SCRIPT_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_ROOT))

from model_bundle_common import (
    BundleWorkflowError,
    json_safe,
    resolve_model_reference,
    test_bundle,
)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate a registered model and report its supplied, measured evaluation metrics."
    )
    parser.add_argument(
        "--model",
        required=True,
        help="Registered model id or an existing bundle directory",
    )
    parser.add_argument(
        "--json", action="store_true", help="Print only a JSON result object."
    )
    return parser


def _payload(result: Any) -> dict[str, Any]:
    manifest = result.inspection.manifest
    metrics = dict(result.metrics)
    status = metrics.get("evaluation_status")
    unmeasured_statuses = {"not_measured", "not_available", "pending", "template_only"}
    has_measured_result = bool(metrics) and not (
        isinstance(status, str) and status.casefold() in unmeasured_statuses
    )
    return {
        "evaluated": has_measured_result,
        "evaluation_mode": "reported_bundle_metrics",
        "note": (
            "Metrics are reported exactly as supplied by the bundle; this command does not "
            "fabricate evaluation scores."
            if has_measured_result
            else "No measured evaluation result is available in this bundle, so no score was calculated."
        ),
        "bundle_path": str(result.inspection.path),
        "checksum": result.inspection.checksum,
        "model": {
            "id": manifest.model_id,
            "name": manifest.name,
            "version": manifest.version,
            "task": manifest.task.value,
            "framework": manifest.framework,
        },
        "metrics_file": manifest.metrics_file,
        "metrics": json_safe(metrics),
        "health": {"healthy": result.health.healthy, "message": result.health.message},
    }


def _print_payload(payload: dict[str, Any], *, as_json: bool) -> None:
    if as_json:
        print(json.dumps(payload, indent=2, sort_keys=True, default=str))
        return
    model = payload["model"]
    assert isinstance(model, dict)
    print(f"MODEL: {model['id']} ({model['task']} {model['version']})")
    print(f"Bundle: {payload['bundle_path']}")
    print(f"SHA-256: {payload['checksum']}")
    print(f"Evaluation mode: {payload['evaluation_mode']}")
    print(payload["note"])
    print("Metrics:")
    print(json.dumps(payload["metrics"], indent=2, sort_keys=True, default=str))


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        bundle_path = resolve_model_reference(args.model)
        result = test_bundle(bundle_path)
    except BundleWorkflowError as exc:
        if args.json:
            print(
                json.dumps(
                    {"evaluated": False, "reason": str(exc)}, indent=2, sort_keys=True
                )
            )
        else:
            print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    payload = _payload(result)
    _print_payload(payload, as_json=args.json)
    # A transparent "not measured" report is still a successful command; it
    # must not be represented as a synthetic failed/zero score.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
