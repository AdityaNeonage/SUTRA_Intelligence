"""Evidence provenance primitives used throughout the SUTRA pipeline.

The package deliberately contains no database dependency.  Persistence layers can
serialize these dataclasses without changing extraction or analytics behaviour.
"""

from .models import EvidenceStatus, ProvenanceRecord, SourceReference
from .service import ProvenanceService

__all__ = [
    "EvidenceStatus",
    "ProvenanceRecord",
    "ProvenanceService",
    "SourceReference",
]
