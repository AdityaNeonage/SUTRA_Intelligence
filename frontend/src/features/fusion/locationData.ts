import { demoEvidence } from "../demo/mockData";
import type { GraphEdge, GraphNode } from "../../types/api";

export const locationEvents = [
  { id: "geo-meeting", evidenceId: "E-121", entityId: "person-rahul", kind: "Meeting point", location: "Park Street", lat: 22.5535, lng: 88.3513 },
  { id: "geo-transfer", evidenceId: "E-117", entityId: "bank-2290", kind: "ATM area", location: "Salt Lake Sector V", lat: 22.5728, lng: 88.4337 },
  { id: "geo-device", evidenceId: "E-134", entityId: "device-90a", kind: "Device area", location: "New Town", lat: 22.5878, lng: 88.4737 },
  { id: "geo-phone", evidenceId: "E-102", entityId: "phone-4421", kind: "Tower area", location: "Esplanade", lat: 22.5645, lng: 88.3518 },
  { id: "geo-collection", evidenceId: "E-203", entityId: "phone-4421", kind: "Evidence collection", location: "Howrah", lat: 22.5850, lng: 88.3420 },
  { id: "geo-sighting", evidenceId: "E-301", entityId: "person-rahul", kind: "Sighting", location: "Park Street", lat: 22.5518, lng: 88.3524 },
].map(event => ({ ...event, evidence: demoEvidence.find(item => item.id === event.evidenceId)! }));
export type LocationEvent = typeof locationEvents[number];
export function filterLocations(caseId: string, kind: string, from: string, to: string) {
  return locationEvents.filter(item => (!caseId || item.evidence.caseId === caseId) && (!kind || item.kind === kind)
    && (!from || item.evidence.timestamp.slice(0, 10) >= from) && (!to || item.evidence.timestamp.slice(0, 10) <= to));
}
export function locationGraph(caseId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const records = demoEvidence.filter(item => !caseId || item.caseId === caseId);
  const ids = [...new Set(records.flatMap(item => item.entityIds))];
  const labels: Record<string, string> = { "person-rahul": "Rahul", "phone-4421": "Handset •4421", "bank-2290": "Account •2290", "bank-7744": "Account •7744", "device-90a": "Device 90A", "location-park-street": "Park Street" };
  return {
    nodes: ids.map(id => ({ id, label: labels[id] ?? id, entityType: id.startsWith("bank") ? "BANK_ACCOUNT" : id.split("-")[0].toUpperCase(), caseIds: records.filter(r => r.entityIds.includes(id)).map(r => r.caseId), raw: { synthetic: true } })),
    edges: records.flatMap(record => record.entityIds.slice(1).map(id => ({
      id: `fusion-${record.id}-${id}`, source: record.entityIds[0], target: id, label: "ASSOCIATED_WITH",
      caseId: record.caseId, evidenceStatus: "INFERRED", evidence: [record.id], confidence: record.confidence,
      derivation: "Synthetic entities co-referenced by " + record.documentRef, raw: { synthetic: true },
    }))),
  };
}
