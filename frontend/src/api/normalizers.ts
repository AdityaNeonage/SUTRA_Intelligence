import type {
  BridgeEntity,
  CaseRecord,
  EvidenceStatus,
  GraphEdge,
  GraphNode,
  GraphResponse,
  HealthResponse,
  HealthService,
  RelatedCase,
  TimelinePoint,
} from "../types/api";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArray(value: unknown) {
  return asArray(value).map((item) => stringValue(item)).filter(Boolean);
}

export function unwrapItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  return asArray(record.items ?? record.results ?? record.data ?? record.bridges ?? record.related_cases ?? record.events);
}

export function normalizeHealth(payload: unknown): HealthResponse {
  const record = asRecord(payload);
  const components = record.services ?? record.components ?? record.dependencies;
  const services: HealthService[] = Array.isArray(components)
    ? components.map((item, index) => {
      const service = asRecord(item);
      return {
        name: stringValue(service.name ?? service.service ?? service.component, `Service ${index + 1}`),
        displayName: stringValue(service.display_name ?? service.displayName, "") || undefined,
        status: stringValue(service.status ?? service.state, "UNKNOWN"),
        detail: stringValue(service.detail ?? service.message, "") || undefined,
      };
    })
    : isRecord(components)
      ? Object.entries(components).map(([name, value]) => {
        const service = asRecord(value);
        return {
          name,
          displayName: stringValue(service.display_name ?? service.displayName, "") || undefined,
          status: stringValue(service.status ?? value, "UNKNOWN"),
          detail: stringValue(service.detail ?? service.message, "") || undefined,
        };
      })
      : [];

  return {
    ...record,
    status: stringValue(record.status ?? record.state, "UNKNOWN"),
    services,
    version: stringValue(record.version, "") || undefined,
    timestamp: stringValue(record.timestamp ?? record.checked_at, "") || undefined,
  };
}

export function normalizeCases(payload: unknown): CaseRecord[] {
  return unwrapItems(payload).map((item) => {
    const record = asRecord(item);
    return {
      id: stringValue(record.id ?? record.case_id),
      case_number: stringValue(record.case_number ?? record.reference ?? record.id),
      title: stringValue(record.title ?? record.name, "Untitled case"),
      description: stringValue(record.description, "") || null,
      status: stringValue(record.status, "UNKNOWN"),
      priority: stringValue(record.priority, "NORMAL"),
      classification: stringValue(record.classification, "RESTRICTED"),
      created_by_id: stringValue(record.created_by_id, "") || null,
      created_at: stringValue(record.created_at, ""),
      updated_at: stringValue(record.updated_at, ""),
    };
  }).filter((item) => Boolean(item.id));
}

function normalizeNode(value: unknown, index: number): GraphNode {
  const record = asRecord(value);
  const nestedData = asRecord(record.data);
  const source = Object.keys(nestedData).length > 0 ? nestedData : record;
  return {
    id: stringValue(source.id ?? source.node_id ?? source.entity_id, `node-${index}`),
    label: stringValue(source.label ?? source.name ?? source.display_name ?? source.id, "Unlabelled entity"),
    entityType: stringValue(source.entity_type ?? source.type ?? source.labels, "ENTITY").toUpperCase(),
    caseIds: stringArray(source.case_ids ?? source.cases),
    confidence: numberValue(source.confidence, 0) || undefined,
    raw: source,
  };
}

function normalizeEdge(value: unknown, index: number): GraphEdge {
  const record = asRecord(value);
  const nestedData = asRecord(record.data);
  const source = Object.keys(nestedData).length > 0 ? nestedData : record;
  return {
    id: stringValue(source.id ?? source.edge_id ?? source.relationship_id, `edge-${index}`),
    source: stringValue(source.source ?? source.source_id ?? source.from),
    target: stringValue(source.target ?? source.target_id ?? source.to),
    label: stringValue(source.label ?? source.relationship ?? source.type ?? source.predicate, "RELATED_TO").toUpperCase(),
    confidence: numberValue(source.confidence, 0) || undefined,
    evidenceStatus: stringValue(source.evidence_status ?? source.status, "INFERRED").toUpperCase() as EvidenceStatus,
    evidence: stringArray(source.evidence ?? source.source_records ?? source.evidence_ids),
    caseId: stringValue(source.case_id, "") || undefined,
    derivation: stringValue(source.derivation ?? source.originating_model ?? source.rule, "") || undefined,
    raw: source,
  };
}

export function normalizeGraph(payload: unknown): GraphResponse {
  const record = asRecord(payload);
  const elements = asRecord(record.elements);
  const rawNodes = asArray(record.nodes ?? elements.nodes ?? record.vertices);
  const rawEdges = asArray(record.edges ?? elements.edges ?? record.relationships ?? record.links);
  return {
    ...record,
    nodes: rawNodes.map(normalizeNode).filter((node) => Boolean(node.id)),
    edges: rawEdges.map(normalizeEdge).filter((edge) => Boolean(edge.source && edge.target)),
  };
}

export function normalizeBridges(payload: unknown): BridgeEntity[] {
  return unwrapItems(payload).map((item) => {
    const record = asRecord(item);
    const entity = asRecord(record.entity);
    return {
      entityId: stringValue(record.entity_id ?? record.id ?? entity.id),
      label: stringValue(record.label ?? record.entity_name ?? entity.label ?? entity.name, "Unlabelled entity"),
      entityType: stringValue(record.entity_type ?? entity.entity_type ?? entity.type, "ENTITY").toUpperCase(),
      bridgeScore: numberValue(record.bridge_score ?? record.score ?? record.betweenness),
      relatedCases: stringArray(record.related_cases ?? record.case_ids ?? record.cases),
      supportingRelationships: numberValue(record.supporting_relationships ?? record.relationship_count ?? record.support),
      reasons: stringArray(record.reasons ?? record.why_flagged),
      raw: record,
    };
  }).filter((item) => Boolean(item.entityId));
}

export function normalizeRelatedCases(payload: unknown): RelatedCase[] {
  return unwrapItems(payload).map((item) => {
    const record = asRecord(item);
    const caseRecord = asRecord(record.case ?? record.related_case);
    return {
      caseId: stringValue(record.related_case_id ?? record.case_id ?? caseRecord.id),
      caseNumber: stringValue(record.case_number ?? caseRecord.case_number ?? record.related_case_id, "Case"),
      title: stringValue(record.title ?? caseRecord.title, "Related case"),
      similarity: numberValue(record.similarity ?? record.confidence ?? record.score),
      reasons: stringArray(record.reasons ?? record.shared_patterns),
      sharedEntities: stringArray(record.shared_entities ?? record.shared_signals),
      raw: record,
    };
  }).filter((item) => Boolean(item.caseId));
}

export function normalizeTimeline(payload: unknown): TimelinePoint[] {
  return unwrapItems(payload).map((item) => {
    const record = asRecord(item);
    return {
      timestamp: stringValue(record.timestamp ?? record.date ?? record.occurred_at ?? record.bucket),
      label: stringValue(record.label ?? record.event_type ?? record.category, "Activity"),
      count: numberValue(record.count ?? record.value ?? record.events, 1),
      category: stringValue(record.category ?? record.event_type, "") || undefined,
      raw: record,
    };
  }).filter((item) => Boolean(item.timestamp));
}
