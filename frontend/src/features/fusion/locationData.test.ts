import { describe, expect, it } from "vitest";
import { filterLocations, locationEvents, locationGraph } from "./locationData";

describe("synthetic map-to-graph context", () => {
  it("uses existing evidence IDs and related entities for every marker", () => {
    for (const event of locationEvents) {
      expect(event.evidence.id).toBe(event.evidenceId);
      expect(event.evidence.entityIds).toContain(event.entityId);
      expect(locationGraph(event.evidence.caseId).nodes.map(node => node.id)).toContain(event.entityId);
    }
  });
  it("filters by case, type and inclusive date range", () => {
    const event = locationEvents[0];
    const day = event.evidence.timestamp.slice(0, 10);
    expect(filterLocations(event.evidence.caseId, event.kind, day, day)).toContain(event);
    expect(filterLocations("unknown", "", "", "")).toEqual([]);
    expect(filterLocations("", "", "2099-01-01", "")).toEqual([]);
    expect(filterLocations("", "", "", "")).toHaveLength(locationEvents.length);
  });
  it("labels co-references as inferred with inspectable citations", () => {
    const graph = locationGraph("case-104");
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.edges.every(edge => edge.evidenceStatus === "INFERRED" && edge.evidence?.length)).toBe(true);
    expect(graph.edges.every(edge => graph.nodes.some(n => n.id === edge.source) && graph.nodes.some(n => n.id === edge.target))).toBe(true);
  });
});
