// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { processQueue, validateEvidence, type UploadItem } from "./uploadQueue";
import type { EvidenceUploadResponse } from "../../types/api";

const receipt: EvidenceUploadResponse = { ingestion_id: "batch-1", filename: "ok.csv", status: "completed", file_hash: "hash", warnings: [], document_ids: ["doc-1"], entity_ids: [], relationship_ids: [] };
describe("case evidence queue", () => {
  it("accepts only implemented file types, rejecting empty and oversized files", () => {
    for (const ext of ["csv", "json", "txt", "md", "pdf", "docx"]) expect(validateEvidence(new File(["data"], "evidence." + ext))).toBeUndefined();
    expect(validateEvidence(new File(["data"], "sheet.XLSX"))).toContain("XLSX");
    expect(validateEvidence(new File([], "empty.txt"))).toContain("empty");
    expect(validateEvidence({ name: "large.csv", size: 25 * 1024 * 1024 + 1 } as File)).toContain("25 MB");
  });
  it("continues after a per-file failure and does not resend completed files", async () => {
    const items: UploadItem[] = ["bad.csv", "ok.csv"].map((name, i) => ({ id: String(i), file: new File(["data"], name), status: "queued" }));
    items.push({ id: "done", file: new File(["data"], "done.csv"), status: "completed", result: receipt });
    const send = vi.fn().mockRejectedValueOnce(new Error("Malformed CSV")).mockResolvedValueOnce(receipt);
    const updates: string[] = [];
    await processQueue(items, send, (id, patch) => { updates.push(id + ":" + patch.status); Object.assign(items.find(item => item.id === id)!, patch); });
    expect(updates).toEqual(["0:processing", "0:failed", "1:processing", "1:completed"]);
    expect(items[0].error).toBe("Malformed CSV");
    expect(items[1].result?.document_ids).toEqual(["doc-1"]);
    expect(send).toHaveBeenCalledTimes(2);
    items[0].status = "queued";
    await processQueue(items, vi.fn().mockResolvedValue(receipt), (id, patch) => Object.assign(items.find(item => item.id === id)!, patch));
    expect(items[0].status).toBe("completed");
    expect(items[0].error).toBeUndefined();
  });
});
