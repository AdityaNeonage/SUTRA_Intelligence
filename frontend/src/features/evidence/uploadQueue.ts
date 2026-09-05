import type { EvidenceUploadResponse } from "../../types/api";

export const acceptedEvidence = ".csv,.json,.txt,.md,.pdf,.docx";
export function validateEvidence(file: File): string | undefined {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!acceptedEvidence.split(",").includes(extension)) return "Unsupported type. Export spreadsheets as CSV; XLSX extraction is not supported.";
  if (!file.size) return "The file is empty.";
  if (file.size > 25 * 1024 * 1024) return "File exceeds 25 MB.";
}
export interface UploadItem {
  id: string; file: File; status: "queued" | "processing" | "completed" | "failed";
  error?: string; result?: EvidenceUploadResponse;
}
export async function processQueue(items: UploadItem[], send: (file: File) => Promise<EvidenceUploadResponse>, update: (id: string, patch: Partial<UploadItem>) => void) {
  for (const item of items) {
    if (item.status !== "queued") continue;
    update(item.id, { status: "processing", error: undefined });
    try { update(item.id, { status: "completed", result: await send(item.file) }); }
    catch (error) { update(item.id, { status: "failed", error: error instanceof Error ? error.message : "Upload failed. Try again." }); }
  }
}
