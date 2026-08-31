import { useEffect } from "react";
import { ArrowRight, GitBranch, Network, SearchCheck, Waypoints } from "lucide-react";
import { useBridges, useCases } from "../api/queries";
import { EmptyState, ErrorState, LoadingState } from "../components/DataState";
import { MetricCard } from "../components/MetricCard";
import { formatScore, titleCase } from "../lib/format";

export function AnalyticsPage({
  token,
  caseId,
  onSelectCase,
  onOpenNetwork,
}: {
  token: string;
  caseId?: string;
  onSelectCase: (caseId: string) => void;
  onOpenNetwork: () => void;
}) {
  const cases = useCases(token);
  const bridges = useBridges(token, caseId, Boolean(caseId));

  useEffect(() => {
    if (!caseId && cases.data?.[0]?.id) onSelectCase(cases.data[0].id);
  }, [caseId, cases.data, onSelectCase]);

  if (cases.isLoading) return <LoadingState label="Loading analytics context…" />;
  if (cases.isError) return <ErrorState error={cases.error} onRetry={() => void cases.refetch()} title="Analytics context unavailable" />;
  if (!caseId) return <EmptyState title="Select a case for analytics" description="Bridge detection is scoped to an authorised case or network context." />;

  const bridgeItems = bridges.data ?? [];
  const crossCaseBridges = bridgeItems.filter((bridge) => bridge.relatedCases.length > 1).length;
  const evidenceCount = bridgeItems.reduce((sum, bridge) => sum + bridge.supportingRelationships, 0);
  return (
    <div className="page-stack">
      <section className="page-intro page-intro--split"><div><div className="eyebrow">Graph analytics</div><h2>Bridge entities, with reasons.</h2><p>Bridge scoring helps investigators find nodes that connect communities or case contexts. It does not assess culpability.</p></div><button className="button button--primary" onClick={onOpenNetwork}><Network size={17} /> Inspect in network</button></section>
      <section className="metric-grid">
        <MetricCard label="Bridge entities" value={bridges.isLoading ? "…" : bridgeItems.length} detail="Returned for this context" icon={GitBranch} />
        <MetricCard label="Cross-case bridges" value={bridges.isLoading ? "…" : crossCaseBridges} detail="Linked to multiple cases" icon={Waypoints} tone="violet" />
        <MetricCard label="Supporting links" value={bridges.isLoading ? "…" : evidenceCount} detail="Relationships cited by scores" icon={SearchCheck} tone="green" />
      </section>
      <section className="analytics-layout">
        <article className="panel bridge-panel">
          <div className="panel__header"><div><span className="panel__eyebrow">Flagship finding</span><h3>Bridge entity detection</h3></div><span className="panel__hint">Case-scoped</span></div>
          {bridges.isLoading ? <LoadingState label="Calculating bridge analysis…" /> : bridges.isError ? <ErrorState error={bridges.error} onRetry={() => void bridges.refetch()} title="Bridge analysis unavailable" /> : bridgeItems.length ? <div className="bridge-list">{bridgeItems.map((bridge) => <article className="bridge-card" key={bridge.entityId}><div className="bridge-card__top"><div><span className="entity-type">{titleCase(bridge.entityType)}</span><h4>{bridge.label}</h4><p>{bridge.entityId}</p></div><div className="bridge-score"><span>Bridge score</span><strong>{formatScore(bridge.bridgeScore)}</strong></div></div><dl><div><dt>Related cases</dt><dd>{bridge.relatedCases.length || "—"}</dd></div><div><dt>Supporting relationships</dt><dd>{bridge.supportingRelationships || "—"}</dd></div></dl><div className="bridge-card__why"><strong>Why flagged</strong>{bridge.reasons.length ? <ul>{bridge.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>The analytics service did not return individual reasons.</p>}</div><button className="text-button" onClick={onOpenNetwork}>Inspect network <ArrowRight size={14} /></button></article>)}</div> : <EmptyState title="No bridge entities returned" description="There are no bridge findings for the selected case under the current evidence graph." />}
        </article>
        <aside className="panel analytics-method">
          <div className="panel__header"><div><span className="panel__eyebrow">Interpretation</span><h3>How to use this view</h3></div></div>
          <ol className="method-list"><li><span>01</span><p>Review the listed reasons and supporting relationship count.</p></li><li><span>02</span><p>Open the network and inspect the individual link provenance.</p></li><li><span>03</span><p>Validate with source records before recording an investigative conclusion.</p></li></ol>
          <label className="field-label" htmlFor="analytics-case">Analytics case context</label>
          <select id="analytics-case" className="input" value={caseId} onChange={(event) => onSelectCase(event.target.value)}>{cases.data?.map((item) => <option value={item.id} key={item.id}>{item.case_number} — {item.title}</option>)}</select>
        </aside>
      </section>
    </div>
  );
}
