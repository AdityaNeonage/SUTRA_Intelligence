import type {
  EvidenceRecord,
  MockNetworkData,
  MockNetworkEdge,
  MockNetworkNode,
  NetworkFilters,
  NetworkPath,
} from "./networkTypes";

type EvidenceCarrier = Pick<MockNetworkNode, "evidenceRecords"> | Pick<MockNetworkEdge, "evidenceRecords">;

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function uniqueEvidence(records: readonly EvidenceRecord[]): EvidenceRecord[] {
  const evidenceById = new Map<string, EvidenceRecord>();
  records.forEach((record) => {
    if (!evidenceById.has(record.id)) evidenceById.set(record.id, record);
  });
  return [...evidenceById.values()];
}

function includesAny<T>(items: readonly T[] | undefined, value: T): boolean {
  return !items || items.length === 0 || items.includes(value);
}

function matchesNodeQuery(node: MockNetworkNode, query: string): boolean {
  if (!query) return true;
  const searchable = [
    node.id,
    node.label,
    node.entityType,
    node.summary,
    ...node.aliases,
    ...Object.values(node.details),
  ].join(" ");
  return normalized(searchable).includes(query);
}

function shouldRetainOnlyConnectedNodes(filters: NetworkFilters): boolean {
  return Boolean(
    filters.relationshipTypes?.length || filters.evidenceStatuses?.length || filters.minimumConfidence !== undefined,
  );
}

/** Returns IDs immediately adjacent to `nodeId`, independent of edge direction. */
export function getConnectedNodeIds(nodeId: string, edges: readonly MockNetworkEdge[]): string[] {
  const connectedIds = new Set<string>();
  edges.forEach((edge) => {
    if (edge.source === nodeId) connectedIds.add(edge.target);
    if (edge.target === nodeId) connectedIds.add(edge.source);
  });
  return [...connectedIds];
}

/** Returns all links touching an entity, independent of graph direction. */
export function getConnectedEdges(nodeId: string, edges: readonly MockNetworkEdge[]): MockNetworkEdge[] {
  return edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);
}

export function getNeighborNodes(data: Pick<MockNetworkData, "nodes" | "edges">, nodeId: string): MockNetworkNode[] {
  const connectedIds = new Set(getConnectedNodeIds(nodeId, data.edges));
  return data.nodes.filter((node) => connectedIds.has(node.id));
}

/**
 * Applies entity, relationship, evidence-status, confidence, and text filters
 * without mutating the original graph. An active relationship filter removes
 * isolated nodes so the visual result remains legible.
 */
export function filterNetwork(data: MockNetworkData, filters: NetworkFilters = {}): MockNetworkData {
  const query = normalized(filters.query ?? "");
  const minimumConfidence = filters.minimumConfidence ?? 0;
  const eligibleNodes = data.nodes.filter(
    (node) =>
      includesAny(filters.entityTypes, node.entityType) &&
      (node.confidence ?? 0) >= minimumConfidence &&
      matchesNodeQuery(node, query),
  );
  const eligibleNodeIds = new Set(eligibleNodes.map((node) => node.id));
  const eligibleEdges = data.edges.filter(
    (edge) =>
      eligibleNodeIds.has(edge.source) &&
      eligibleNodeIds.has(edge.target) &&
      includesAny(filters.relationshipTypes, edge.relationshipType) &&
      includesAny(filters.evidenceStatuses, edge.evidenceStatus) &&
      (edge.confidence ?? 0) >= minimumConfidence,
  );
  const visibleNodeIds = shouldRetainOnlyConnectedNodes(filters)
    ? new Set(eligibleEdges.flatMap((edge) => [edge.source, edge.target]))
    : eligibleNodeIds;

  return {
    ...data,
    nodes: eligibleNodes.filter((node) => visibleNodeIds.has(node.id)),
    edges: eligibleEdges,
  };
}

/**
 * Finds a deterministic, undirected shortest path. Treating relations as
 * traversable both ways is intentional for investigative exploration; the
 * returned edge IDs preserve each relation's original direction and metadata.
 */
export function findShortestPath(
  data: Pick<MockNetworkData, "nodes" | "edges">,
  sourceId: string,
  targetId: string,
): NetworkPath | null {
  const nodeIds = new Set(data.nodes.map((node) => node.id));
  if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return null;
  if (sourceId === targetId) return { nodeIds: [sourceId], edgeIds: [], hops: 0, evidenceRecords: [] };

  const adjacency = new Map<string, Array<{ nodeId: string; edgeId: string }>>();
  nodeIds.forEach((nodeId) => adjacency.set(nodeId, []));
  data.edges.forEach((edge) => {
    adjacency.get(edge.source)?.push({ nodeId: edge.target, edgeId: edge.id });
    adjacency.get(edge.target)?.push({ nodeId: edge.source, edgeId: edge.id });
  });

  const predecessor = new Map<string, { nodeId: string; edgeId: string }>();
  const visited = new Set([sourceId]);
  const queue = [sourceId];
  let queueIndex = 0;

  while (queueIndex < queue.length && !visited.has(targetId)) {
    const currentId = queue[queueIndex];
    queueIndex += 1;
    (adjacency.get(currentId) ?? []).forEach(({ nodeId, edgeId }) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      predecessor.set(nodeId, { nodeId: currentId, edgeId });
      queue.push(nodeId);
    });
  }

  if (!visited.has(targetId)) return null;

  const pathNodeIds = [targetId];
  const pathEdgeIds: string[] = [];
  let cursor = targetId;
  while (cursor !== sourceId) {
    const previous = predecessor.get(cursor);
    if (!previous) return null;
    pathNodeIds.push(previous.nodeId);
    pathEdgeIds.push(previous.edgeId);
    cursor = previous.nodeId;
  }
  pathNodeIds.reverse();
  pathEdgeIds.reverse();
  const edgeById = new Map(data.edges.map((edge) => [edge.id, edge]));
  const evidenceRecords = uniqueEvidence(
    pathEdgeIds.flatMap((edgeId) => edgeById.get(edgeId)?.evidenceRecords ?? []),
  );

  return {
    nodeIds: pathNodeIds,
    edgeIds: pathEdgeIds,
    hops: pathEdgeIds.length,
    evidenceRecords,
  };
}

/** Counts distinct evidence records, rather than inflated edge references. */
export function getEvidenceCount(value: EvidenceCarrier | Pick<MockNetworkData, "nodes" | "edges">): number {
  if ("nodes" in value && "edges" in value) {
    return uniqueEvidence([
      ...value.nodes.flatMap((node) => node.evidenceRecords),
      ...value.edges.flatMap((edge) => edge.evidenceRecords),
    ]).length;
  }
  return uniqueEvidence(value.evidenceRecords).length;
}

export function getNetworkNode(data: Pick<MockNetworkData, "nodes">, nodeId: string): MockNetworkNode | undefined {
  return data.nodes.find((node) => node.id === nodeId);
}

export function getNetworkEdge(data: Pick<MockNetworkData, "edges">, edgeId: string): MockNetworkEdge | undefined {
  return data.edges.find((edge) => edge.id === edgeId);
}
