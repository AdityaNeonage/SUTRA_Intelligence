export type DemoCaseStatus = "ACTIVE" | "REVIEW" | "ARCHIVED";
export type DemoPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type EvidenceKind = "CALL_DETAIL" | "BANK_RECORD" | "CCTV_NOTE" | "WITNESS_NOTE" | "DEVICE_LOG" | "DOCUMENT";
export type EvidenceClassification = "VERIFIED" | "INFERRED" | "HYPOTHESIS";
export type ActivityCategory = "NETWORK" | "EVIDENCE" | "CASE" | "ANALYSIS";
export type HypothesisVerdict = "supports" | "contradicts" | "unknown";

export interface DemoCase {
  id: string;
  reference: string;
  title: string;
  category: string;
  description: string;
  status: DemoCaseStatus;
  priority: DemoPriority;
  owner: string;
  updatedAt: string;
  createdAt: string;
  entityCount: number;
  evidenceCount: number;
}

export interface EvidenceReference {
  id: string;
  caseId: string;
  documentRef: string;
  title: string;
  source: string;
  kind: EvidenceKind;
  status: EvidenceClassification;
  confidence: number;
  timestamp: string;
  excerpt: string;
  entityIds: string[];
}

export interface DemoActivity {
  id: string;
  caseId: string;
  timestamp: string;
  title: string;
  description: string;
  category: ActivityCategory;
  entityIds: string[];
  evidenceId?: string;
}

export interface HypothesisColumn {
  id: string;
  shortLabel: string;
  title: string;
  qualifier: string;
}

export interface HypothesisRow {
  id: string;
  evidenceId: string;
  reference: string;
  evidence: string;
  cells: Record<string, { verdict: HypothesisVerdict; rationale: string }>;
}

export interface AssistantMessage {
  id: string;
  role: "investigator" | "assistant";
  text: string;
  timestamp: string;
  citations?: string[];
  graphAction?: string;
}

export interface GraphUpdatePayload {
  nodes: Array<{
    id: string;
    label: string;
    entityType: string;
    caseIds: string[];
    confidence?: number;
    raw: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label: string;
    confidence?: number;
    evidenceStatus: EvidenceClassification;
    evidence?: string[];
    caseId?: string;
    derivation?: string;
    raw: Record<string, unknown>;
  }>;
}
