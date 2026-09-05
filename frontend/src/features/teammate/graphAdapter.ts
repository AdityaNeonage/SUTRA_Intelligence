import type { GraphEdge, GraphNode } from "../../types/api";
import type { EdgeData, NodeData, NodeType } from "./types";

const nodeTypes: Record<string, NodeType> = {
  person: "person", bank_account: "account", account: "account", phone: "phone",
  device: "device", ip_address: "device", location: "location", vehicle: "vehicle",
  organization: "organization", case: "case", transaction: "transaction",
  document: "evidence", email: "evidence",
};

/** Presentation adapter only: never invent risk, relationships or provenance. */
export function toTeamGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  const mappedNodes: NodeData[] = nodes.map((node, index) => {
    const angle = index * (Math.PI * 2 / Math.max(nodes.length, 1));
    const radius = nodes.length < 2 ? 0 : 260 + (index % 3) * 55;
    return {
      id: node.id, label: node.label, type: nodeTypes[node.entityType.toLowerCase()] ?? "evidence",
      x: 450 + Math.cos(angle) * radius, y: 340 + Math.sin(angle) * radius * .68,
      riskScore: 0, cases: node.caseIds.length,
      connections: edges.filter(edge => edge.source === node.id || edge.target === node.id).length,
    };
  });
  const mappedEdges: EdgeData[] = edges.map(edge => ({
    id: edge.id, source: edge.source, target: edge.target, label: edge.label,
    type: ["INFERRED", "HYPOTHESIS"].includes(edge.evidenceStatus.toUpperCase()) ? "inferred" : "linked_to",
    weight: 2, confidence: edge.confidence, evidenceIds: edge.evidence,
  }));
  return { nodes: mappedNodes, edges: mappedEdges };
}
