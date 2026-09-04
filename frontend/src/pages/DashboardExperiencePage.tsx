import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BellRing, CheckCircle2, CircleAlert, FolderKanban, Gauge, ListChecks, Network, Radar, ShieldAlert, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDemoExperience } from "../features/demo/DemoExperienceProvider";
import { formatDate, titleCase } from "../lib/format";
import type { DemoCase, EvidenceClassification } from "../features/demo/types";

function useCountUp(target: number, duration = 760) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setValue(target);
      return undefined;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, target]);
  return value;
}

function DashboardMetric({ label, value, detail, icon: Icon, tone = "cyan" }: { label: string; value: number; detail: string; icon: LucideIcon; tone?: "cyan" | "red" | "green" | "violet" }) {
  const display = useCountUp(value);
  return <article className={`experience-metric experience-metric--${tone}`}><div><span>{label}</span><Icon size={17} /></div><strong>{display.toLocaleString()}</strong><small>{detail}</small></article>;
}

const alerts = [
  { id: "alert-1", type: "NETWORK", title: "Bridge pattern needs review", description: "A shared synthetic account reference sits between two active contexts.", tone: "red" },
  { id: "alert-2", type: "EVIDENCE", title: "Source context added", description: "A device log has been linked with its confidence and reference visible.", tone: "cyan" },
  { id: "alert-3", type: "HYPOTHESIS", title: "Competing explanation open", description: "One observation remains uncorroborated and appears in the workbench as unknown.", tone: "violet" },
];

const evidenceStatusLabels: Record<EvidenceClassification, string> = {
  VERIFIED: "Verified",
  INFERRED: "Inferred",
  HYPOTHESIS: "Hypothesis",
};

const priorityRank: Record<DemoCase["priority"], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function DashboardExperiencePage({ onOpenCase, onOpenNetwork, onOpenHypotheses }: { onOpenCase: (caseId: string) => void; onOpenNetwork: () => void; onOpenHypotheses: () => void }) {
  const { cases, evidence, activities } = useDemoExperience();
  const activeCases = cases.filter((item) => item.status !== "ARCHIVED");
  const entityCount = cases.reduce((sum, item) => sum + item.entityCount, 0);
  const averageConfidence = evidence.length ? Math.round((evidence.reduce((sum, item) => sum + item.confidence, 0) / evidence.length) * 100) : 0;
  const evidenceMix = useMemo(() => (Object.keys(evidenceStatusLabels) as EvidenceClassification[]).map((status) => {
    const count = evidence.filter((item) => item.status === status).length;
    const percent = evidence.length ? Math.round((count / evidence.length) * 100) : 0;
    return { status, label: evidenceStatusLabels[status], count, percent };
  }), [evidence]);
  const priorityQueue = useMemo(() => [...activeCases]
    .sort((left, right) => priorityRank[right.priority] - priorityRank[left.priority] || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 3), [activeCases]);
  const latestActivity = useMemo(() => [...activities].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0], [activities]);

  return (
    <div className="experience-page dashboard-experience page-stack">
      <section className="experience-page-header experience-page-header--dashboard"><div><span className="eyebrow">SUTRA Command Center</span><h2>Evidence-led network intelligence.</h2><p>Review synthetic case signals, inspect relationship context, and keep uncertainty visible from the first interaction.</p></div><button className="button button--primary" onClick={onOpenNetwork}><Radar size={17} /> Open Network Explorer</button></section>
      <section className="experience-metric-grid"><DashboardMetric label="Active cases" value={activeCases.length} detail="Synthetic authorised portfolio" icon={FolderKanban} /><DashboardMetric label="Entities in context" value={entityCount} detail="Across local case records" icon={Network} tone="violet" /><DashboardMetric label="Evidence references" value={evidence.length} detail="With source and confidence" icon={Activity} tone="green" /><DashboardMetric label="Review signals" value={alerts.length} detail="Not determinations" icon={ShieldAlert} tone="red" /></section>
      <section className="dashboard-ops-ribbon" aria-label="Operational signal flow">
        <article><span><CheckCircle2 size={15} /> Source intake</span><strong>{evidence.length} records</strong><small>{averageConfidence}% average confidence</small></article>
        <article><span><Sparkles size={15} /> Entity context</span><strong>{entityCount} entities</strong><small>Case-scoped relationship hints</small></article>
        <article><span><Gauge size={15} /> CaseDNA pulse</span><strong>{priorityQueue[0]?.reference ?? "Ready"}</strong><small>{priorityQueue[0]?.priority ? `${titleCase(priorityQueue[0].priority)} priority lead` : "No active lead"}</small></article>
        <article><span><ListChecks size={15} /> Latest activity</span><strong>{latestActivity?.title ?? "Standing by"}</strong><small>{latestActivity ? formatDate(latestActivity.timestamp, true) : "No activity loaded"}</small></article>
      </section>
      <section className="dashboard-experience__grid">
        <article className="panel dashboard-network-card"><div className="panel__header"><div><span className="panel__eyebrow">Network overview</span><h3>Relationships arriving into focus</h3></div><button className="text-button" onClick={onOpenNetwork}>Inspect graph <ArrowRight size={14} /></button></div><div className="dashboard-network-card__visual"><span className="network-pulse" /><span className="network-node network-node--focal" /><span className="network-node network-node--one" /><span className="network-node network-node--two" /><span className="network-node network-node--three" /><span className="network-node network-node--four" /><i className="network-line network-line--one" /><i className="network-line network-line--two" /><i className="network-line network-line--three" /><i className="network-line network-line--four" /></div><div className="dashboard-network-card__foot"><span><i className="dashboard-dot dashboard-dot--red" /> Focal review point</span><span><i className="dashboard-dot" /> Source-aware links</span><button className="button button--quiet" onClick={onOpenHypotheses}>Compare explanations</button></div></article>
        <article className="panel dashboard-alerts"><div className="panel__header"><div><span className="panel__eyebrow">Recent alerts</span><h3>Needs investigator attention</h3></div><BellRing size={18} /></div><div className="dashboard-alerts__list">{alerts.map((alert, index) => <button className={`dashboard-alert dashboard-alert--${alert.tone}`} style={{ "--alert-delay": `${index * 90}ms` } as CSSProperties} key={alert.id} onClick={alert.type === "HYPOTHESIS" ? onOpenHypotheses : onOpenNetwork}><span>{alert.type}</span><strong>{alert.title}</strong><p>{alert.description}</p></button>)}</div></article>
      </section>
      <section className="dashboard-decision-grid">
        <article className="panel dashboard-confidence-card">
          <div className="panel__header"><div><span className="panel__eyebrow">Source confidence</span><h3>Evidence mix</h3></div><span className="panel__hint">{averageConfidence}% avg</span></div>
          <div className="dashboard-confidence-card__body">
            {evidenceMix.map((item) => <div className="dashboard-confidence-row" key={item.status}><div><strong>{item.label}</strong><span>{item.count} record{item.count === 1 ? "" : "s"}</span></div><em>{item.percent}%</em><i className={`dashboard-confidence-row__bar dashboard-confidence-row__bar--${item.status.toLowerCase()}`} style={{ "--confidence-width": `${item.percent}%` } as CSSProperties} /></div>)}
          </div>
        </article>
        <article className="panel dashboard-priority-board">
          <div className="panel__header"><div><span className="panel__eyebrow">Priority queue</span><h3>Cases to open next</h3></div><CircleAlert size={18} /></div>
          <div className="dashboard-priority-board__list">
            {priorityQueue.map((item) => <button key={item.id} onClick={() => onOpenCase(item.id)}><span><b>{item.reference}</b><strong>{item.title}</strong></span><em className={`priority priority--${item.priority.toLowerCase()}`}>{titleCase(item.priority)}</em><small>{item.entityCount} entities / {item.evidenceCount} evidence</small><ArrowRight size={15} /></button>)}
          </div>
        </article>
      </section>
      <section className="panel dashboard-case-list"><div className="panel__header"><div><span className="panel__eyebrow">Cases management</span><h3>Continue a workspace</h3></div><span className="panel__hint">{activities.length} timeline events</span></div><div className="dashboard-case-list__body">{activeCases.slice(0, 4).map((item) => <button key={item.id} onClick={() => onOpenCase(item.id)}><span><strong>{item.reference}</strong><small>{item.category}</small></span><span><b>{item.title}</b><small>Updated {formatDate(item.updatedAt, true)}</small></span><em className={`priority priority--${item.priority.toLowerCase()}`}>{titleCase(item.priority)}</em><ArrowRight size={16} /></button>)}</div></section>
    </div>
  );
}
