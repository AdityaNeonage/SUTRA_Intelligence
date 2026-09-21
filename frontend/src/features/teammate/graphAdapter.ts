import type { GraphEdge, GraphNode } from "../../types/api";
import type { EdgeData, NodeData, NodeType } from "./types";

/**
 * Visual layout constants. They deliberately refer to the rendered node size,
 * not a risk score or an investigative conclusion.
 */
export const GRAPH_NODE_CLEARANCE = 66;
const GRAPH_CENTER = { x: 450, y: 340 };
const COLLISION_ITERATIONS = 54;
const SETTLE_ITERATIONS = 18;
const FINAL_SETTLE_ITERATIONS = 10;

const nodeTypes: Record<string, NodeType> = {
  person: "person", bank_account: "account", account: "account", phone: "phone",
  device: "device", ip_address: "device", location: "location", vehicle: "vehicle",
  organization: "organization", case: "case", transaction: "transaction",
  document: "evidence", email: "evidence",
};

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function initialPosition(index: number, total: number) {
  if (total <= 1) return { ...GRAPH_CENTER };
  // A golden-angle spiral avoids the common "same radial line" overlap before
  // the collision pass has to do any work.
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const radius = 150 + Math.sqrt(index) * 58;
  return {
    x: GRAPH_CENTER.x + Math.cos(angle) * radius,
    y: GRAPH_CENTER.y + Math.sin(angle) * radius * 0.72,
  };
}

type LayoutPoint = Pick<NodeData, "id" | "x" | "y"> & { anchorX: number; anchorY: number };

function placeInGrid(grid: Map<string, number[]>, index: number, node: LayoutPoint) {
  const gridX = Math.floor(node.x / GRAPH_NODE_CLEARANCE);
  const gridY = Math.floor(node.y / GRAPH_NODE_CLEARANCE);
  const key = `${gridX}:${gridY}`;
  const existing = grid.get(key) ?? [];
  existing.push(index);
  grid.set(key, existing);
  return { gridX, gridY };
}

/**
 * Separate overlapping display nodes using a spatial-hash broad phase.
 *
 * It is deterministic (the same API graph gives the same coordinates) and
 * considers only neighbouring cells rather than every possible node pair.
 * This is a presentation-only layout; it does not merge, discard, infer, or
 * modify any backend entity or relationship.
 */
export function resolveNodeCollisions(nodes: NodeData[]): NodeData[] {
  if (nodes.length < 2) return nodes.map(node => ({ ...node }));

  const originalOrder = new Map(nodes.map((node, index) => [node.id, index]));
  const layout = [...nodes]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) => ({ ...node, anchorX: node.x, anchorY: node.y }));

  const separate = (pullToAnchor: boolean) => {
    const grid = new Map<string, number[]>();
    layout.forEach((node, index) => {
      const { gridX, gridY } = placeInGrid(grid, index, node);
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const neighbours = grid.get(`${gridX + offsetX}:${gridY + offsetY}`) ?? [];
          for (const neighbourIndex of neighbours) {
            if (neighbourIndex === index) continue;
            const neighbour = layout[neighbourIndex];
            let dx = node.x - neighbour.x;
            let dy = node.y - neighbour.y;
            let distance = Math.hypot(dx, dy);
            if (distance >= GRAPH_NODE_CLEARANCE) continue;
            if (distance === 0) {
              const direction = stableHash(`${node.id}|${neighbour.id}`) / 0xffffffff * Math.PI * 2;
              dx = Math.cos(direction);
              dy = Math.sin(direction);
              distance = 1;
            }
            const movement = (GRAPH_NODE_CLEARANCE - distance) * 0.5;
            const xShift = dx / distance * movement;
            const yShift = dy / distance * movement;
            node.x += xShift;
            node.y += yShift;
            neighbour.x -= xShift;
            neighbour.y -= yShift;
          }
        }
      }
      if (pullToAnchor) {
        node.x += (node.anchorX - node.x) * 0.018;
        node.y += (node.anchorY - node.y) * 0.018;
      }
    });
  };

  for (let iteration = 0; iteration < COLLISION_ITERATIONS; iteration += 1) separate(true);
  // Final settling keeps the documented clearance after the gentle anchor pull.
  for (let iteration = 0; iteration < SETTLE_ITERATIONS; iteration += 1) separate(false);

  // The spatial hash is the fast broad phase. A short all-pairs final pass is
  // a precision guard for nodes that crossed a cell boundary while moving.
  for (let iteration = 0; iteration < FINAL_SETTLE_ITERATIONS; iteration += 1) {
    for (let left = 0; left < layout.length; left += 1) {
      for (let right = left + 1; right < layout.length; right += 1) {
        const first = layout[left];
        const second = layout[right];
        let dx = first.x - second.x;
        let dy = first.y - second.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= GRAPH_NODE_CLEARANCE) continue;
        if (distance === 0) {
          const direction = stableHash(`${first.id}|${second.id}`) / 0xffffffff * Math.PI * 2;
          dx = Math.cos(direction);
          dy = Math.sin(direction);
          distance = 1;
        }
        // The fractional pixel prevents floating-point rounding from leaving
        // a pair one hundredth of a pixel inside the promised clearance.
        const movement = (GRAPH_NODE_CLEARANCE - distance) * 0.5 + 0.01;
        first.x += dx / distance * movement;
        first.y += dy / distance * movement;
        second.x -= dx / distance * movement;
        second.y -= dy / distance * movement;
      }
    }
  }

  return layout
    .map(({ anchorX: _anchorX, anchorY: _anchorY, ...node }) => node)
    .sort((left, right) => (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0));
}

/** Presentation adapter only: never invent risk, relationships or provenance. */
export function toTeamGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  const connectionCounts = new Map<string, number>();
  for (const edge of edges) {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) ?? 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) ?? 0) + 1);
  }
  const originalOrder = new Map(nodes.map((node, index) => [node.id, index]));
  const orderedNodes = [...nodes].sort((left, right) => left.id.localeCompare(right.id));
  const total = orderedNodes.length;
  const mappedNodes: NodeData[] = orderedNodes.map((node, index) => {
    const position = initialPosition(index, total);
    return {
      id: node.id, label: node.label, type: nodeTypes[node.entityType.toLowerCase()] ?? "evidence",
      ...position,
      riskScore: 0, cases: node.caseIds.length,
      connections: connectionCounts.get(node.id) ?? 0,
    };
  });
  const mappedEdges: EdgeData[] = edges.map(edge => ({
    id: edge.id, source: edge.source, target: edge.target, label: edge.label,
    type: ["INFERRED", "HYPOTHESIS"].includes(edge.evidenceStatus.toUpperCase()) ? "inferred" : "linked_to",
    weight: 2, confidence: edge.confidence, evidenceIds: edge.evidence,
  }));
  const positionedNodes = resolveNodeCollisions(mappedNodes)
    .sort((left, right) => (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0));
  return { nodes: positionedNodes, edges: mappedEdges };
}
