import { useEffect, useMemo, useState } from "react";
import { Network } from "lucide-react";
import { useCases, useNeighborhood } from "../api/queries";
import { EmptyState, ErrorState, LoadingState } from "../components/DataState";
import { InvestigationGraph } from "../features/teammate/components/InvestigationGraph";
import { toTeamGraph } from "../features/teammate/graphAdapter";
import { WhyPanel } from "../components/WhyPanel";

export function LiveNetworkPage({
  token,
  caseId,
  onSelectCase,
  entityId,
}: {
  token: string;
  entityId?: string;
  caseId?: string;
  onSelectCase: (caseId: string) => void;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(entityId);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const cases = useCases(token);
  const graph = useNeighborhood(token, { caseId, depth: 2 }, Boolean(caseId));

  useEffect(() => {
    if (!caseId && cases.data?.[0]?.id) onSelectCase(cases.data[0].id);
  }, [caseId, cases.data, onSelectCase]);

  useEffect(() => { setSelectedNodeId(entityId); setSelectedEdgeId(undefined); }, [entityId, caseId]);
  const presentation = useMemo(() => toTeamGraph(graph.data?.nodes ?? [], graph.data?.edges ?? []), [graph.data]);
  const selectedEdge = useMemo(
    () => graph.data?.edges.find((edge) => edge.id === selectedEdgeId),
    [graph.data?.edges, selectedEdgeId],
  );
  const source = graph.data?.nodes.find((node) => node.id === selectedEdge?.source);
  const target = graph.data?.nodes.find((node) => node.id === selectedEdge?.target);

  if (cases.isLoading || (caseId && graph.isLoading)) return <LoadingState label="Loading backend relationship graph..." />;
  if (cases.isError) return <ErrorState error={cases.error} onRetry={() => void cases.refetch()} title="Cases could not be retrieved" />;
  if (!caseId) return <EmptyState title="No case selected" description="Load the synthetic dataset or select an authorised case to explore its graph." />;
  if (graph.isError) return <ErrorState error={graph.error} onRetry={() => void graph.refetch()} title="Network could not be retrieved" />;

  const nodes = graph.data?.nodes ?? [];
  const edges = graph.data?.edges ?? [];
  return (
    <div className="page-stack">
      <section className="page-intro page-intro--split">
        <div><div className="eyebrow">Backend knowledge graph</div><h2>Investigation graph.</h2><p>Nodes automatically separate when the graph is dense. Select a connection to inspect its evidence state, provenance, and confidence.</p></div>
        <label className="field-label" htmlFor="live-network-case">Case context<select id="live-network-case" className="input" value={caseId} onChange={(event) => { setSelectedEdgeId(undefined); onSelectCase(event.target.value); }}>{cases.data?.map((item) => <option key={item.id} value={item.id}>{item.case_number} - {item.title}</option>)}</select></label>
      </section>
      {nodes.length === 0 ? <EmptyState title="No graph data returned" description="This case has no processed entities or relationships yet." /> : (
        <section className="network-workspace">
          <article className="panel graph-panel">
            <div className="graph-panel__header"><div><span className="panel__eyebrow">Live graph</span><h3><Network size={16} /> {nodes.length} entities · {edges.length} relationships</h3></div><span className="panel__hint">Select an entity or connection</span></div>
            <div className="team-ui team-live-graph"><InvestigationGraph nodes={presentation.nodes} edges={presentation.edges} selectedNodeId={selectedNodeId} onNodeSelect={node => setSelectedNodeId(node?.id)} selectedEdgeId={selectedEdgeId} onEdgeSelect={setSelectedEdgeId} /></div>
            <div className="graph-legend"><span>Solid: recorded relationship</span><span>Dashed: inferred / hypothesis</span><span>Select a link for its actual evidence status.</span></div>
          </article>
          <div className="page-stack">
            {selectedNodeId && <section className="team-graph-node-details"><h3>{nodes.find(node => node.id === selectedNodeId)?.label ?? selectedNodeId}</h3><small>Relationships returned by the API. Select one for its supporting records.</small>
              {edges.filter(edge => edge.source === selectedNodeId || edge.target === selectedNodeId).map(edge => <button key={edge.id} onClick={() => setSelectedEdgeId(edge.id)}>{edge.label} · {nodes.find(node => node.id === (edge.source === selectedNodeId ? edge.target : edge.source))?.label}</button>)}
            </section>}
            <WhyPanel edge={selectedEdge} source={source} target={target} />
          </div>
        </section>
      )}
    </div>
  );
}
