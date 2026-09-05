import { describe, expect, it } from "vitest";
import { toTeamGraph } from "./graphAdapter";
import type { GraphEdge, GraphNode } from "../../types/api";

const nodes: GraphNode[] = [
  { id: "account-1", label: "Account A", entityType: "BANK_ACCOUNT", caseIds: ["c1"], raw: {} },
  { id: "account-2", label: "Account B", entityType: "BANK_ACCOUNT", caseIds: ["c1"], raw: {} },
];
const edge: GraphEdge = { id: "edge-1", source: "account-1", target: "account-2", label: "Transfer", evidenceStatus: "VERIFIED", confidence: .82, evidence: ["record-1"], raw: {} };

describe("teammate graph backend adapter", () => {
  it("preserves real identifiers, provenance and confidence without fabricating risk", () => {
    const graph = toTeamGraph(nodes, [edge]);
    expect(graph.nodes.map(n => n.id)).toEqual(nodes.map(n => n.id));
    expect(graph.nodes.every(n => n.type === "account" && n.riskScore === 0 && n.connections === 1)).toBe(true);
    expect(graph.edges[0]).toMatchObject({ id: edge.id, source: edge.source, target: edge.target, confidence: .82, evidenceIds: ["record-1"], type: "linked_to" });
  });
  it("keeps inferred and hypothesis connections distinct from verified ones", () => {
    for (const evidenceStatus of ["INFERRED", "HYPOTHESIS"] as const)
      expect(toTeamGraph(nodes, [{ ...edge, evidenceStatus }]).edges[0].type).toBe("inferred");
  });
  it("handles empty and single-node cases with stable finite positions", () => {
    expect(toTeamGraph([], [])).toEqual({ nodes: [], edges: [] });
    expect(toTeamGraph(nodes.slice(0, 1), []).nodes[0]).toMatchObject({ x: 450, y: 340, connections: 0 });
    expect(toTeamGraph(nodes, [edge])).toEqual(toTeamGraph(nodes, [edge]));
  });
});
