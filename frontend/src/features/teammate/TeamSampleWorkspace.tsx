import { useCallback, useState } from "react";
import { Brain, Clock, Database, GitMerge, MapPin, Network } from "lucide-react";
import { InvestigationGraph } from "./components/InvestigationGraph";
import { TimelineIntelligence } from "./components/TimelineIntelligence";
import { EntityResolution } from "./components/EntityResolution";
import CrimeHotspotMap from "./components/CrimeHotspotMap";
import { AIInsights } from "./components/AIInsights";
import { mockNodes, mockEdges, mockEvents, mockEntityResolution, mockEvidence } from "./data";
import type { EventData, NodeData } from "./types";

const tabs = [
  { id: "network", label: "Network", icon: Network },
  { id: "evidence", label: "Evidence", icon: Database },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "identity", label: "Identity", icon: GitMerge },
  { id: "map", label: "Map", icon: MapPin },
  { id: "insights", label: "AI Insights", icon: Brain },
] as const;

/** The teammate's visual demo, explicitly isolated from stored case records. */
export function TeamSampleWorkspace({ onOpenLive }: { onOpenLive: () => void }) {
  const [tab, setTab] = useState<string>("network");
  const [node, setNode] = useState<NodeData | null>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [evidenceId, setEvidenceId] = useState<string>();
  const eventActive = useCallback((event: EventData) => setHighlighted(event.relatedNodes ?? []), []);
  function exportSample() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ source: "synthetic teammate sample", nodes: mockNodes, edges: mockEdges, evidence: mockEvidence }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "sutra-sample-investigation.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="team-ui">
    <div className="team-prototype-note">Sample investigation · All entities, map incidents and AI insights in this preview are fictional. <button className="text-button" onClick={onOpenLive}>Open live uploads</button></div>
    <div className="team-sample-tabs" role="tablist" aria-label="Sample investigation tools">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" id={"sample-tab-" + id} aria-selected={tab === id} aria-controls="sample-tool-panel" onClick={() => setTab(id)}><Icon size={14} />{label}</button>)}
    </div>
    <div id="sample-tool-panel" role="tabpanel" aria-labelledby={"sample-tab-" + tab} className={"team-sample-stage" + (tab === "evidence" || tab === "timeline" ? " team-sample-stage--scroll" : "")}>
      {tab === "network" && <>
        <InvestigationGraph nodes={mockNodes} edges={mockEdges} selectedNodeId={node?.id} onNodeSelect={setNode} highlightedNodeIds={highlighted} onExport={exportSample} />
        {node && <div className="team-graph-node-details"><h3>{node.label}</h3><p>{node.description}</p><small>Sample entity · {node.connections ?? 0} connections</small>
          <button onClick={() => setHighlighted([node.id, ...mockEdges.filter(e => e.source === node.id || e.target === node.id).flatMap(e => [e.source, e.target])])}>Show connections</button>
          <button onClick={() => { setEvidenceId(node.evidence?.[0]); setTab("evidence"); }}>View evidence</button>
          <button onClick={() => { setNode(null); setHighlighted([]); }}>Clear selection</button>
        </div>}
      </>}
      {tab === "timeline" && <><div style={{ height: 420 }}><TimelineIntelligence events={mockEvents} onEventActive={eventActive} /></div><div style={{ height: 350 }}><InvestigationGraph nodes={mockNodes} edges={mockEdges} highlightedNodeIds={highlighted} onNodeSelect={setNode} /></div></>}
      {tab === "identity" && <EntityResolution data={mockEntityResolution} />}
      {tab === "map" && <CrimeHotspotMap />}
      {tab === "insights" && <AIInsights />}
      {tab === "evidence" && <div className="page-stack">
        <section className="panel intake-body"><span className="eyebrow">Evidence hub</span><h2>From source to investigation.</h2><p>These are sample metadata records, not uploaded files. Store and process your own supported documents in the live workspace.</p><button className="button button--primary" onClick={onOpenLive}>Upload real evidence</button></section>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Sample evidence</th><th>Type</th><th>Source</th></tr></thead><tbody>{mockEvidence.filter(e => !evidenceId || e.id === evidenceId).map(e => <tr key={e.id}><td>{e.name}</td><td>{e.type}</td><td>Synthetic example</td></tr>)}</tbody></table></div>
        {evidenceId && <button className="button button--quiet" onClick={() => setEvidenceId(undefined)}>Show all sample evidence</button>}
      </div>}
    </div>
  </div>;
}
