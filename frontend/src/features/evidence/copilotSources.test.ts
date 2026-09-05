import { expect, it } from "vitest";
import { copilotSources } from "./copilotSources";

it("keeps actual API document IDs and provenance, with honest missing-value fallbacks", () => {
  expect(copilotSources([{ id: "edge-1", evidence_status: "INFERRED", confidence: .72, evidence: { document_id: "doc-8", source_record_id: "row-3", text: "A uses B" }, timestamps: { observed_at: "2026-08-12" } }])[0]).toEqual({
    id: "edge-1", documentId: "doc-8", sourceRecordId: "row-3", text: "A uses B", status: "INFERRED", confidence: .72, timestamp: "2026-08-12",
  });
  expect(copilotSources([{}])[0].documentId).toBeUndefined();
  expect(copilotSources([{}])[0].status).toBeUndefined();
});
