"""Create a deterministic, evidence-rich fictional SUTRA demonstration graph.

The fixture intentionally encodes ground truth separately from what an analyst
sees.  It is not a claim about real people or a source of law-enforcement data.
The small showcase profile is designed for a fast first run; callers can request
additional filler records for scale testing without changing the key scenarios.
"""

from __future__ import annotations

import json
import random
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

EvidenceStatus = Literal["VERIFIED", "INFERRED", "HYPOTHESIS"]


@dataclass(frozen=True, slots=True)
class DemoCase:
    case_number: str
    title: str
    description: str
    priority: str = "high"
    classification: str = "restricted"


@dataclass(frozen=True, slots=True)
class DemoEntity:
    key: str
    entity_type: str
    label: str
    case_numbers: tuple[str, ...]
    aliases: tuple[str, ...] = ()
    attributes: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.95


@dataclass(frozen=True, slots=True)
class DemoRelationship:
    key: str
    source_key: str
    target_key: str
    predicate: str
    case_number: str | None
    evidence_status: EvidenceStatus
    confidence: float
    derivation: str
    evidence_text: str
    source_record_id: str
    occurred_at: str
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class DemoDocument:
    document_id: str
    filename: str
    case_number: str
    source_type: str
    content: str


@dataclass(frozen=True, slots=True)
class DemoBundle:
    cases: tuple[DemoCase, ...]
    entities: tuple[DemoEntity, ...]
    relationships: tuple[DemoRelationship, ...]
    documents: tuple[DemoDocument, ...]
    ground_truth: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "cases": [asdict(item) for item in self.cases],
            "entities": [asdict(item) for item in self.entities],
            "relationships": [asdict(item) for item in self.relationships],
            "documents": [asdict(item) for item in self.documents],
            "ground_truth": self.ground_truth,
        }


def _at(day: int, hour: int = 10) -> str:
    return (datetime(2026, 5, 1, tzinfo=timezone.utc) + timedelta(days=day, hours=hour)).isoformat()


def build_demo_bundle(*, seed: int = 2026, additional_people: int = 0) -> DemoBundle:
    """Return the reproducible five-case scenario used by the web demo.

    ``additional_people`` is deliberately optional and only adds disconnected
    synthetic noise nodes, letting performance tests scale without diluting the
    visible instructional scenarios.
    """

    cases = (
        DemoCase(
            "SUTRA-CY-001",
            "Online marketplace payment complaint",
            "A fictional complainant reported a payment request routed through a phone, UPI and bank account.",
            "critical",
        ),
        DemoCase(
            "SUTRA-ORG-002",
            "Interstate logistics coordination review",
            "Fictional records describe coordination around a vehicle, phones and a shared device.",
        ),
        DemoCase(
            "SUTRA-FIN-003",
            "Beneficiary-pattern analytical review",
            "Synthetic transaction records show repeated pass-through activity requiring analyst review.",
            "critical",
        ),
        DemoCase(
            "SUTRA-XC-004",
            "Separate payment complaint with shared infrastructure",
            "An apparently separate fictional report contains an identifier linked by evidence to another case.",
        ),
        DemoCase(
            "SUTRA-LOC-005",
            "Vehicle sighting and location correlation",
            "Fictional location reports connect a vehicle, device and organisation.",
            "medium",
        ),
    )

    cy, org, fin, cross, loc = (case.case_number for case in cases)
    entities: list[DemoEntity] = [
        DemoEntity("case_cy", "Case", cy, (cy,)),
        DemoEntity("case_org", "Case", org, (org,)),
        DemoEntity("case_fin", "Case", fin, (fin,)),
        DemoEntity("case_cross", "Case", cross, (cross,)),
        DemoEntity("case_loc", "Case", loc, (loc,)),
        DemoEntity("victim_nila", "Person", "Nila Basu", (cy,), attributes={"role": "complainant"}),
        DemoEntity("victim_phone", "Phone", "+91 90000 11001", (cy,)),
        DemoEntity("fraud_contact", "Phone", "+91 98888 23001", (cy, cross)),
        DemoEntity("fraud_upi", "UPI", "brightcart@upi", (cy, cross)),
        DemoEntity("entry_account", "BankAccount", "AC-2041-AX", (cy, fin, cross)),
        DemoEntity("mule_account", "BankAccount", "AC-7740-MU", (cy, fin)),
        DemoEntity("settlement_account", "BankAccount", "AC-3359-ST", (fin,)),
        DemoEntity("shared_device", "Device", "IMEI-356789104321998", (cy, org, cross, loc)),
        DemoEntity(
            "bridge_aarav",
            "Person",
            "Aarav Sen",
            (cy, org, fin, cross, loc),
            aliases=("A. Sen",),
            attributes={"address": "Fictional 17 Lotus Lane, Kolkata"},
        ),
        DemoEntity(
            "duplicate_aarav",
            "Person",
            "Aarav Kumar Sen",
            (org,),
            aliases=("Aarav Sen"),
            attributes={"address": "Fictional 17 Lotus Lane, Kolkata", "resolution_candidate": True},
            confidence=0.78,
        ),
        DemoEntity("aarav_phone", "Phone", "+91 97777 41002", (org, loc)),
        DemoEntity("meera", "Person", "Meera Dutta", (org, loc)),
        DemoEntity("dev", "Person", "Dev Arora", (org, fin)),
        DemoEntity("org_phone", "Phone", "+91 93333 62008", (org,)),
        DemoEntity("vehicle", "Vehicle", "WB-19-Q-4820", (org, loc)),
        DemoEntity("warehouse", "Location", "Fictional East Yard, Kolkata", (org, loc)),
        DemoEntity("logistics_org", "Organisation", "Fictional Meridian Logistics", (org, loc)),
        DemoEntity("victim_rohan", "Person", "Rohan Iyer", (cross,), attributes={"role": "complainant"}),
        DemoEntity("rohan_phone", "Phone", "+91 91111 82004", (cross,)),
        DemoEntity("analyst_location", "Location", "Fictional Riverfront ATM, Bhubaneswar", (fin,)),
        DemoEntity("txn_device", "Device", "IMEI-353123119008411", (fin,)),
    ]

    relationship_specs = [
        ("r01", "victim_nila", "case_cy", "INVOLVED_IN", cy, "VERIFIED", .99, "Fictional complaint record", "Nila Basu is the named complainant.", "FIR-CY-001", 0),
        ("r02", "victim_nila", "victim_phone", "USES", cy, "VERIFIED", .99, "Fictional complaint record", "Complainant supplied contact number +91 90000 11001.", "FIR-CY-001", 0),
        ("r03", "victim_phone", "fraud_contact", "CALLS", cy, "VERIFIED", .97, "Synthetic CDR record", "Outgoing contact before the payment request.", "CDR-CY-210", 1),
        ("r04", "fraud_contact", "fraud_upi", "USES", cy, "VERIFIED", .94, "Payment instruction in supplied report", "The requested payment identifier was brightcart@upi.", "FIR-CY-001", 1),
        ("r05", "fraud_upi", "entry_account", "REGISTERED_TO", cy, "VERIFIED", .96, "Synthetic payment directory record", "UPI settlement record maps to AC-2041-AX.", "PAY-CY-017", 1),
        ("r06", "entry_account", "mule_account", "TRANSFERRED_TO", cy, "VERIFIED", .98, "Synthetic transaction record", "₹48,000 transferred after the complaint payment.", "TXN-CY-042", 2, {"amount": 48000, "currency": "INR"}),
        ("r07", "mule_account", "shared_device", "USES", cy, "VERIFIED", .91, "Synthetic device-login record", "Mule account session used IMEI-356789104321998.", "DEV-CY-031", 2),
        ("r08", "shared_device", "bridge_aarav", "ASSOCIATED_WITH", cy, "INFERRED", .87, "Multi-record corroboration v1", "Shared device session and repeated phone proximity support a review lead.", "DER-CY-004", 3),
        ("r09", "meera", "case_org", "INVOLVED_IN", org, "VERIFIED", .95, "Synthetic field report", "Meera Dutta appears in a supplied logistics report.", "RPT-ORG-018", 5),
        ("r10", "dev", "case_org", "INVOLVED_IN", org, "VERIFIED", .95, "Synthetic field report", "Dev Arora appears in a supplied logistics report.", "RPT-ORG-018", 5),
        ("r11", "bridge_aarav", "org_phone", "USES", org, "VERIFIED", .93, "Synthetic CDR record", "Aarav Sen used +91 93333 62008 in a case-linked record.", "CDR-ORG-119", 6),
        ("r12", "org_phone", "meera", "CONTACTED", org, "VERIFIED", .88, "Synthetic CDR record", "Repeated contact events with Meera Dutta.", "CDR-ORG-121", 6, {"interaction_count": 17}),
        ("r13", "meera", "vehicle", "USES", org, "VERIFIED", .92, "Synthetic vehicle sighting", "Vehicle WB-19-Q-4820 was documented with Meera Dutta.", "VEH-ORG-005", 7),
        ("r14", "vehicle", "warehouse", "LOCATED_AT", org, "VERIFIED", .90, "Synthetic vehicle sighting", "Vehicle sighted at Fictional East Yard.", "VEH-ORG-007", 7),
        ("r15", "warehouse", "logistics_org", "ASSOCIATED_WITH", org, "VERIFIED", .85, "Synthetic public business record", "Location referenced in organisation record.", "ORG-ORG-012", 7),
        ("r16", "shared_device", "duplicate_aarav", "USES", org, "VERIFIED", .89, "Synthetic device-login record", "A matching device session is attributed to Aarav Kumar Sen.", "DEV-ORG-022", 8),
        ("r17", "duplicate_aarav", "aarav_phone", "USES", org, "VERIFIED", .91, "Synthetic registration record", "Registration lists +91 97777 41002.", "REG-ORG-019", 8),
        ("r18", "bridge_aarav", "duplicate_aarav", "POSSIBLE_SAME_AS", org, "HYPOTHESIS", .96, "Entity resolution multi-signal v1", "Name similarity, identical address and shared device need analyst confirmation.", "ER-ORG-001", 8, {"name_similarity": .91, "same_address": True, "shared_device": True, "contradictions": []}),
        ("r19", "mule_account", "settlement_account", "TRANSFERRED_TO", fin, "VERIFIED", .98, "Synthetic transaction record", "₹45,500 pass-through transfer after receipt.", "TXN-FIN-221", 10, {"amount": 45500, "currency": "INR"}),
        ("r20", "settlement_account", "entry_account", "TRANSFERRED_TO", fin, "VERIFIED", .97, "Synthetic transaction record", "₹44,900 return transfer forms a circular pattern.", "TXN-FIN-222", 10, {"amount": 44900, "currency": "INR"}),
        ("r21", "dev", "mule_account", "ASSOCIATED_WITH", fin, "INFERRED", .81, "Device and transaction corroboration v1", "Common session device and a repeated counterparty support analyst review.", "DER-FIN-011", 11),
        ("r22", "settlement_account", "analyst_location", "LOCATED_AT", fin, "VERIFIED", .82, "Synthetic ATM record", "A transaction location record references Fictional Riverfront ATM.", "LOC-FIN-003", 11),
        ("r23", "settlement_account", "txn_device", "USES", fin, "VERIFIED", .91, "Synthetic device-login record", "Session record associates settlement account with the device.", "DEV-FIN-007", 11),
        ("r24", "victim_rohan", "case_cross", "INVOLVED_IN", cross, "VERIFIED", .99, "Fictional complaint record", "Rohan Iyer is the named complainant.", "FIR-XC-003", 13),
        ("r25", "victim_rohan", "rohan_phone", "USES", cross, "VERIFIED", .99, "Fictional complaint record", "Complainant supplied contact number +91 91111 82004.", "FIR-XC-003", 13),
        ("r26", "rohan_phone", "fraud_contact", "CALLS", cross, "VERIFIED", .96, "Synthetic CDR record", "A separate report contains contact with the same supplied number.", "CDR-XC-041", 14),
        ("r27", "fraud_contact", "entry_account", "ASSOCIATED_WITH", cross, "INFERRED", .90, "Cross-case shared identifier rule v1", "Same contact number is evidenced in separate payment paths.", "XCASE-004", 14),
        ("r28", "bridge_aarav", "vehicle", "ASSOCIATED_WITH", loc, "INFERRED", .76, "Co-location rule v1", "Device observation and vehicle sighting share a narrow time/location window.", "DER-LOC-008", 18),
        ("r29", "vehicle", "case_loc", "APPEARS_IN", loc, "VERIFIED", .96, "Synthetic vehicle sighting", "Vehicle sighting recorded in location-correlation case.", "VEH-LOC-009", 18),
        ("r30", "shared_device", "case_loc", "APPEARS_IN", loc, "VERIFIED", .88, "Synthetic device observation", "Shared device is present in a location report.", "DEV-LOC-004", 18),
    ]
    relationships = tuple(
        DemoRelationship(
            key=spec[0], source_key=spec[1], target_key=spec[2], predicate=spec[3], case_number=spec[4],
            evidence_status=spec[5], confidence=spec[6], derivation=spec[7], evidence_text=spec[8],
            source_record_id=spec[9], occurred_at=_at(spec[10]), attributes=spec[11] if len(spec) > 11 else {},
        )
        for spec in relationship_specs
    )

    documents = (
        DemoDocument(
            "doc-cy-001", "cyber_fraud_complaint.txt", cy, "FIR",
            "Fictional complaint: Nila Basu (+91 90000 11001) contacted +91 98888 23001. "
            "She was instructed to pay brightcart@upi; payment was settled to AC-2041-AX.",
        ),
        DemoDocument(
            "doc-org-002", "logistics_report.txt", org, "INTELLIGENCE_REPORT",
            "Fictional field report: Aarav Sen used +91 93333 62008. Meera Dutta was observed "
            "with vehicle WB-19-Q-4820 at Fictional East Yard, Kolkata.",
        ),
        DemoDocument(
            "doc-cross-004", "separate_complaint.txt", cross, "FIR",
            "Fictional complaint: Rohan Iyer (+91 91111 82004) received payment instructions "
            "from +91 98888 23001. The identifier brightcart@upi was included.",
        ),
    )

    if additional_people:
        rng = random.Random(seed)
        for index in range(additional_people):
            entity_key = f"noise_person_{index + 1:04d}"
            label = f"Synthetic Person {index + 1:04d}"
            entities.append(DemoEntity(entity_key, "Person", label, (cy,), confidence=round(rng.uniform(.6, .9), 2)))

    ground_truth = {
        "seed": seed,
        "fictional": True,
        "bridge_entities": ["bridge_aarav", "shared_device"],
        "duplicate_pairs": [["bridge_aarav", "duplicate_aarav"]],
        "related_case_pairs": [[cy, cross], [cy, fin], [org, loc]],
        "financial_alert_edges": ["r06", "r19", "r20"],
        "notes": "Ground truth is kept separately for evaluation and is not investigator evidence.",
    }
    return DemoBundle(cases, tuple(entities), relationships, documents, ground_truth)


def write_demo_evidence_files(target: Path, *, seed: int = 2026) -> list[Path]:
    """Write only synthetic report copies used for the end-to-end upload demo."""

    target.mkdir(parents=True, exist_ok=True)
    bundle = build_demo_bundle(seed=seed)
    paths: list[Path] = []
    for document in bundle.documents:
        path = target / document.filename
        path.write_text(document.content, encoding="utf-8")
        paths.append(path)
    new_evidence = target / "new_evidence.txt"
    new_evidence.write_text(
        "Fictional follow-up: +91 98888 23001 was observed with IMEI-356789104321998 "
        "on 2026-05-21. This report is synthetic and requires analyst verification.",
        encoding="utf-8",
    )
    paths.append(new_evidence)
    ground_truth_path = target / "ground_truth.json"
    ground_truth_path.write_text(json.dumps(bundle.ground_truth, indent=2), encoding="utf-8")
    paths.append(ground_truth_path)
    return paths
