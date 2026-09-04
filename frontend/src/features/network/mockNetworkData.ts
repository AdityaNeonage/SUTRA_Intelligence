import {
  formatRelationshipType,
  type EvidenceRecord,
  type MockNetworkData,
  type MockNetworkEdge,
  type MockNetworkNode,
  type NetworkEntityType,
  type NetworkExpansionResult,
  type NetworkRelationshipType,
} from "./networkTypes";

const CASE_ID = "case-104";
const CASE_LABEL = "CASE-104 - Operation Nightfall";

interface EvidenceInput {
  id: string;
  status: EvidenceRecord["status"];
  sourceType: EvidenceRecord["sourceType"];
  sourceLabel: string;
  sourceReference: string;
  documentId?: string;
  timestamp: string;
  confidence: number;
  summary: string;
}

interface NodeInput {
  id: string;
  label: string;
  entityType: NetworkEntityType;
  summary: string;
  confidence: number;
  aliases?: string[];
  details: Record<string, string>;
  evidenceRecords?: EvidenceRecord[];
  firstSeen: string;
  lastSeen: string;
  position?: MockNetworkNode["position"];
  isExpansionNode?: boolean;
}

interface EdgeInput {
  id: string;
  source: string;
  target: string;
  relationshipType: NetworkRelationshipType;
  confidence: number;
  evidenceStatus: MockNetworkEdge["evidenceStatus"];
  evidenceRecords: EvidenceRecord[];
  derivation: string;
  label?: string;
  isExpansionEdge?: boolean;
}

function evidence(input: EvidenceInput): EvidenceRecord {
  return { ...input, caseId: CASE_ID };
}

function node(input: NodeInput): MockNetworkNode {
  return {
    id: input.id,
    label: input.label,
    entityType: input.entityType,
    caseIds: [CASE_ID],
    confidence: input.confidence,
    aliases: input.aliases ?? [],
    summary: input.summary,
    details: input.details,
    evidenceRecords: input.evidenceRecords ?? [],
    firstSeen: input.firstSeen,
    lastSeen: input.lastSeen,
    position: input.position,
    isExpansionNode: input.isExpansionNode,
    raw: {
      synthetic: true,
      case_id: CASE_ID,
      entity_type: input.entityType,
      first_seen: input.firstSeen,
      last_seen: input.lastSeen,
    },
  };
}

function edge(input: EdgeInput): MockNetworkEdge {
  return {
    id: input.id,
    source: input.source,
    target: input.target,
    label: input.label ?? formatRelationshipType(input.relationshipType),
    relationshipType: input.relationshipType,
    confidence: input.confidence,
    evidenceStatus: input.evidenceStatus,
    evidence: input.evidenceRecords.map((record) => record.id),
    evidenceRecords: input.evidenceRecords,
    caseId: CASE_ID,
    derivation: input.derivation,
    isExpansionEdge: input.isExpansionEdge,
    raw: {
      synthetic: true,
      case_id: CASE_ID,
      relationship_type: input.relationshipType,
      derivation: input.derivation,
    },
  };
}

const CALL_RECORD = evidence({
  id: "ev-cdr-1208",
  status: "VERIFIED",
  sourceType: "CALL_DETAIL_RECORD",
  sourceLabel: "CDR extract - 12 Aug",
  sourceReference: "CDR/IN/2026/0812/019",
  documentId: "doc-cdr-aug12",
  timestamp: "2026-08-12T18:42:00+05:30",
  confidence: 0.96,
  summary: "A 214-second call was recorded between the two associated handsets.",
});

const BANK_RECORD = evidence({
  id: "ev-bank-184",
  status: "VERIFIED",
  sourceType: "BANK_RECORD",
  sourceLabel: "Bank statement - 13 Aug",
  sourceReference: "FIN/104/184",
  documentId: "doc-bank-ledger",
  timestamp: "2026-08-13T09:16:00+05:30",
  confidence: 0.94,
  summary: "A transfer trail links the account to a second account under review.",
});

const DEVICE_REPORT = evidence({
  id: "ev-device-031",
  status: "VERIFIED",
  sourceType: "DEVICE_FORENSICS",
  sourceLabel: "Device extraction - D-131",
  sourceReference: "DF/131/04",
  documentId: "doc-device-d131",
  timestamp: "2026-08-12T20:08:00+05:30",
  confidence: 0.91,
  summary: "The device profile contains an account identifier and saved location history.",
});

const CCTV_RECORD = evidence({
  id: "ev-cctv-067",
  status: "VERIFIED",
  sourceType: "CCTV_LOG",
  sourceLabel: "Park Street CCTV review",
  sourceReference: "CCTV/PS/067",
  documentId: "doc-cctv-park-street",
  timestamp: "2026-08-12T18:35:00+05:30",
  confidence: 0.88,
  summary: "Two persons were observed together near the Park Street location.",
});

const FIELD_NOTE = evidence({
  id: "ev-field-024",
  status: "INFERRED",
  sourceType: "FIELD_REPORT",
  sourceLabel: "Field observation note",
  sourceReference: "FR/104/024",
  timestamp: "2026-08-14T11:20:00+05:30",
  confidence: 0.72,
  summary: "A vehicle association is inferred from repeated co-location records.",
});

const CASE_NOTE = evidence({
  id: "ev-note-042",
  status: "HYPOTHESIS",
  sourceType: "CASE_NOTE",
  sourceLabel: "Analyst hypothesis H2",
  sourceReference: "HYP/104/042",
  timestamp: "2026-08-14T15:40:00+05:30",
  confidence: 0.58,
  summary: "The organization link is a testable analytical lead, not a confirmed finding.",
});

const DOCUMENT_RECORD = evidence({
  id: "ev-doc-009",
  status: "VERIFIED",
  sourceType: "DOCUMENT",
  sourceLabel: "Seized document index",
  sourceReference: "DOC/104/009",
  documentId: "doc-cdr-aug12",
  timestamp: "2026-08-14T10:10:00+05:30",
  confidence: 0.86,
  summary: "The document references an entity identifier used in the active case.",
});

const INITIAL_NODES: MockNetworkNode[] = [
  node({
    id: "case-104",
    label: "CASE-104",
    entityType: "CASE",
    summary: "Synthetic active investigation workspace for Phase 2 demonstration.",
    confidence: 1,
    details: { Status: "Active", Classification: "Restricted demo", Owner: "Synthetic workspace" },
    evidenceRecords: [DOCUMENT_RECORD],
    firstSeen: "2026-08-01T09:00:00+05:30",
    lastSeen: "2026-08-14T15:40:00+05:30",
    position: { x: 0, y: -190 },
  }),
  node({
    id: "person-rahul-verma",
    label: "Rahul Verma",
    entityType: "PERSON",
    summary: "Synthetic subject linked to device, financial, location, and document evidence.",
    confidence: 0.86,
    aliases: ["R. Verma", "RV-37"],
    details: { Entity_ID: "P-037", Role: "Person of interest", Last_observed: "Park Street" },
    evidenceRecords: [CALL_RECORD, CCTV_RECORD, DOCUMENT_RECORD],
    firstSeen: "2026-08-08T11:15:00+05:30",
    lastSeen: "2026-08-14T15:40:00+05:30",
    position: { x: 0, y: 0 },
  }),
  node({
    id: "phone-9810-217",
    label: "Phone - 9810***217",
    entityType: "PHONE",
    summary: "Synthetic handset identifier appearing in a bounded call-detail extract.",
    confidence: 0.93,
    details: { Subscriber_status: "Unverified", Extract: "CDR - 12 Aug", Linked_device: "D-131" },
    evidenceRecords: [CALL_RECORD, DEVICE_REPORT],
    firstSeen: "2026-08-10T13:05:00+05:30",
    lastSeen: "2026-08-12T18:42:00+05:30",
    position: { x: -185, y: -35 },
  }),
  node({
    id: "bank-account-4871",
    label: "Account - ***4871",
    entityType: "BANK_ACCOUNT",
    summary: "Synthetic financial identifier retained for relationship-analysis demonstration only.",
    confidence: 0.89,
    details: { Institution: "Demo cooperative", Last_activity: "13 Aug", Reference: "FIN/104/184" },
    evidenceRecords: [BANK_RECORD],
    firstSeen: "2026-08-11T09:16:00+05:30",
    lastSeen: "2026-08-13T09:16:00+05:30",
    position: { x: 185, y: -35 },
  }),
  node({
    id: "device-d131",
    label: "Device - D-131",
    entityType: "DEVICE",
    summary: "Synthetic device profile with retained forensic provenance.",
    confidence: 0.91,
    details: { Platform: "Android", Extraction: "Logical", Artifact_set: "DF/131/04" },
    evidenceRecords: [DEVICE_REPORT],
    firstSeen: "2026-08-10T13:05:00+05:30",
    lastSeen: "2026-08-12T20:08:00+05:30",
    position: { x: -145, y: 142 },
  }),
  node({
    id: "vehicle-wb04m2208",
    label: "Vehicle - WB-04M-2208",
    entityType: "VEHICLE",
    summary: "Synthetic vehicle association requiring ongoing evidence review.",
    confidence: 0.72,
    details: { Registration: "WB-04M-2208", Observation: "Repeated co-location", Status: "Analytical lead" },
    evidenceRecords: [FIELD_NOTE],
    firstSeen: "2026-08-12T17:55:00+05:30",
    lastSeen: "2026-08-14T11:20:00+05:30",
    position: { x: 148, y: 145 },
  }),
  node({
    id: "location-park-street",
    label: "Park Street",
    entityType: "LOCATION",
    summary: "Synthetic location token drawn from a demonstration CCTV and field-observation record.",
    confidence: 0.88,
    details: { Area: "Park Street", Geo_precision: "Block level", Source: "CCTV review" },
    evidenceRecords: [CCTV_RECORD],
    firstSeen: "2026-08-12T18:35:00+05:30",
    lastSeen: "2026-08-12T18:42:00+05:30",
    position: { x: 0, y: 215 },
  }),
  node({
    id: "organization-nexus-logistics",
    label: "Nexus Logistics",
    entityType: "ORGANIZATION",
    summary: "Synthetic organization reference surfaced as a hypothesis for review.",
    confidence: 0.58,
    details: { Registration_status: "Unconfirmed", Lead_type: "Hypothesis", Review_owner: "Analyst queue" },
    evidenceRecords: [CASE_NOTE],
    firstSeen: "2026-08-14T15:40:00+05:30",
    lastSeen: "2026-08-14T15:40:00+05:30",
    position: { x: 275, y: 92 },
  }),
  node({
    id: "document-cdr-aug12",
    label: "CDR extract - 12 Aug",
    entityType: "DOCUMENT",
    summary: "Synthetic source document backing selected network relationships.",
    confidence: 0.96,
    details: { Document_ID: "DOC/104/009", Source_type: "Call detail record", Review_status: "Verified" },
    evidenceRecords: [CALL_RECORD, DOCUMENT_RECORD],
    firstSeen: "2026-08-12T18:45:00+05:30",
    lastSeen: "2026-08-14T10:10:00+05:30",
    position: { x: -275, y: 92 },
  }),
];

const INITIAL_EDGES: MockNetworkEdge[] = [
  edge({
    id: "rel-case-person",
    source: "case-104",
    target: "person-rahul-verma",
    relationshipType: "MENTIONED_IN",
    label: "contains entity",
    confidence: 0.86,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [DOCUMENT_RECORD],
    derivation: "Case index references the synthetic person entity.",
  }),
  edge({
    id: "rel-person-phone",
    source: "person-rahul-verma",
    target: "phone-9810-217",
    relationshipType: "USES",
    confidence: 0.91,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [DEVICE_REPORT],
    derivation: "Device forensic extraction associates the handset with the person entity.",
  }),
  edge({
    id: "rel-phone-person-called",
    source: "phone-9810-217",
    target: "person-rahul-verma",
    relationshipType: "CALLED",
    confidence: 0.96,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [CALL_RECORD],
    derivation: "Call-detail record provides a time-bounded communication event.",
  }),
  edge({
    id: "rel-person-account",
    source: "person-rahul-verma",
    target: "bank-account-4871",
    relationshipType: "OWNS",
    confidence: 0.81,
    evidenceStatus: "INFERRED",
    evidenceRecords: [BANK_RECORD],
    derivation: "Account association is an analytical inference based on the synthetic ledger trail.",
  }),
  edge({
    id: "rel-person-device",
    source: "person-rahul-verma",
    target: "device-d131",
    relationshipType: "USES",
    confidence: 0.91,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [DEVICE_REPORT],
    derivation: "Forensic device extraction provides the association.",
  }),
  edge({
    id: "rel-person-vehicle",
    source: "person-rahul-verma",
    target: "vehicle-wb04m2208",
    relationshipType: "OWNS",
    confidence: 0.72,
    evidenceStatus: "INFERRED",
    evidenceRecords: [FIELD_NOTE],
    derivation: "Repeated co-location is retained as a reviewable analytical lead.",
  }),
  edge({
    id: "rel-person-location",
    source: "person-rahul-verma",
    target: "location-park-street",
    relationshipType: "LOCATED_AT",
    confidence: 0.88,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [CCTV_RECORD],
    derivation: "CCTV review records a location observation.",
  }),
  edge({
    id: "rel-person-organization",
    source: "person-rahul-verma",
    target: "organization-nexus-logistics",
    relationshipType: "ASSOCIATED_WITH",
    confidence: 0.58,
    evidenceStatus: "HYPOTHESIS",
    evidenceRecords: [CASE_NOTE],
    derivation: "An analyst-entered hypothesis remains visible but explicitly unconfirmed.",
  }),
  edge({
    id: "rel-person-document",
    source: "person-rahul-verma",
    target: "document-cdr-aug12",
    relationshipType: "MENTIONED_IN",
    confidence: 0.86,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [DOCUMENT_RECORD],
    derivation: "The document index contains the synthetic entity reference.",
  }),
];

const SECONDARY_NODES: MockNetworkNode[] = [
  node({
    id: "person-aisha-sen",
    label: "Aisha Sen",
    entityType: "PERSON",
    summary: "Synthetic secondary person surfaced by a co-location record.",
    confidence: 0.79,
    aliases: ["A. Sen"],
    details: { Entity_ID: "P-081", Source: "CCTV review", Status: "Contextual entity" },
    evidenceRecords: [CCTV_RECORD],
    firstSeen: "2026-08-12T18:35:00+05:30",
    lastSeen: "2026-08-12T18:35:00+05:30",
    position: { x: 350, y: -118 },
    isExpansionNode: true,
  }),
  node({
    id: "phone-7003-184",
    label: "Phone - 7003***184",
    entityType: "PHONE",
    summary: "Synthetic secondary handset retained from the same call-record slice.",
    confidence: 0.77,
    details: { Subscriber_status: "Unverified", Extract: "CDR - 12 Aug", Linked_entity: "P-081" },
    evidenceRecords: [CALL_RECORD],
    firstSeen: "2026-08-12T18:42:00+05:30",
    lastSeen: "2026-08-12T18:42:00+05:30",
    position: { x: -365, y: -125 },
    isExpansionNode: true,
  }),
  node({
    id: "bank-account-3042",
    label: "Account - ***3042",
    entityType: "BANK_ACCOUNT",
    summary: "Synthetic destination account in the demonstrative transfer trail.",
    confidence: 0.84,
    details: { Institution: "Demo cooperative", Reference: "FIN/104/184", Review_status: "Pending" },
    evidenceRecords: [BANK_RECORD],
    firstSeen: "2026-08-13T09:16:00+05:30",
    lastSeen: "2026-08-13T09:16:00+05:30",
    position: { x: 375, y: 12 },
    isExpansionNode: true,
  }),
  node({
    id: "device-delta-19",
    label: "Device - Delta-19",
    entityType: "DEVICE",
    summary: "Synthetic device association marked as a reviewable analytical inference.",
    confidence: 0.68,
    details: { Platform: "Android", Association: "Shared artifact", Review_status: "Analyst review" },
    evidenceRecords: [FIELD_NOTE],
    firstSeen: "2026-08-13T14:30:00+05:30",
    lastSeen: "2026-08-13T14:30:00+05:30",
    position: { x: -315, y: 240 },
    isExpansionNode: true,
  }),
  node({
    id: "vehicle-wb09q8017",
    label: "Vehicle - WB-09Q-8017",
    entityType: "VEHICLE",
    summary: "Synthetic secondary vehicle from an associated field observation.",
    confidence: 0.64,
    details: { Registration: "WB-09Q-8017", Observation: "Field note", Review_status: "Unverified" },
    evidenceRecords: [FIELD_NOTE],
    firstSeen: "2026-08-14T11:20:00+05:30",
    lastSeen: "2026-08-14T11:20:00+05:30",
    position: { x: 220, y: 320 },
    isExpansionNode: true,
  }),
  node({
    id: "location-howrah-yard",
    label: "Howrah Yard",
    entityType: "LOCATION",
    summary: "Synthetic secondary location used solely for graph expansion demonstration.",
    confidence: 0.71,
    details: { Area: "Howrah Yard", Geo_precision: "Area level", Source: "Field observation" },
    evidenceRecords: [FIELD_NOTE],
    firstSeen: "2026-08-14T11:20:00+05:30",
    lastSeen: "2026-08-14T11:20:00+05:30",
    position: { x: -130, y: 350 },
    isExpansionNode: true,
  }),
  node({
    id: "organization-mercantile-link",
    label: "Mercantile Link",
    entityType: "ORGANIZATION",
    summary: "Synthetic organization reference connected by a hypothesis-level note.",
    confidence: 0.54,
    details: { Registration_status: "Unconfirmed", Lead_type: "Hypothesis", Review_owner: "Analyst queue" },
    evidenceRecords: [CASE_NOTE],
    firstSeen: "2026-08-14T15:40:00+05:30",
    lastSeen: "2026-08-14T15:40:00+05:30",
    position: { x: 155, y: -325 },
    isExpansionNode: true,
  }),
  node({
    id: "case-087",
    label: "CASE-087",
    entityType: "CASE",
    summary: "Synthetic related-case reference for controlled cross-case exploration.",
    confidence: 0.69,
    details: { Status: "Review", Classification: "Synthetic demo", Link_strength: "Contextual" },
    evidenceRecords: [CASE_NOTE],
    firstSeen: "2026-08-14T15:40:00+05:30",
    lastSeen: "2026-08-14T15:40:00+05:30",
    position: { x: -185, y: -320 },
    isExpansionNode: true,
  }),
  node({
    id: "document-cctv-park-street",
    label: "CCTV review - Park Street",
    entityType: "DOCUMENT",
    summary: "Synthetic review document with a time-bound co-location observation.",
    confidence: 0.88,
    details: { Document_ID: "DOC/104/067", Source_type: "CCTV log", Review_status: "Verified" },
    evidenceRecords: [CCTV_RECORD],
    firstSeen: "2026-08-12T18:45:00+05:30",
    lastSeen: "2026-08-14T09:00:00+05:30",
    position: { x: 0, y: -370 },
    isExpansionNode: true,
  }),
];

const SECONDARY_EDGES: MockNetworkEdge[] = [
  edge({
    id: "rel-person-aisha",
    source: "person-rahul-verma",
    target: "person-aisha-sen",
    relationshipType: "SEEN_WITH",
    confidence: 0.88,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [CCTV_RECORD],
    derivation: "CCTV review records a concurrent synthetic observation.",
    isExpansionEdge: true,
  }),
  edge({
    id: "rel-phone-aisha-called",
    source: "phone-9810-217",
    target: "phone-7003-184",
    relationshipType: "CALLED",
    confidence: 0.96,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [CALL_RECORD],
    derivation: "Call-detail extract provides a synthetic handset-to-handset event.",
    isExpansionEdge: true,
  }),
  edge({
    id: "rel-account-transfer",
    source: "bank-account-4871",
    target: "bank-account-3042",
    relationshipType: "TRANSFERRED_TO",
    confidence: 0.94,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [BANK_RECORD],
    derivation: "Synthetic bank record provides the transfer relationship.",
    isExpansionEdge: true,
  }),
  edge({
    id: "rel-person-secondary-device",
    source: "person-rahul-verma",
    target: "device-delta-19",
    relationshipType: "USES",
    confidence: 0.68,
    evidenceStatus: "INFERRED",
    evidenceRecords: [FIELD_NOTE],
    derivation: "The association is an analytical lead based on shared synthetic artifacts.",
    isExpansionEdge: true,
  }),
  edge({
    id: "rel-vehicle-secondary-location",
    source: "vehicle-wb04m2208",
    target: "location-howrah-yard",
    relationshipType: "LOCATED_AT",
    confidence: 0.71,
    evidenceStatus: "INFERRED",
    evidenceRecords: [FIELD_NOTE],
    derivation: "Field observation places the synthetic vehicle near the secondary location.",
    isExpansionEdge: true,
  }),
  edge({
    id: "rel-secondary-vehicle-owner",
    source: "person-aisha-sen",
    target: "vehicle-wb09q8017",
    relationshipType: "OWNS",
    confidence: 0.64,
    evidenceStatus: "INFERRED",
    evidenceRecords: [FIELD_NOTE],
    derivation: "The vehicle relationship remains an unverified synthetic analytical lead.",
    isExpansionEdge: true,
  }),
  edge({
    id: "rel-org-associated-case",
    source: "organization-nexus-logistics",
    target: "case-087",
    relationshipType: "ASSOCIATED_WITH",
    confidence: 0.54,
    evidenceStatus: "HYPOTHESIS",
    evidenceRecords: [CASE_NOTE],
    derivation: "Analyst hypothesis links the organization reference to a related synthetic case.",
    isExpansionEdge: true,
  }),
  edge({
    id: "rel-aisha-cctv-document",
    source: "person-aisha-sen",
    target: "document-cctv-park-street",
    relationshipType: "MENTIONED_IN",
    confidence: 0.88,
    evidenceStatus: "VERIFIED",
    evidenceRecords: [CCTV_RECORD],
    derivation: "The CCTV review document contains the synthetic person observation.",
    isExpansionEdge: true,
  }),
];

function cloneEvidence(record: EvidenceRecord): EvidenceRecord {
  return { ...record };
}

function cloneNode(source: MockNetworkNode): MockNetworkNode {
  return {
    ...source,
    aliases: [...source.aliases],
    caseIds: [...source.caseIds],
    details: { ...source.details },
    evidenceRecords: source.evidenceRecords.map(cloneEvidence),
    position: source.position ? { ...source.position } : undefined,
    raw: { ...source.raw },
  };
}

function cloneEdge(source: MockNetworkEdge): MockNetworkEdge {
  return {
    ...source,
    evidence: [...source.evidence],
    evidenceRecords: source.evidenceRecords.map(cloneEvidence),
    raw: { ...source.raw },
  };
}

/** Returns a fresh, fully synthetic base graph so separate UI instances never share mutations. */
export function createInitialMockNetwork(): MockNetworkData {
  return {
    caseId: CASE_ID,
    caseLabel: CASE_LABEL,
    nodes: INITIAL_NODES.map(cloneNode),
    edges: INITIAL_EDGES.map(cloneEdge),
  };
}

/**
 * Adds the same bounded second-hop data every time. Existing IDs are retained,
 * allowing a user to trigger the action more than once without duplicate graph
 * elements or non-deterministic demo data.
 */
export function expandNetworkConnections(current: MockNetworkData): NetworkExpansionResult {
  const existingNodeIds = new Set(current.nodes.map((item) => item.id));
  const existingEdgeIds = new Set(current.edges.map((item) => item.id));
  const newNodes = SECONDARY_NODES.filter((item) => !existingNodeIds.has(item.id)).map(cloneNode);
  const availableNodeIds = new Set([...existingNodeIds, ...newNodes.map((item) => item.id)]);
  const newEdges = SECONDARY_EDGES.filter(
    (item) => !existingEdgeIds.has(item.id) && availableNodeIds.has(item.source) && availableNodeIds.has(item.target),
  ).map(cloneEdge);

  return {
    nodes: [...current.nodes.map(cloneNode), ...newNodes],
    edges: [...current.edges.map(cloneEdge), ...newEdges],
    addedNodeIds: newNodes.map((item) => item.id),
    addedEdgeIds: newEdges.map((item) => item.id),
  };
}

export const MOCK_NETWORK_IDS = {
  case: "case-104",
  focalPerson: "person-rahul-verma",
  focalLocation: "location-park-street",
  supportingDocument: "document-cdr-aug12",
} as const;
