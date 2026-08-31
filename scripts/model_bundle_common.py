"""Shared, filesystem-safe helpers for the SUTRA model-bundle CLIs.

The backend registry deliberately remains in-memory and does not move files.
This module is the command-layer boundary: it validates the on-disk bundle,
uses ``app.model_registry`` for adapter validation, and maintains the incoming
-> registered/quarantine lifecycle without making the backend depend on CLI
storage details.

It is intentionally dependency-light so every command can be run directly
with ``py -3.11 scripts/<command>.py`` from any working directory.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
import tempfile
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# A script launched by path gets ``scripts/`` on sys.path, not the repository
# root or ``backend/``.  Resolve from this file rather than the current working
# directory so imports remain safe and predictable in CI and team laptops.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
# Insert the backend before the project root.  This prevents an unrelated
# root-level ``app.py`` from shadowing the real backend application package.
for _import_root in (str(PROJECT_ROOT), str(BACKEND_ROOT)):
    if _import_root not in sys.path:
        sys.path.insert(0, _import_root)

from app.model_registry import (
    ModelBundleImporter,
    ModelManifest,
    ModelRegistry,
)
from app.model_registry.base import (
    ModelHealth,
    ModelTask,
    validate_standard_output,
)

MODELS_ROOT = PROJECT_ROOT / "models"
INCOMING_ROOT = MODELS_ROOT / "incoming"
REGISTERED_ROOT = MODELS_ROOT / "registered"
QUARANTINE_ROOT = MODELS_ROOT / "quarantine"
MANIFEST_NAMES = ("manifest.yaml", "manifest.yml", "manifest.json")
REGISTRATION_SUFFIX = ".sutra-registration.json"
FAILURE_SUFFIX = ".sutra-failure.json"


class BundleWorkflowError(RuntimeError):
    """A user-actionable model-bundle workflow failure."""


@dataclass(frozen=True, slots=True)
class BundleInspection:
    """Validated static bundle information before adapter loading begins."""

    path: Path
    manifest_path: Path
    raw_manifest: Mapping[str, Any]
    manifest: ModelManifest
    checksum: str


@dataclass(frozen=True, slots=True)
class BundleTestResult:
    """The observable adapter checks used by test/evaluate commands."""

    inspection: BundleInspection
    health: ModelHealth
    sample_input: Any
    sample_output: Mapping[str, Any]
    active: bool
    metrics: Mapping[str, Any]


@dataclass(frozen=True, slots=True)
class ImportOutcome:
    """A serialisable final import outcome; accepted is never implicit."""

    accepted: bool
    source_path: Path
    final_path: Path | None = None
    model_id: str | None = None
    checksum: str | None = None
    reason: str | None = None
    active: bool | None = None
    warning: str | None = None

    def as_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "accepted": self.accepted,
            "source_path": str(self.source_path),
            "final_path": str(self.final_path) if self.final_path else None,
            "model_id": self.model_id,
            "checksum": self.checksum,
            "reason": self.reason,
            "active": self.active,
        }
        if self.warning:
            payload["warning"] = self.warning
        return payload


def utc_now() -> str:
    """Return a stable, timezone-aware timestamp for durable sidecars."""

    return datetime.now(timezone.utc).isoformat()


def ensure_model_directories() -> None:
    """Create the three lifecycle directories when a fresh clone lacks them."""

    for directory in (INCOMING_ROOT, REGISTERED_ROOT, QUARANTINE_ROOT):
        directory.mkdir(parents=True, exist_ok=True)


def _is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def resolve_bundle_path(value: str | Path) -> Path:
    """Resolve a supplied path without accepting a dangerous lifecycle root."""

    path = Path(value).expanduser().resolve()
    protected = (
        PROJECT_ROOT,
        MODELS_ROOT,
        INCOMING_ROOT,
        REGISTERED_ROOT,
        QUARANTINE_ROOT,
    )
    if path in protected:
        raise BundleWorkflowError(
            "Refusing to treat a repository or model-lifecycle root as one bundle: "
            f"{path}"
        )
    # An accidental parent directory such as D:\\ or the project parent must
    # never become a move target after validation fails.
    if _is_relative_to(PROJECT_ROOT, path):
        raise BundleWorkflowError(
            f"Refusing a bundle path that contains the repository: {path}"
        )
    return path


def _inside_bundle(bundle: Path, relative_path: str, *, label: str) -> Path:
    """Resolve a declared path and reject path traversal/symlink escapes."""

    if not isinstance(relative_path, str) or not relative_path.strip():
        raise BundleWorkflowError(f"Manifest {label} must be a non-empty relative path")
    candidate = (bundle / relative_path).resolve()
    if not _is_relative_to(candidate, bundle):
        raise BundleWorkflowError(
            f"Manifest {label} must remain inside the model bundle"
        )
    return candidate


def _single_manifest_path(bundle: Path) -> Path:
    manifests = [bundle / name for name in MANIFEST_NAMES if (bundle / name).is_file()]
    if not manifests:
        raise BundleWorkflowError(
            "Bundle has no manifest.yaml, manifest.yml, or manifest.json"
        )
    if len(manifests) > 1:
        names = ", ".join(item.name for item in manifests)
        raise BundleWorkflowError(
            f"Bundle has ambiguous manifests ({names}); keep exactly one"
        )
    manifest = manifests[0]
    if not _is_relative_to(manifest.resolve(), bundle):
        raise BundleWorkflowError("Manifest file must remain inside the model bundle")
    return manifest


def _validate_bundle_tree(bundle: Path) -> None:
    """Reject symlinks that would make a supposedly portable bundle escape itself."""

    try:
        items = bundle.rglob("*")
        for item in items:
            if not _is_relative_to(item.resolve(), bundle):
                raise BundleWorkflowError(
                    f"Bundle contains a path that resolves outside the bundle: {item.relative_to(bundle)}"
                )
    except OSError as exc:
        raise BundleWorkflowError(
            f"Unable to inspect bundle paths safely: {exc}"
        ) from exc


def _read_and_validate_manifest(
    bundle: Path,
) -> tuple[Path, Mapping[str, Any], ModelManifest]:
    manifest_path = _single_manifest_path(bundle)
    try:
        raw = ModelBundleImporter._read_manifest(manifest_path)
    except (
        Exception
    ) as exc:  # YAML and JSON parser errors need a durable failure reason.
        raise BundleWorkflowError(
            f"Unable to parse {manifest_path.name}: {exc}"
        ) from exc
    if not isinstance(raw, Mapping):
        raise BundleWorkflowError("Model manifest must be a mapping/object")
    try:
        manifest = ModelManifest.from_mapping(raw)
    except (TypeError, ValueError) as exc:
        raise BundleWorkflowError(f"Invalid model manifest: {exc}") from exc
    return manifest_path, raw, manifest


def _require_existing_path(
    bundle: Path, value: str, *, label: str, directory: bool | None = None
) -> Path:
    candidate = _inside_bundle(bundle, value, label=label)
    if not candidate.exists():
        raise BundleWorkflowError(f"Required {label} is missing: {value}")
    if directory is True and not candidate.is_dir():
        raise BundleWorkflowError(f"Required {label} must be a directory: {value}")
    if directory is False and not candidate.is_file():
        raise BundleWorkflowError(f"Required {label} must be a file: {value}")
    return candidate


def _validate_declared_file_requirements(
    bundle: Path, raw: Mapping[str, Any], manifest: ModelManifest
) -> None:
    """Validate artifacts promised by a manifest without inventing requirements.

    The backend API makes the entrypoint mandatory for every manifest, and its
    own importer permits rule bundles with an absent artifact.  The team CLI is
    stricter at the filesystem boundary: an entrypoint must exist so a handoff
    can never appear accepted while omitting the promised model directory/file.
    Additional optional fields let teams declare tokenizer/preprocessing/label
    requirements without coupling those concepts to a particular framework.
    """

    # A complete handoff always owns a model directory, even for the
    # deterministic baseline where the adapter does not read weight files.
    # This prevents accepting a manifest-only folder as a transferable bundle.
    _require_existing_path(bundle, "model", label="model directory", directory=True)
    _require_existing_path(bundle, manifest.entrypoint, label="entrypoint")

    if manifest.metrics_file:
        _require_existing_path(
            bundle, manifest.metrics_file, label="metrics_file", directory=False
        )

    for field_name in ("required_files", "files_required"):
        declared = raw.get(field_name)
        if declared is None:
            continue
        if isinstance(declared, str) or not isinstance(declared, Sequence):
            raise BundleWorkflowError(
                f"Manifest {field_name} must be a list of relative file paths"
            )
        for item in declared:
            if not isinstance(item, str):
                raise BundleWorkflowError(
                    f"Manifest {field_name} must contain only strings"
                )
            _require_existing_path(bundle, item, label=f"{field_name} item")

    for field_name in ("required_directories", "directories_required"):
        declared = raw.get(field_name)
        if declared is None:
            continue
        if isinstance(declared, str) or not isinstance(declared, Sequence):
            raise BundleWorkflowError(
                f"Manifest {field_name} must be a list of relative directory paths"
            )
        for item in declared:
            if not isinstance(item, str):
                raise BundleWorkflowError(
                    f"Manifest {field_name} must contain only strings"
                )
            _require_existing_path(
                bundle, item, label=f"{field_name} item", directory=True
            )

    conditional_paths = {
        "requires_tokenizer": ("tokenizer", True),
        "tokenizer_required": ("tokenizer", True),
        "requires_label_map": ("label_map.json", False),
        "label_map_required": ("label_map.json", False),
        "requires_preprocessing": ("preprocessing.json", False),
        "preprocessing_required": ("preprocessing.json", False),
        "readme_required": ("README.md", False),
    }
    for flag, (expected_path, directory) in conditional_paths.items():
        if raw.get(flag) is True:
            _require_existing_path(
                bundle, expected_path, label=flag, directory=directory
            )

    explicit_file_fields = {
        "tokenizer_path": True,
        "label_map_file": False,
        "preprocessing_file": False,
        "readme_file": False,
    }
    for field_name, directory in explicit_file_fields.items():
        declared = raw.get(field_name)
        if declared is None:
            continue
        if not isinstance(declared, str):
            raise BundleWorkflowError(
                f"Manifest {field_name} must be a relative path string"
            )
        _require_existing_path(bundle, declared, label=field_name, directory=directory)


def _validate_declared_checksums(bundle: Path, raw: Mapping[str, Any]) -> None:
    """Optionally verify per-artifact SHA-256 digests declared by a team.

    The canonical recursive bundle checksum is always calculated by
    ``ModelBundleImporter.checksum``.  A full-bundle digest cannot safely live
    inside a manifest (it would hash itself), so this optional mapping is for
    externally supplied artifact integrity checks only.
    """

    declared = raw.get("checksums")
    if declared is None:
        return
    if not isinstance(declared, Mapping):
        raise BundleWorkflowError(
            "Manifest checksums must be an object mapping paths to SHA-256 values"
        )
    for relative_path, expected in declared.items():
        if not isinstance(relative_path, str) or not isinstance(expected, str):
            raise BundleWorkflowError(
                "Manifest checksums must map string paths to string SHA-256 values"
            )
        normalized = expected.casefold()
        if len(normalized) != 64 or any(
            char not in "0123456789abcdef" for char in normalized
        ):
            raise BundleWorkflowError(
                f"Invalid SHA-256 value declared for {relative_path}"
            )
        file_path = _require_existing_path(
            bundle, relative_path, label="checksums item", directory=False
        )
        digest = hashlib.sha256()
        with file_path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        if digest.hexdigest() != normalized:
            raise BundleWorkflowError(
                f"Checksum mismatch for declared artifact: {relative_path}"
            )


def _validate_declared_output_schema(manifest: ModelManifest) -> None:
    """Reject a task/schema pairing that cannot match SUTRA's concrete contracts."""

    expected = {
        ModelTask.NER: "sutra-ner-v1",
        ModelTask.RELATION_EXTRACTION: "sutra-relation-v1",
    }.get(manifest.task)
    if expected and manifest.output_schema.casefold() != expected:
        raise BundleWorkflowError(
            f"Task '{manifest.task.value}' must declare output_schema '{expected}', "
            f"not '{manifest.output_schema}'"
        )


def inspect_bundle(bundle_value: str | Path) -> BundleInspection:
    """Perform deterministic static checks before an adapter is constructed."""

    path = resolve_bundle_path(bundle_value)
    if not path.is_dir():
        raise BundleWorkflowError("Model bundle path is not a directory")
    _validate_bundle_tree(path)
    manifest_path, raw, manifest = _read_and_validate_manifest(path)
    _validate_declared_file_requirements(path, raw, manifest)
    _validate_declared_checksums(path, raw)
    _validate_declared_output_schema(manifest)
    try:
        checksum = ModelBundleImporter.checksum(path)
    except OSError as exc:
        raise BundleWorkflowError(
            f"Unable to calculate bundle checksum: {exc}"
        ) from exc
    return BundleInspection(path, manifest_path, raw, manifest, checksum)


def _validate_sample_output(manifest: ModelManifest, output: Mapping[str, Any]) -> None:
    """Apply backend standard validation plus the documented similarity contract."""

    if not isinstance(output, Mapping):
        raise BundleWorkflowError("Sample inference did not return an object/mapping")
    try:
        validate_standard_output(manifest.task, output)
    except (TypeError, ValueError, RuntimeError) as exc:
        raise BundleWorkflowError(
            f"Sample output violates the declared schema: {exc}"
        ) from exc

    if manifest.task is ModelTask.CASE_SIMILARITY:
        required = ("case_a", "case_b", "similarity", "reasons")
        missing = [field for field in required if field not in output]
        if missing:
            raise BundleWorkflowError(
                "Case-similarity output is missing required field(s): "
                + ", ".join(missing)
            )
        similarity = output["similarity"]
        reasons = output["reasons"]
        if (
            isinstance(similarity, bool)
            or not isinstance(similarity, (int, float))
            or not 0 <= float(similarity) <= 1
        ):
            raise BundleWorkflowError(
                "Case-similarity output must contain a similarity value in [0, 1]"
            )
        if isinstance(reasons, str) or not isinstance(reasons, Sequence) or not reasons:
            raise BundleWorkflowError(
                "Case-similarity output must contain a non-empty reasons list"
            )


def test_bundle(
    bundle_value: str | Path, *, activate: bool = False
) -> BundleTestResult:
    """Load a bundle through the backend API and expose health/sample evidence."""

    inspection = inspect_bundle(bundle_value)
    registry = ModelRegistry()
    importer = ModelBundleImporter(registry)
    try:
        result = importer.import_bundle(inspection.path, activate=activate)
    except Exception as exc:
        raise BundleWorkflowError(f"Model adapter validation failed: {exc}") from exc
    if not result.accepted:
        raise BundleWorkflowError(result.reason or "Model registry rejected the bundle")
    if result.checksum != inspection.checksum:
        raise BundleWorkflowError(
            "Bundle contents changed during validation; checksum changed before registration completed"
        )

    adapter = registry.active(inspection.manifest.task)
    if adapter is None:
        raise BundleWorkflowError(
            "Registry accepted the model but did not activate an adapter for its task"
        )
    try:
        health = adapter.health_check()
        if not health.healthy:
            raise BundleWorkflowError(
                f"Model health check failed after registration: {health.message}"
            )
        sample_input = ModelBundleImporter._sample_input(inspection.manifest.task)
        sample_output = adapter.predict(sample_input)
        _validate_sample_output(inspection.manifest, sample_output)
    except BundleWorkflowError:
        raise
    except Exception as exc:
        raise BundleWorkflowError(f"Model sample inference failed: {exc}") from exc

    metrics: Mapping[str, Any] = {}
    if result.registered is not None:
        metrics = result.registered.metadata.metrics
    return BundleTestResult(
        inspection=inspection,
        health=health,
        sample_input=sample_input,
        sample_output=sample_output,
        active=bool(result.registered and result.registered.active),
        metrics=metrics,
    )


def _destination_for(source: Path, destination_root: Path) -> Path:
    """Pick a non-overwriting destination under a lifecycle directory."""

    if source.parent == destination_root:
        return source
    stem = source.name or "model-bundle"
    candidate = destination_root / stem
    suffix = 1
    while candidate.exists():
        candidate = destination_root / f"{stem}-{suffix}"
        suffix += 1
    return candidate


def _move_bundle(source: Path, destination_root: Path) -> Path:
    """Move exactly one checked bundle, preferring an atomic same-volume rename."""

    ensure_model_directories()
    if not source.exists():
        raise BundleWorkflowError(f"Cannot move a missing bundle: {source}")
    destination = _destination_for(source, destination_root)
    if destination == source:
        return source
    try:
        # Path.replace is an atomic rename on the normal same-volume workflow.
        source.replace(destination)
    except OSError:
        try:
            shutil.move(str(source), str(destination))
        except (OSError, shutil.Error) as exc:
            raise BundleWorkflowError(
                f"Unable to move bundle to {destination_root.name}: {exc}"
            ) from exc
    return destination


def _write_json_atomic(path: Path, payload: Mapping[str, Any]) -> None:
    """Durably write sidecar state without putting it inside the hashed bundle."""

    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent, text=True
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True, default=str)
            handle.write("\n")
        temporary.replace(path)
    except Exception:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass
        raise


def _sidecar_path(bundle_path: Path, suffix: str) -> Path:
    return bundle_path.parent / f"{bundle_path.name}{suffix}"


def _metadata_record(test_result: BundleTestResult, final_path: Path) -> dict[str, Any]:
    manifest = test_result.inspection.manifest
    return {
        "status": "registered",
        "registered_at": utc_now(),
        "bundle_path": str(final_path),
        "manifest_file": test_result.inspection.manifest_path.name,
        "checksum": test_result.inspection.checksum,
        "model": {
            "id": manifest.model_id,
            "name": manifest.name,
            "version": manifest.version,
            "task": manifest.task.value,
            "framework": manifest.framework,
            "languages": list(manifest.languages),
            "input_schema": manifest.input_schema,
            "output_schema": manifest.output_schema,
            "priority": manifest.priority,
            "source": manifest.source,
            "license": manifest.license,
        },
        "active_in_validation_registry": test_result.active,
        "health": {
            "healthy": test_result.health.healthy,
            "message": test_result.health.message,
            "details": dict(test_result.health.details),
        },
        "metrics": dict(test_result.metrics),
    }


def _registered_bundle_for_id(
    model_id: str, *, exclude: Path | None = None
) -> Path | None:
    """Find one valid manifest with a matching id without loading every model."""

    if not REGISTERED_ROOT.is_dir():
        return None
    found: list[Path] = []
    for candidate in sorted(
        REGISTERED_ROOT.iterdir(), key=lambda item: item.name.casefold()
    ):
        if not candidate.is_dir() or candidate == exclude:
            continue
        try:
            _, _, manifest = _read_and_validate_manifest(candidate)
        except BundleWorkflowError:
            # A pre-existing malformed folder must not stop a new bundle from
            # being rejected/recorded with the actual reason.
            continue
        if manifest.model_id == model_id:
            found.append(candidate)
    if len(found) > 1:
        rendered = ", ".join(str(item) for item in found)
        raise BundleWorkflowError(
            f"More than one registered bundle has id '{model_id}': {rendered}"
        )
    return found[0] if found else None


def _quarantine_after_failure(source: Path, reason: str) -> Path | None:
    """Best-effort lifecycle move plus a durable explicit failure record."""

    ensure_model_directories()
    final_path: Path | None = None
    move_error: str | None = None
    try:
        # Do not turn a malformed CLI argument such as the repository root into
        # a destructive move.  ``resolve_bundle_path`` performs this guard, but
        # this second check protects exceptions raised before normal inspection.
        guarded = resolve_bundle_path(source)
        if guarded.exists():
            final_path = _move_bundle(guarded, QUARANTINE_ROOT)
    # Preserve a lifecycle failure as an explicit import rejection, even when
    # an unexpected filesystem/provider implementation raises it.
    except Exception as exc:  # noqa: BLE001
        move_error = str(exc)

    record_target = (
        _sidecar_path(final_path, FAILURE_SUFFIX)
        if final_path
        else (
            QUARANTINE_ROOT
            / f"rejected-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}{FAILURE_SUFFIX}"
        )
    )
    payload: dict[str, Any] = {
        "status": "quarantined",
        "failed_at": utc_now(),
        "source_path": str(source),
        "quarantined_path": str(final_path) if final_path else None,
        "reason": reason,
    }
    if move_error:
        payload["move_error"] = move_error
    try:
        _write_json_atomic(record_target, payload)
    except OSError as exc:
        # The caller still receives the original validation failure and a clear
        # warning that durable recording needs attention.
        if move_error:
            move_error = f"{move_error}; failure record error: {exc}"
        else:
            move_error = f"failure record error: {exc}"
    if move_error:
        raise BundleWorkflowError(
            f"{reason} (bundle quarantine/recording also needs attention: {move_error})"
        )
    return final_path


def import_bundle(bundle_value: str | Path, *, activate: bool = False) -> ImportOutcome:
    """Validate, register, and move a bundle; failures always report/quarantine."""

    source = Path(bundle_value).expanduser().resolve()
    try:
        inspection = inspect_bundle(source)
        duplicate = _registered_bundle_for_id(
            inspection.manifest.model_id, exclude=inspection.path
        )
        if duplicate is not None:
            raise BundleWorkflowError(
                f"Model id '{inspection.manifest.model_id}' is already registered at {duplicate}; "
                "use a new stable model id/version bundle"
            )
        tested = test_bundle(inspection.path, activate=activate)
        try:
            final_checksum = ModelBundleImporter.checksum(inspection.path)
        except OSError as exc:
            raise BundleWorkflowError(
                f"Unable to verify bundle checksum before move: {exc}"
            ) from exc
        if final_checksum != tested.inspection.checksum:
            raise BundleWorkflowError(
                "Bundle contents changed after health/sample validation; refusing to register it"
            )
        final_path = _move_bundle(inspection.path, REGISTERED_ROOT)
        try:
            _write_json_atomic(
                _sidecar_path(final_path, REGISTRATION_SUFFIX),
                _metadata_record(tested, final_path),
            )
        except OSError as exc:
            # A moved bundle with no durable registration record must not remain
            # accepted.  Move it to quarantine and return an explicit failure.
            reason = f"Registration metadata could not be recorded: {exc}"
            quarantined = _quarantine_after_failure(final_path, reason)
            return ImportOutcome(False, source, quarantined, reason=reason)
        return ImportOutcome(
            True,
            source,
            final_path,
            model_id=tested.inspection.manifest.model_id,
            checksum=tested.inspection.checksum,
            active=tested.active,
        )
    # An arbitrary third-party adapter failure must never turn into acceptance.
    except Exception as exc:  # noqa: BLE001
        reason = str(exc) or exc.__class__.__name__
        try:
            quarantined = _quarantine_after_failure(source, reason)
        # Preserve the original rejection even if its best-effort quarantine fails.
        except Exception as quarantine_exc:  # noqa: BLE001
            return ImportOutcome(
                False,
                source,
                reason=f"{reason}; quarantine failed: {quarantine_exc}",
            )
        return ImportOutcome(False, source, quarantined, reason=reason)


def find_registered_bundle(model_id: str) -> Path:
    """Resolve an id to exactly one registered bundle or raise a clear error."""

    if not model_id.strip():
        raise BundleWorkflowError("Model id must not be empty")
    match = _registered_bundle_for_id(model_id)
    if match is None:
        raise BundleWorkflowError(
            f"No registered model bundle has id '{model_id}'. "
            f"Import it first or pass an existing bundle directory path."
        )
    return match


def resolve_model_reference(value: str | Path) -> Path:
    """Accept an existing bundle path, otherwise resolve a registered model id."""

    candidate = Path(value).expanduser()
    if candidate.exists():
        return resolve_bundle_path(candidate)
    return find_registered_bundle(str(value))


def json_safe(value: Any) -> Any:
    """Convert common adapter outputs to JSON-friendly values without mutation."""

    if isinstance(value, Mapping):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [json_safe(item) for item in value]
    return str(value)


def test_result_payload(result: BundleTestResult) -> dict[str, Any]:
    """Produce stable human/API-readable test output for both command clients."""

    manifest = result.inspection.manifest
    return {
        "passed": True,
        "bundle_path": str(result.inspection.path),
        "checksum": result.inspection.checksum,
        "model": {
            "id": manifest.model_id,
            "name": manifest.name,
            "version": manifest.version,
            "task": manifest.task.value,
            "framework": manifest.framework,
            "output_schema": manifest.output_schema,
        },
        "active_in_validation_registry": result.active,
        "health": {
            "healthy": result.health.healthy,
            "message": result.health.message,
            "details": json_safe(result.health.details),
        },
        "sample_input": json_safe(result.sample_input),
        "sample_output": json_safe(result.sample_output),
    }
