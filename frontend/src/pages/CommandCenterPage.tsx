import { ArrowUpRight, BriefcaseBusiness, CircleDotDashed, Database, Radar } from "lucide-react";
import { useCases } from "../api/queries";
import { EmptyState, ErrorState, LoadingState } from "../components/DataState";
import { MetricCard } from "../components/MetricCard";
import { StatusPill } from "../components/StatusPill";
import { formatDate, titleCase } from "../lib/format";
import type { CaseRecord, HealthResponse } from "../types/api";

function CaseRows({ cases, onOpenCase }: { cases: CaseRecord[]; onOpenCase: (caseId: string) => void }) {
  if (cases.length === 0) {
    return <EmptyState title="No authorised cases available" description="Cases assigned to this account will appear here." />;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>Case</th><th>Priority</th><th>Status</th><th>Classification</th><th>Updated</th><th /></tr></thead>
        <tbody>
          {cases.slice(0, 7).map((caseRecord) => (
            <tr key={caseRecord.id}>
              <td><button className="text-button text-button--case" onClick={() => onOpenCase(caseRecord.id)}><strong>{caseRecord.case_number}</strong><span>{caseRecord.title}</span></button></td>
              <td><span className={`priority priority--${caseRecord.priority.toLowerCase()}`}>{titleCase(caseRecord.priority)}</span></td>
              <td><StatusPill status={caseRecord.status} /></td>
              <td><span className="classification">{titleCase(caseRecord.classification)}</span></td>
              <td>{formatDate(caseRecord.updated_at, true)}</td>
              <td><button className="icon-button" onClick={() => onOpenCase(caseRecord.id)} aria-label={`Open ${caseRecord.case_number}`}><ArrowUpRight size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CommandCenterPage({
  token,
  health,
  onOpenCase,
  onOpenNetwork,
}: {
  token: string;
  health?: HealthResponse;
  onOpenCase: (caseId: string) => void;
  onOpenNetwork: () => void;
}) {
  const cases = useCases(token);
  const allCases = cases.data ?? [];
  const activeCases = allCases.filter((caseRecord) => !["CLOSED", "ARCHIVED", "RESOLVED"].includes(caseRecord.status.toUpperCase())).length;
  const highPriority = allCases.filter((caseRecord) => ["HIGH", "CRITICAL", "URGENT"].includes(caseRecord.priority.toUpperCase())).length;
  const classifications = new Set(allCases.map((caseRecord) => caseRecord.classification).filter(Boolean)).size;

  return (
    <div className="page-stack">
      <section className="page-intro page-intro--split">
        <div><div className="eyebrow">Operational overview</div><h2>Situational awareness, grounded in records.</h2><p>Review your authorised case portfolio and explore relationship intelligence with provenance in view.</p></div>
        <button className="button button--primary" onClick={onOpenNetwork}><Radar size={17} /> Explore network</button>
      </section>
      <section className="metric-grid" aria-label="Case portfolio metrics">
        <MetricCard label="Assigned cases" value={cases.isLoading ? "…" : allCases.length} detail="Authorised case records" icon={BriefcaseBusiness} />
        <MetricCard label="Active investigations" value={cases.isLoading ? "…" : activeCases} detail="Not closed or archived" icon={CircleDotDashed} tone="violet" />
        <MetricCard label="Priority attention" value={cases.isLoading ? "…" : highPriority} detail="High, critical, or urgent" icon={Radar} tone="amber" />
        <MetricCard label="Classifications" value={cases.isLoading ? "…" : classifications} detail="Across available cases" icon={Database} tone="green" />
      </section>
      <section className="dashboard-grid">
        <article className="panel panel--cases">
          <div className="panel__header"><div><span className="panel__eyebrow">Case portfolio</span><h3>Recent authorised cases</h3></div><span className="panel__hint">{allCases.length} total</span></div>
          {cases.isLoading ? <LoadingState /> : cases.isError ? <ErrorState error={cases.error} onRetry={() => void cases.refetch()} title="Cases could not be retrieved" /> : <CaseRows cases={allCases} onOpenCase={onOpenCase} />}
        </article>
        <article className="panel panel--system-readout">
          <div className="panel__header"><div><span className="panel__eyebrow">System readout</span><h3>Service readiness</h3></div><StatusPill status={health?.status} /></div>
          {health?.services && health.services.length > 0 ? (
            <ul className="service-list">
              {health.services.map((service) => <li key={service.name}><div><strong>{service.displayName ?? service.name}</strong><span>{service.detail ?? "No detail returned"}</span></div><StatusPill status={service.status} /></li>)}
            </ul>
          ) : <EmptyState title="No dependency detail returned" description="The health endpoint is online but did not expose individual service states." />}
        </article>
      </section>
      <section className="notice-card">
        <div className="notice-card__glyph">i</div>
        <div><strong>Interpret with care</strong><p>Network patterns, bridge scores, and case links are investigative leads. Inspect the supporting records before making decisions.</p></div>
      </section>
    </div>
  );
}
