export type EvidenceStatus = "VERIFIED" | "INFERRED" | "HYPOTHESIS" | string;

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CaseRecord {
  id: string;
  case_number: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  classification: string;
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface DemoSeedResponse {
  cases: Record<string, string>;
  entity_count: number;
  relationship_count: number;
}

export interface HealthService {
  name: string;
  displayName?: string;
  status: string;
  detail?: string;
}

export interface HealthResponse {
  status: string;
  services?: HealthService[];
  version?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  label: string;
  entityType: string;
  caseIds: string[];
  confidence?: number;
  raw: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence?: number;
  evidenceStatus: EvidenceStatus;
  evidence?: string[];
  caseId?: string;
  derivation?: string;
  raw: Record<string, unknown>;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  [key: string]: unknown;
}

export interface BridgeEntity {
  entityId: string;
  label: string;
  entityType: string;
  bridgeScore: number;
  relatedCases: string[];
  supportingRelationships: number;
  reasons: string[];
  raw: Record<string, unknown>;
}

export interface RelatedCase {
  caseId: string;
  caseNumber: string;
  title: string;
  similarity: number;
  reasons: string[];
  sharedEntities: string[];
  raw: Record<string, unknown>;
}

export interface TimelinePoint {
  timestamp: string;
  label: string;
  count: number;
  category?: string;
  raw: Record<string, unknown>;
}

export interface IngestionRecord {
  id: string;
  case_id?: string | null;
  source_type: string;
  filename: string;
  file_hash: string;
  status: string;
  row_count: number;
  document_count: number;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface EvidenceDocumentRecord {
  id: string;
  ingestion_id: string;
  case_id?: string | null;
  evidence_id: string;
  filename: string;
  language: string;
  page_count?: number | null;
  raw_preview?: string;
  raw_text?: string;
  processed_text?: string;
  extraction_metadata: Record<string, unknown>;
  created_at: string;
}

export interface EvidenceUploadResponse {
  ingestion_id: string;
  status: string;
  filename: string;
  file_hash: string;
  warnings: string[];
  document_ids: string[];
  entity_ids: string[];
  relationship_ids: string[];
}

export interface CopilotResponse {
  answer: string;
  entity_ids: string[];
  edge_ids: string[];
  evidence: Array<Record<string, unknown>>;
  limitations: string[];
}
