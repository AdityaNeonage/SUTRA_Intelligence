import { useMemo, useState } from "react";
import { InvestigationMap } from "../../components/InvestigationMap";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { NetworkGraph } from "../../components/NetworkGraph";
import { demoCases } from "../demo/mockData";
import { useDemoExperience } from "../demo/DemoExperienceProvider";
import { filterLocations, locationEvents, locationGraph } from "./locationData";

export function FusionMapWorkbench({ onOpenNetwork, onOpenEvidence }: { onOpenNetwork: () => void; onOpenEvidence: (id?: string) => void }) {
  const reducedMotion = useReducedMotion();
  const [caseId, setCaseId] = useState("case-104");
  const [kind, setKind] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [entityId, setEntityId] = useState<string>();
  const { focusGraph } = useDemoExperience();
  const events = useMemo(() => filterLocations(caseId, kind, from, to), [caseId, kind, from, to]);
  const graph = useMemo(() => locationGraph(caseId), [caseId]);
  const selected = events.find(e => e.id === selectedId);
  const activeEntity = selected?.entityId ?? entityId;
  function selectEvent(id: string) { setSelectedId(id); setEntityId(events.find(e => e.id === id)?.entityId); }
  function openGraph() {
    // Preserve other demo graph additions when forwarding this context.
    let previous = { nodes: [], edges: [] } as typeof graph;
    try { previous = JSON.parse(sessionStorage.getItem("sutra.graph-update") || "{}"); } catch { /* optional demo state */ }
    const update = { nodes: [...(previous.nodes ?? []), ...graph.nodes], edges: [...(previous.edges ?? []), ...graph.edges] };
    sessionStorage.setItem("sutra.graph-update", JSON.stringify(update));
    if (activeEntity) focusGraph([activeEntity]);
    onOpenNetwork();
  }
  function reset() { setCaseId("case-104"); setKind(""); setFrom(""); setTo(""); setSelectedId(undefined); setEntityId(undefined); }
  return <div className="fusion-investigation">
    <div className="fusion-map-filters">
      <label>Case<select className="input" value={caseId} onChange={e => { setCaseId(e.target.value); setEntityId(undefined); setSelectedId(undefined); }}><option value="">All sample cases</option>{demoCases.map(c => <option value={c.id} key={c.id}>{c.reference}</option>)}</select></label>
      <label>Event type<select className="input" value={kind} onChange={e => { setKind(e.target.value); setSelectedId(undefined); }}><option value="">All events</option>{[...new Set(locationEvents.map(e => e.kind))].map(k => <option key={k}>{k}</option>)}</select></label>
      <label>From<input className="input" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></label>
      <label>To<input className="input" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
      <button className="button button--quiet" onClick={reset}>Reset filters</button>
    </div>
    <p className="fusion-demo-note">Synthetic demo: location coordinates are illustrative area-level context added for this map, not GPS extracted from the source records. {events.length} events match your filters.</p>
    <div className="fusion-investigation-grid">
      <section className="panel"><div className="panel__header"><h3>Investigation map</h3><span>Sample locations</span></div><InvestigationMap events={events} selectedId={selected?.id} relatedEntityId={activeEntity} onSelect={selectEvent} /></section>
      <section className="panel fusion-context-graph"><div className="panel__header"><h3>Network context</h3><button className="text-button" onClick={openGraph}>Open explorer</button></div>
        <NetworkGraph reducedMotion={reducedMotion} nodes={graph.nodes} edges={graph.edges} selectedNodeId={activeEntity} onNodeSelect={id => { setEntityId(id); setSelectedId(events.find(e => e.entityId === id)?.id); }} />
        <label className="fusion-entity-picker">Select entity<select className="input" value={activeEntity ?? ""} onChange={e => { setEntityId(e.target.value || undefined); setSelectedId(events.find(item => item.entityId === e.target.value)?.id); }}><option value="">Select graph entity</option>{graph.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}</select></label>
        {activeEntity && !events.some(e => e.entityId === activeEntity) && <p className="fusion-demo-note">No locations for this entity in the selected filters.</p>}
      </section>
      <section className="panel"><div className="panel__header"><h3>Event timeline</h3><span>{events.length} events</span></div><div className="fusion-event-list">{[...events].sort((a, b) => a.evidence.timestamp.localeCompare(b.evidence.timestamp)).map(event => <button key={event.id} className={event.id === selectedId ? "is-selected" : ""} onClick={() => selectEvent(event.id)}><time>{event.evidence.timestamp.slice(5, 16).replace("T", " ")}</time><strong>{event.kind}</strong><span>{event.location}</span></button>)}{!events.length && <p className="experience-empty">No events match. Reset filters to restore the sample locations.</p>}</div></section>
      <section className="panel"><div className="panel__header"><h3>Evidence details</h3><span>{selected ? selected.evidence.status : "Select an event"}</span></div>{selected ? <div className="fusion-evidence-detail" key={selected.id}><h3>{selected.kind}</h3><p>{selected.location} / {graph.nodes.find(n => n.id === selected.entityId)?.label}</p><p>{selected.evidence.timestamp.replace("T", " ")}</p><p><strong>{selected.evidence.documentRef}</strong> / {(selected.evidence.confidence * 100).toFixed(0)}% source confidence</p><p>{selected.evidence.excerpt}</p><small>Location: illustrative. Source status applies to the synthetic record, not geographic verification.</small><div className="workspace-action-row"><button className="button button--primary" onClick={openGraph}>Show network entity</button><button className="button button--quiet" onClick={() => onOpenEvidence(selected.evidenceId)}>Open evidence</button></div></div> : <p className="experience-empty">Select a marker, timeline event, or related graph entity.</p>}</section>
    </div>
  </div>;
}
