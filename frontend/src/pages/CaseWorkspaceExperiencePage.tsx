import { ArrowLeft, BrainCircuit, FileText, LocateFixed, Network, Sparkles, Users } from "lucide-react";
import { EvidenceList, TimelineFeed } from "../features/demo/ExperienceWidgets";
import { useDemoExperience } from "../features/demo/DemoExperienceProvider";
import { formatDate, titleCase } from "../lib/format";

export type WorkspaceTab = "overview" | "entities" | "network" | "timeline" | "evidence" | "hypotheses" | "assistant";

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "entities", label: "Entities" },
  { id: "network", label: "Network" },
  { id: "timeline", label: "Timeline" },
  { id: "evidence", label: "Evidence" },
  { id: "hypotheses", label: "Hypotheses" },
  { id: "assistant", label: "AI Assistant" },
];

const localEntities = [
  { id: "person-rahul", label: "Rahul", type: "PERSON", confidence: "76%", status: "Review context" },
  { id: "phone-4421", label: "Handset ending 4421", type: "PHONE", confidence: "96%", status: "Record backed" },
  { id: "bank-2290", label: "Account ••2290", type: "BANK_ACCOUNT", confidence: "93%", status: "Record backed" },
  { id: "device-90a", label: "Device fingerprint 90A", type: "DEVICE", confidence: "89%", status: "Record backed" },
  { id: "location-park-street", label: "Park Street", type: "LOCATION", confidence: "71%", status: "Needs corroboration" },
];

export function CaseWorkspaceExperiencePage({
  caseId,
  activeTab = "overview",
  onBack,
  onNavigateTab,
  onOpenNetwork,
  onOpenEvidence,
}: {
  caseId: string;
  activeTab?: WorkspaceTab;
  onBack: () => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onOpenNetwork: () => void;
  onOpenEvidence: (evidenceId?: string) => void;
}) {
  const { cases, evidence, activities, selectedActivityId, selectActivity, selectCase, focusGraph } = useDemoExperience();
  const activeCase = cases.find((item) => item.id === caseId) ?? cases[0];
  const caseEvidence = evidence.filter((item) => item.caseId === activeCase?.id);
  const caseActivities = activities.filter((item) => item.caseId === activeCase?.id);

  if (!activeCase) return null;

  function selectWorkspaceTab(tab: WorkspaceTab) {
    if (tab === "network") onOpenNetwork();
    else onNavigateTab(tab);
  }

  return (
    <div className="experience-page page-stack">
      <section className="workspace-case-header">
        <button className="text-button" onClick={onBack}><ArrowLeft size={15} /> All cases</button>
        <div className="workspace-case-header__main"><div><span className="eyebrow">{activeCase.reference} · {activeCase.category}</span><h2>{activeCase.title}</h2><p>{activeCase.description}</p><span className="workspace-case-header__updated">Updated {formatDate(activeCase.updatedAt, true)} · Owner {activeCase.owner}</span></div><div className="workspace-case-header__tags"><span className={`priority priority--${activeCase.priority.toLowerCase()}`}>{titleCase(activeCase.priority)}</span><span className={`experience-status experience-status--${activeCase.status.toLowerCase()}`}>{titleCase(activeCase.status)}</span></div></div>
      </section>
      <nav className="experience-tabs" aria-label="Case workspace areas">{tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? "experience-tabs__tab experience-tabs__tab--active" : "experience-tabs__tab"} onClick={() => selectWorkspaceTab(tab.id)}>{tab.label}</button>)}</nav>
      {activeTab === "overview" && <section className="workspace-overview">
        <div className="experience-stat-grid"><article><span>Entities</span><strong>{activeCase.entityCount}</strong><small>Across reviewed context</small></article><article><span>Evidence references</span><strong>{caseEvidence.length || activeCase.evidenceCount}</strong><small>Source-aware records</small></article><article><span>Open activity</span><strong>{caseActivities.length}</strong><small>Local timeline events</small></article></div>
        <div className="workspace-overview__grid">
          <article className="panel workspace-summary"><div className="panel__header"><div><span className="panel__eyebrow">Investigation posture</span><h3>Evidence remains the starting point.</h3></div></div><div className="workspace-summary__body"><p>Use the network to explore connections, then open source context before treating an analytical pattern as a lead.</p><div className="workspace-action-row"><button className="button button--primary" onClick={onOpenNetwork}><Network size={16} /> Explore network</button><button className="button button--quiet" onClick={() => onNavigateTab("hypotheses")}><BrainCircuit size={16} /> Compare hypotheses</button></div></div></article>
          <article className="panel workspace-network-preview"><div className="panel__header"><div><span className="panel__eyebrow">Network preview</span><h3>Relationship signal</h3></div><button className="text-button" onClick={onOpenNetwork}>Open explorer <LocateFixed size={14} /></button></div><div className="workspace-network-preview__canvas"><span className="preview-node preview-node--red" /><span className="preview-node preview-node--cyan preview-node--one" /><span className="preview-node preview-node--cyan preview-node--two" /><span className="preview-node preview-node--violet" /><i className="preview-link preview-link--one" /><i className="preview-link preview-link--two" /><i className="preview-link preview-link--three" /></div></article>
        </div>
        <article className="panel"><div className="panel__header"><div><span className="panel__eyebrow">Recent activity</span><h3>Traceable events</h3></div><button className="text-button" onClick={() => onNavigateTab("timeline")}>View timeline</button></div><TimelineFeed items={caseActivities.slice(0, 3)} selectedActivityId={selectedActivityId} onSelect={(item) => selectActivity(item.id)} onHighlight={(item) => { focusGraph(item.entityIds); onOpenNetwork(); }} onOpenEvidence={(item) => onOpenEvidence(item.evidenceId)} /></article>
      </section>}
      {activeTab === "entities" && <article className="panel"><div className="panel__header"><div><span className="panel__eyebrow">Entity registry</span><h3>Entities in current synthetic context</h3></div><span className="panel__hint">Click to center in graph</span></div><div className="workspace-entity-list">{localEntities.map((entity) => <button key={entity.id} onClick={() => { selectCase(activeCase.id); focusGraph([entity.id]); onOpenNetwork(); }}><span className={`entity-icon entity-icon--${entity.type.toLowerCase()}`}><Users size={15} /></span><span><strong>{entity.label}</strong><small>{titleCase(entity.type)} · confidence {entity.confidence}</small></span><em>{entity.status}</em></button>)}</div></article>}
      {activeTab === "timeline" && <article className="panel"><div className="panel__header"><div><span className="panel__eyebrow">Activity timeline</span><h3>Events with graph and evidence actions</h3></div></div><TimelineFeed items={caseActivities} selectedActivityId={selectedActivityId} onSelect={(item) => selectActivity(item.id)} onHighlight={(item) => { focusGraph(item.entityIds); onOpenNetwork(); }} onOpenEvidence={(item) => onOpenEvidence(item.evidenceId)} /></article>}
      {activeTab === "evidence" && <article className="panel workspace-evidence"><div className="panel__header"><div><span className="panel__eyebrow">Evidence first</span><h3>Source records in this case</h3></div><FileText size={18} /></div><EvidenceList items={caseEvidence} onInspect={(item) => onOpenEvidence(item.id)} /></article>}
      {activeTab === "hypotheses" && <section className="experience-redirect-card"><BrainCircuit size={25} /><div><h3>Hypothesis Workbench</h3><p>Compare competing explanations against the same evidence without treating the system as a decision-maker.</p></div><button className="button button--primary" onClick={() => onNavigateTab("hypotheses")}>Open workbench</button></section>}
      {activeTab === "assistant" && <section className="experience-redirect-card"><Sparkles size={25} /><div><h3>AI Assistant</h3><p>Prepare a cited, reviewable graph action from synthetic messages and source references.</p></div><button className="button button--primary" onClick={() => onNavigateTab("assistant")}>Open assistant</button></section>}
    </div>
  );
}
