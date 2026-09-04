import { useEffect } from "react";
import { ArrowRight, CalendarClock, Files, GitCompareArrows, Network, Tag } from "lucide-react";
import { useCaseDetail, useCases, useRelatedCases, useTimeline } from "../api/queries";
import { EmptyState, ErrorState, LoadingState } from "../components/DataState";
import { StatusPill } from "../components/StatusPill";
import { formatDate, formatPercent, titleCase } from "../lib/format";

export function CaseWorkspacePage({
  token,
  caseId,
  onSelectCase,
  onExploreNetwork,
}: {
  token: string;
  caseId?: string;
  onSelectCase: (caseId: string) => void;
  onExploreNetwork: () => void;
}) {
  const cases = useCases(token);
  const caseDetail = useCaseDetail(token, caseId);
  const relatedCases = useRelatedCases(token, caseId);
  const timeline = useTimeline(token, caseId);

  useEffect(() => {
    if (!caseId && cases.data?.[0]?.id) onSelectCase(cases.data[0].id);
  }, [caseId, cases.data, onSelectCase]);

  if (cases.isLoading || (caseId && caseDetail.isLoading)) return <LoadingState label="Opening case workspace..." />;
  if (cases.isError) return <ErrorState error={cases.error} onRetry={() => void cases.refetch()} title="Cases could not be retrieved" />;
  if (caseDetail.isError) return <ErrorState error={caseDetail.error} onRetry={() => void caseDetail.refetch()} title="Case details could not be retrieved" />;
  if (!caseId || !caseDetail.data) {
    return <EmptyState title="Select a case to begin" description="Choose an authorised case from the case list to inspect its relationships and intelligence signals." />;
  }

  const activeCase = caseDetail.data;
  return (
    <div className="page-stack">
      <section className="case-hero">
        <div className="case-hero__identity"><div className="eyebrow">Case workspace</div><h2>{activeCase.title}</h2><p>{activeCase.description || "No case description has been supplied."}</p><div className="case-meta"><span><Files size={14} /> {activeCase.case_number}</span><span><CalendarClock size={14} /> Opened {formatDate(activeCase.created_at)}</span><span><Tag size={14} /> {titleCase(activeCase.classification)}</span></div></div>
        <div className="case-hero__actions"><StatusPill status={activeCase.status} /><span className={`priority priority--${activeCase.priority.toLowerCase()}`}>{titleCase(activeCase.priority)}</span><button className="button button--primary" onClick={onExploreNetwork}><Network size={17} /> Open network</button></div>
      </section>
      <section className="case-layout">
        <article className="panel case-selector-panel">
          <div className="panel__header"><div><span className="panel__eyebrow">Authorised portfolio</span><h3>Switch case</h3></div><span className="panel__hint">{cases.data?.length ?? 0}</span></div>
          <div className="case-selector-list">
            {cases.data?.map((item) => <button key={item.id} className={`case-selector${item.id === activeCase.id ? " case-selector--active" : ""}`} onClick={() => onSelectCase(item.id)}><strong>{item.case_number}</strong><span>{item.title}</span><StatusPill status={item.status} /></button>)}
          </div>
        </article>
        <div className="case-main-column">
          <article className="panel">
            <div className="panel__header"><div><span className="panel__eyebrow">Case context</span><h3>Record details</h3></div></div>
            <dl className="record-grid">
              <div><dt>Case reference</dt><dd>{activeCase.case_number}</dd></div>
              <div><dt>Classification</dt><dd>{titleCase(activeCase.classification)}</dd></div>
              <div><dt>Priority</dt><dd>{titleCase(activeCase.priority)}</dd></div>
              <div><dt>Last updated</dt><dd>{formatDate(activeCase.updated_at, true)}</dd></div>
            </dl>
          </article>
          <article className="panel">
            <div className="panel__header"><div><span className="panel__eyebrow">Timeline intelligence</span><h3>Reported activity</h3></div></div>
            {timeline.isLoading ? <LoadingState compact label="Loading timeline..." /> : timeline.isError ? <ErrorState error={timeline.error} onRetry={() => void timeline.refetch()} title="Timeline unavailable" /> : timeline.data?.length ? (
              <ol className="event-timeline">{timeline.data.slice(0, 8).map((point, index) => <li key={`${point.timestamp}-${index}`}><span className="event-timeline__dot" /><div><strong>{point.label}</strong><p>{formatDate(point.timestamp, true)}</p></div><span>{point.count} event{point.count === 1 ? "" : "s"}</span></li>)}</ol>
            ) : <EmptyState title="No timeline events returned" description="Ingested events for this case will appear here once they are available." />}
          </article>
        </div>
        <article className="panel related-cases-panel">
          <div className="panel__header"><div><span className="panel__eyebrow">Cross-case intelligence</span><h3>Potentially related cases</h3></div><GitCompareArrows size={18} /></div>
          {relatedCases.isLoading ? <LoadingState compact label="Comparing cases..." /> : relatedCases.isError ? <ErrorState error={relatedCases.error} onRetry={() => void relatedCases.refetch()} title="Related-case analysis unavailable" /> : relatedCases.data?.length ? <ul className="related-case-list">{relatedCases.data.slice(0, 6).map((related) => <li key={related.caseId}><div><strong>{related.caseNumber}</strong><span>{related.title}</span></div><b>{formatPercent(related.similarity)}</b><p>{related.reasons.join(" - ") || related.sharedEntities.join(" - ") || "Supporting factors were not returned."}</p><button className="text-button" onClick={() => { onSelectCase(related.caseId); }} >Open case <ArrowRight size={14} /></button></li>)}</ul> : <EmptyState title="No related cases identified" description="The cross-case engine has not returned corroborated relationships for this case." />}
        </article>
      </section>
    </div>
  );
}
