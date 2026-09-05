function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function string(value: unknown) { return typeof value === "string" ? value : undefined; }
export function copilotSources(records: Array<Record<string, unknown>>) {
  return records.map((record, index) => {
    const evidence = object(record.evidence);
    const timestamps = object(record.timestamps);
    return { id: string(record.id) ?? String(index), documentId: string(evidence.document_id), sourceRecordId: string(evidence.source_record_id), text: string(evidence.text), status: string(record.evidence_status), confidence: typeof record.confidence === "number" ? record.confidence : undefined, timestamp: string(timestamps.observed_at) ?? string(timestamps.first_seen) };
  });
}
