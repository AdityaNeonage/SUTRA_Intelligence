import { CalendarRange, LocateFixed } from "lucide-react";
import { TimelineFeed } from "../features/demo/ExperienceWidgets";
import { useDemoExperience } from "../features/demo/DemoExperienceProvider";

export function TimelinePage({ onOpenNetwork, onOpenEvidence }: { onOpenNetwork: () => void; onOpenEvidence: (evidenceId?: string) => void }) {
  const { activities, cases, selectedActivityId, selectActivity, focusGraph } = useDemoExperience();
  return (
    <div className="experience-page page-stack">
      <section className="experience-page-header"><div><span className="eyebrow">Activity timeline</span><h2>Follow the record, then inspect the graph.</h2><p>Select an event to keep it in context. The graph action highlights related synthetic entities; the document action opens its supporting evidence.</p></div><div className="experience-header-stat"><CalendarRange size={17} /><span>{activities.length} events</span></div></section>
      <section className="experience-timeline-layout">
        <article className="panel"><div className="panel__header"><div><span className="panel__eyebrow">All case activity</span><h3>Investigative event stream</h3></div><span className="panel__hint">Interactive</span></div><TimelineFeed items={activities} selectedActivityId={selectedActivityId} onSelect={(item) => selectActivity(item.id)} onHighlight={(item) => { focusGraph(item.entityIds); onOpenNetwork(); }} onOpenEvidence={(item) => onOpenEvidence(item.evidenceId)} /></article>
        <aside className="panel timeline-case-summary"><div className="panel__header"><div><span className="panel__eyebrow">Case context</span><h3>Activity by workspace</h3></div></div><div className="timeline-case-summary__items">{cases.map((item) => <div key={item.id}><span><LocateFixed size={14} /> {item.reference}</span><strong>{activities.filter((activity) => activity.caseId === item.id).length}</strong><small>{item.title}</small></div>)}</div></aside>
      </section>
    </div>
  );
}
