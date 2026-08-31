import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { demoActivities, demoCases, demoEvidence } from "./mockData";
import type { DemoActivity, DemoCase, EvidenceReference, GraphUpdatePayload } from "./types";

interface CreateCaseInput {
  title: string;
  category: string;
  priority: DemoCase["priority"];
  description: string;
}

interface DemoExperienceValue {
  cases: DemoCase[];
  evidence: EvidenceReference[];
  activities: DemoActivity[];
  selectedCaseId: string;
  selectedActivityId?: string;
  selectCase: (caseId: string) => void;
  selectActivity: (activityId?: string) => void;
  createCase: (input: CreateCaseInput) => DemoCase;
  addAssistantGraphUpdate: () => GraphUpdatePayload;
  focusGraph: (entityIds: string[]) => void;
}

const DemoExperienceContext = createContext<DemoExperienceValue | undefined>(undefined);

function nowIso() {
  return new Date().toISOString();
}

function nextCaseReference(cases: DemoCase[]) {
  const highest = cases.reduce((max, item) => Math.max(max, Number(item.reference.replace(/\D/g, "")) || 0), 500);
  return `CASE-${highest + 1}`;
}

export function DemoExperienceProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<DemoCase[]>(demoCases);
  const [evidence, setEvidence] = useState<EvidenceReference[]>(demoEvidence);
  const [activities, setActivities] = useState<DemoActivity[]>(demoActivities);
  const [selectedCaseId, setSelectedCaseId] = useState("case-104");
  const [selectedActivityId, setSelectedActivityId] = useState<string>();

  const selectCase = useCallback((caseId: string) => setSelectedCaseId(caseId), []);
  const selectActivity = useCallback((activityId?: string) => setSelectedActivityId(activityId), []);

  const focusGraph = useCallback((entityIds: string[]) => {
    const detail = { entityIds };
    sessionStorage.setItem("sutra.graph-focus", JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent("sutra:graph-focus", { detail }));
  }, []);

  const createCase = useCallback((input: CreateCaseInput) => {
    const timestamp = nowIso();
    const record: DemoCase = {
      id: `case-local-${Date.now()}`,
      reference: nextCaseReference(cases),
      title: input.title.trim() || "Untitled synthetic case",
      category: input.category.trim() || "General review",
      description: input.description.trim() || "Synthetic local case created for the Phase 2 interface demonstration.",
      priority: input.priority,
      status: "ACTIVE",
      owner: "Current investigator",
      createdAt: timestamp,
      updatedAt: timestamp,
      entityCount: 0,
      evidenceCount: 0,
    };
    setCases((current) => [record, ...current]);
    setSelectedCaseId(record.id);
    setActivities((current) => [{
      id: `A-case-${Date.now()}`,
      caseId: record.id,
      timestamp,
      title: "Synthetic case created",
      description: "A local case workspace was created in this frontend-only demonstration.",
      category: "CASE",
      entityIds: [],
    }, ...current]);
    return record;
  }, [cases]);

  const addAssistantGraphUpdate = useCallback(() => {
    const timestamp = nowIso();
    const update: GraphUpdatePayload = {
      nodes: [
        { id: "person-rahul", label: "Rahul", entityType: "PERSON", caseIds: [selectedCaseId], confidence: 0.76, raw: { source: "assistant-demo" } },
        { id: "location-park-street", label: "Park Street", entityType: "LOCATION", caseIds: [selectedCaseId], confidence: 0.81, raw: { source: "assistant-demo" } },
        { id: "date-2026-08-12", label: "12 August", entityType: "DOCUMENT", caseIds: [selectedCaseId], confidence: 0.92, raw: { source: "assistant-demo", temporal_anchor: true } },
      ],
      edges: [
        {
          id: "rel-rahul-park-street",
          source: "person-rahul",
          target: "location-park-street",
          label: "LOCATED_AT",
          confidence: 0.71,
          evidenceStatus: "INFERRED",
          evidence: ["CHAT-104-01"],
          caseId: selectedCaseId,
          derivation: "Frontend assistant demonstration",
          raw: { source: "assistant-demo" },
        },
        {
          id: "rel-rahul-12-august",
          source: "person-rahul",
          target: "date-2026-08-12",
          label: "MENTIONED_IN",
          confidence: 0.92,
          evidenceStatus: "VERIFIED",
          evidence: ["CHAT-104-01"],
          caseId: selectedCaseId,
          derivation: "Frontend assistant demonstration",
          raw: { source: "assistant-demo" },
        },
      ],
    };
    const evidenceRecord: EvidenceReference = {
      id: "E-CHAT-104",
      caseId: selectedCaseId,
      documentRef: "CHAT-104-01",
      title: "Assistant demo message extraction",
      source: "Synthetic user-entered chat text",
      kind: "DOCUMENT",
      status: "INFERRED",
      confidence: 0.71,
      timestamp,
      excerpt: "The interface extracted Rahul, Park Street, and 12 August from a synthetic demonstration message. Review and corroboration remain required.",
      entityIds: update.nodes.map((node) => node.id),
    };
    setEvidence((current) => current.some((item) => item.id === evidenceRecord.id) ? current : [evidenceRecord, ...current]);
    setActivities((current) => [{
      id: "A-assistant-demo",
      caseId: selectedCaseId,
      timestamp,
      title: "Assistant graph action prepared",
      description: "Three extracted entities and two reviewable relationships were added to the local graph demonstration.",
      category: "ANALYSIS",
      entityIds: update.nodes.map((node) => node.id),
      evidenceId: evidenceRecord.id,
    }, ...current.filter((item) => item.id !== "A-assistant-demo")]);
    sessionStorage.setItem("sutra.graph-update", JSON.stringify(update));
    window.dispatchEvent(new CustomEvent<GraphUpdatePayload>("sutra:graph-update", { detail: update }));
    focusGraph(update.nodes.map((node) => node.id));
    return update;
  }, [focusGraph, selectedCaseId]);

  const value = useMemo<DemoExperienceValue>(() => ({
    cases,
    evidence,
    activities,
    selectedCaseId,
    selectedActivityId,
    selectCase,
    selectActivity,
    createCase,
    addAssistantGraphUpdate,
    focusGraph,
  }), [activities, addAssistantGraphUpdate, cases, createCase, evidence, focusGraph, selectActivity, selectCase, selectedActivityId, selectedCaseId]);

  return <DemoExperienceContext.Provider value={value}>{children}</DemoExperienceContext.Provider>;
}

export function useDemoExperience() {
  const value = useContext(DemoExperienceContext);
  if (!value) throw new Error("useDemoExperience must be used inside DemoExperienceProvider");
  return value;
}
