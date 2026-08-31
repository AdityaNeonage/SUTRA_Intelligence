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
