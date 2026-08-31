import { describe, expect, it } from "vitest";
import { normalizeGraph, normalizeHealth } from "./normalizers";

describe("SUTRA API normalizers", () => {
  it("normalizes graph elements into the Cytoscape view model", () => {
    const graph = normalizeGraph({
      elements: {
        nodes: [{ data: { id: "person-1", name: "Aarav Singh", entity_type: "PERSON" } }],
        edges: [{ data: { id: "rel-1", source: "person-1", target: "phone-1", predicate: "USES", evidence_status: "VERIFIED", confidence: 0.94, source_records: ["CDR-001"] } }],
      },
    });

    expect(graph.nodes[0]).toMatchObject({ id: "person-1", label: "Aarav Singh", entityType: "PERSON" });
    expect(graph.edges[0]).toMatchObject({ id: "rel-1", source: "person-1", target: "phone-1", label: "USES", evidenceStatus: "VERIFIED", evidence: ["CDR-001"] });
  });

  it("normalizes health component maps", () => {
    const health = normalizeHealth({
      status: "healthy",
      version: "0.1.0",
      components: { database: { status: "online", detail: "reachable" } },
    });

    expect(health.status).toBe("healthy");
    expect(health.services).toEqual([{ name: "database", status: "online", detail: "reachable" }]);
  });
});
