import type { EvidenceStatus, GraphEdge, GraphNode } from "../../types/api";

/**
 * The entity and relationship vocabulary intentionally mirrors the Phase 2
 * demo contract.  API adapters can map backend values into these unions later
 * without requiring the graph UI to understand backend-specific strings.
 */
export const ENTITY_TYPES = [
  "PERSON",
  "PHONE",
  "BANK_ACCOUNT",
  "DEVICE",
  "VEHICLE",
  "LOCATION",
  "ORGANIZATION",
  "CASE",
  "DOCUMENT",
] as const;

export type NetworkEntityType = (typeof ENTITY_TYPES)[number];

export const RELATIONSHIP_TYPES = [
  "CALLED",
  "TRANSFERRED_TO",
  "OWNS",
  "USES",
  "LOCATED_AT",
  "SEEN_WITH",
  "MENTIONED_IN",
  "ASSOCIATED_WITH",
] as const;

export type NetworkRelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const EVIDENCE_VERIFICATION_STATUSES = ["VERIFIED", "INFERRED", "HYPOTHESIS"] as const;

export type EvidenceVerificationStatus = (typeof EVIDENCE_VERIFICATION_STATUSES)[number];

export const EVIDENCE_SOURCE_TYPES = [
  "CALL_DETAIL_RECORD",
  "BANK_RECORD",
  "DEVICE_FORENSICS",
  "CCTV_LOG",
  "FIELD_REPORT",
  "CASE_NOTE",
  "DOCUMENT",
] as const;

export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

export const ENTITY_TYPE_LABELS: Readonly<Record<NetworkEntityType, string>> = {
  PERSON: "Person",
  PHONE: "Phone",
  BANK_ACCOUNT: "Bank account",
  DEVICE: "Device",
  VEHICLE: "Vehicle",
  LOCATION: "Location",
  ORGANIZATION: "Organization",
  CASE: "Case",
  DOCUMENT: "Document",
};

export const RELATIONSHIP_TYPE_LABELS: Readonly<Record<NetworkRelationshipType, string>> = {
  CALLED: "called",
  TRANSFERRED_TO: "transferred to",
  OWNS: "owns",
  USES: "uses",
  LOCATED_AT: "located at",
  SEEN_WITH: "seen with",
  MENTIONED_IN: "mentioned in",
  ASSOCIATED_WITH: "associated with",
};

export interface EvidenceRecord {
  id: string;
  caseId: string;
  status: EvidenceVerificationStatus;
  sourceType: EvidenceSourceType;
  sourceLabel: string;
  sourceReference: string;
  documentId?: string;
  timestamp: string;
  confidence: number;
  summary: string;
}

export interface NetworkEntityPosition {
  x: number;
  y: number;
}

/**
 * Keeps the existing GraphNode fields intact, while adding presentation-ready
 * synthetic metadata for the Phase 2 entity drawer.
 */
export interface MockNetworkNode extends GraphNode {
  entityType: NetworkEntityType;
  aliases: string[];
  summary: string;
  details: Record<string, string>;
  evidenceRecords: EvidenceRecord[];
  firstSeen: string;
  lastSeen: string;
  position?: NetworkEntityPosition;
  isExpansionNode?: boolean;
}

/**
 * `evidence` deliberately stays an array of evidence IDs so this interface is
 * assignable to the pre-existing GraphEdge component. `evidenceRecords` holds
 * the richer source/confidence/timestamp data used by Phase 2 panels.
 */
export interface MockNetworkEdge extends GraphEdge {
  relationshipType: NetworkRelationshipType;
  evidenceStatus: EvidenceVerificationStatus;
  evidence: string[];
  evidenceRecords: EvidenceRecord[];
  caseId: string;
  derivation: string;
  isExpansionEdge?: boolean;
}

export interface MockNetworkData {
  caseId: string;
  caseLabel: string;
  nodes: MockNetworkNode[];
  edges: MockNetworkEdge[];
}

export interface NetworkFilters {
  query?: string;
  entityTypes?: readonly NetworkEntityType[];
  relationshipTypes?: readonly NetworkRelationshipType[];
  evidenceStatuses?: readonly EvidenceVerificationStatus[];
  minimumConfidence?: number;
}

export interface NetworkPath {
  nodeIds: string[];
  edgeIds: string[];
  hops: number;
  evidenceRecords: EvidenceRecord[];
}

export interface NetworkExpansionResult {
  nodes: MockNetworkNode[];
  edges: MockNetworkEdge[];
  addedNodeIds: string[];
  addedEdgeIds: string[];
}

export function formatEntityType(entityType: NetworkEntityType): string {
  return ENTITY_TYPE_LABELS[entityType];
}

export function formatRelationshipType(relationshipType: NetworkRelationshipType): string {
  return RELATIONSHIP_TYPE_LABELS[relationshipType];
}

export function toEntityClassName(entityType: NetworkEntityType): string {
  return entityType.toLowerCase().replace(/_/g, "-");
}

export function toRelationshipClassName(relationshipType: NetworkRelationshipType): string {
  return relationshipType.toLowerCase().replace(/_/g, "-");
}

/** The existing API accepts a broad EvidenceStatus string; this narrows it for mock graph data. */
export function isEvidenceVerificationStatus(status: EvidenceStatus): status is EvidenceVerificationStatus {
  return EVIDENCE_VERIFICATION_STATUSES.includes(status as EvidenceVerificationStatus);
}
