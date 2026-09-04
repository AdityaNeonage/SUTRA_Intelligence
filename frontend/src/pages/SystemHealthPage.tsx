import { Activity, CircleAlert, Database, RefreshCw, ServerCog } from "lucide-react";
import { useSystemHealth } from "../api/queries";
import { EmptyState, ErrorState, LoadingState } from "../components/DataState";
import { StatusPill } from "../components/StatusPill";
import { formatDate } from "../lib/format";

export function SystemHealthPage() {
  const health = useSystemHealth();
  if (health.isLoading) return <LoadingState label="Checking SUTRA dependencies..." />;
  if (health.isError) return <ErrorState error={health.error} onRetry={() => void health.refetch()} title="System health unavailable" />;
  const current = health.data;
  const services = current?.services ?? [];
  return (
    <div className="page-stack">
      <section className="page-intro page-intro--split"><div><div className="eyebrow">Operational readiness</div><h2>System health and dependencies.</h2><p>Live status is read from the SUTRA API. It does not replace application logs or infrastructure monitoring.</p></div><button className="button button--quiet" onClick={() => void health.refetch()}><RefreshCw size={16} /> Refresh</button></section>
      <section className="system-overview"><article className="system-overview__status"><div><span>Overall status</span><h3>{current?.status ?? "Unknown"}</h3>{current?.timestamp && <p>Last reported {formatDate(current.timestamp, true)}</p>}</div><StatusPill status={current?.status} /></article><article className="system-overview__status"><div><span>Platform version</span><h3>{current?.version ?? "Not reported"}</h3><p>Version identifier returned by the API</p></div><ServerCog size={25} /></article><article className="system-overview__status"><div><span>Dependencies</span><h3>{services.length}</h3><p>Individual components reporting status</p></div><Database size={25} /></article></section>
      <section className="panel"><div className="panel__header"><div><span className="panel__eyebrow">Dependency probes</span><h3>Component readiness</h3></div><Activity size={18} /></div>{services.length ? <div className="health-grid">{services.map((service) => <article className="health-card" key={service.name}><div className="health-card__icon"><ServerCog size={18} /></div><div><h4>{service.displayName ?? service.name}</h4><p>{service.detail ?? "No component detail returned."}</p></div><StatusPill status={service.status} /></article>)}</div> : <EmptyState title="No component diagnostics returned" description="The health endpoint responded but did not provide individual dependency probes." icon={<CircleAlert size={23} />} />}</section>
    </div>
  );
}
