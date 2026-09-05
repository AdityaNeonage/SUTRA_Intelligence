import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Network } from "lucide-react";
import { useCases, useNeighborhood } from "../api/queries";
import { EmptyState, ErrorState, LoadingState } from "../components/DataState";
import { NetworkGraph, type NetworkGraphHandle } from "../components/NetworkGraph";
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
  const graphRef = useRef<NetworkGraphHandle | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const cases = useCases(token);
  const graph = useNeighborhood(token, { caseId, depth: 2 }, Boolean(caseId));

  useEffect(() => {
    if (!caseId && cases.data?.[0]?.id) onSelectCase(cases.data[0].id);
  }, [caseId, cases.data, onSelectCase]);

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
        <div><div className="eyebrow">Backend knowledge graph</div><h2>Explore relationships returned by the live API.</h2><p>Select a connection to inspect its evidence state, provenance, and confidence.</p></div>
        <label className="field-label" htmlFor="live-network-case">Case context<select id="live-network-case" className="input" value={caseId} onChange={(event) => { setSelectedEdgeId(undefined); onSelectCase(event.target.value); }}>{cases.data?.map((item) => <option key={item.id} value={item.id}>{item.case_number} - {item.title}</option>)}</select></label>
      </section>
      {nodes.length === 0 ? <EmptyState title="No graph data returned" description="This case has no processed entities or relationships yet." /> : (
        <section className="network-workspace">
          <article className="panel graph-panel">
            <div className="graph-panel__header"><div><span className="panel__eyebrow">Live graph</span><h3><Network size={16} /> {nodes.length} entities · {edges.length} relationships</h3></div><button className="button button--quiet" onClick={() => graphRef.current?.fit()}><Maximize2 size={15} /> Fit graph</button></div>
            <NetworkGraph ref={graphRef} nodes={nodes} edges={edges} selectedNodeId={entityId} emphasisNodeIds={entityId ? [entityId, ...edges.filter(edge => edge.source === entityId || edge.target === entityId).flatMap(edge => [edge.source, edge.target])] : undefined} selectedEdgeId={selectedEdgeId} onEdgeSelect={setSelectedEdgeId} onCanvasTap={() => setSelectedEdgeId(undefined)} />
            <div className="graph-legend"><span><i className="legend-line legend-line--verified" /> Verified</span><span><i className="legend-line legend-line--inferred" /> Inferred</span><span><i className="legend-line legend-line--hypothesis" /> Hypothesis</span></div>
          </article>
          <WhyPanel edge={selectedEdge} source={source} target={target} />
        </section>
      )}
    </div>
  );
}
