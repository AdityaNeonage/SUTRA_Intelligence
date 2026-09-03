export type NodeType = 'person' | 'account' | 'device' | 'ghost' | 'vehicle' | 'location' | 'phone' | 'organization' | 'evidence' | 'transaction' | 'case';

export type EdgeType = 'communication' | 'transaction' | 'shared_device' | 'inferred' | 'owns' | 'appears_at' | 'calls' | 'part_of' | 'identified_by' | 'located_at' | 'linked_to';

export interface NodeData {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  riskScore: number;
  isGhost?: boolean;
  connections?: number;
  cases?: number;
  description?: string;
  evidence?: string[];
  metadata?: Record<string, string>;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
  label?: string;
  confidence?: number; // 0-1
  evidenceIds?: string[];
}

export interface EventData {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  relatedNodes: string[];
  type?: 'vehicle' | 'person' | 'transaction' | 'communication' | 'location' | 'alert';
  confidence?: number;
}

export interface EntityResolutionData {
  id: string;
  entityA: {
    id: string;
    name: string;
    phone: string;
    location: string;
    dob: string;
  };
  entityB: {
    id: string;
    name: string;
    phone: string;
    location: string;
    dob: string;
  };
  similarityScore: number;
  conflicts: string[];
  matches: string[];
}

export interface EvidenceItem {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'vehicle' | 'phone' | 'account' | 'location' | 'ip' | 'email' | 'text';
  status: 'queued' | 'processing' | 'done' | 'error';
  progress?: number; // 0-100
  extractedEntities?: ExtractedEntity[];
  uploadedAt?: string;
  size?: string;
  icon?: string;
}

export interface ExtractedEntity {
  id: string;
  label: string;
  type: NodeType;
  confidence: number;
  sourceEvidenceId: string;
  addedToGraph?: boolean;
}

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  type: 'ghost_node' | 'missing_link' | 'pattern' | 'cross_case';
  confidence: number;
  supportingSignals: string[];
  affectedNodes: string[];
  status: 'active' | 'dismissed' | 'confirmed';
}

export interface NextEvidence {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  relationships: number;
  hypothesesAffected: number;
  type: NodeType;
}

export interface ConnectionWhy {
  nodeAId: string;
  nodeBId: string;
  nodeALabel: string;
  nodeBLabel: string;
  confidence: number;
  evidence: string[];
  timestamps?: number;
  explanation: string;
}
