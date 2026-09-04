import { useEffect, useMemo, useState } from "react";
import { CalendarRange, LocateFixed, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { TimelineFeed } from "../features/demo/ExperienceWidgets";
import { useDemoExperience } from "../features/demo/DemoExperienceProvider";

export function TimelinePage({ onOpenNetwork, onOpenEvidence }: { onOpenNetwork: () => void; onOpenEvidence: (evidenceId?: string) => void }) {
  const { activities, cases, selectedActivityId, selectActivity, focusGraph } = useDemoExperience();
  const [isPlaying, setIsPlaying] = useState(false);
  const chronologicalActivities = useMemo(() => [...activities].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()), [activities]);
  const selectedIndex = Math.max(0, chronologicalActivities.findIndex((item) => item.id === selectedActivityId));
  const activeActivity = chronologicalActivities[selectedIndex];

  useEffect(() => {
    if (!isPlaying || chronologicalActivities.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      if (selectedIndex >= chronologicalActivities.length - 1) setIsPlaying(false);
      else selectActivity(chronologicalActivities[selectedIndex + 1].id);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [chronologicalActivities, isPlaying, selectActivity, selectedIndex]);

  const selectIndex = (index: number) => {
    const next = chronologicalActivities[Math.min(Math.max(index, 0), chronologicalActivities.length - 1)];
    if (next) selectActivity(next.id);
  };

  return (
    <div className="experience-page page-stack">
      <section className="experience-page-header"><div><span className="eyebrow">Activity timeline</span><h2>Follow the record, then inspect the graph.</h2><p>Select an event to keep it in context. The graph action highlights related synthetic entities; the document action opens its supporting evidence.</p></div><div className="experience-header-stat"><CalendarRange size={17} /><span>{activities.length} events</span></div></section>
      <section className="panel timeline-playback">
        <div className="timeline-playback__summary"><span className="panel__eyebrow">Timeline playback</span><strong>{activeActivity?.title ?? "No activity loaded"}</strong><small>{activeActivity ? new Date(activeActivity.timestamp).toLocaleString() : "Synthetic event stream ready"}</small></div>
        <div className="timeline-playback__track" aria-label="Investigation timeline playback">
          <i><b style={{ width: chronologicalActivities.length > 1 ? `${(selectedIndex / (chronologicalActivities.length - 1)) * 100}%` : "0%" }} /></i>
          <div>{chronologicalActivities.map((activity, index) => <button key={activity.id} className={`${index === selectedIndex ? "is-active" : ""}${index < selectedIndex ? " is-past" : ""}`} onClick={() => { setIsPlaying(false); selectIndex(index); }} aria-label={`Select ${activity.title}`}><span /></button>)}</div>
        </div>
        <div className="timeline-playback__controls">
          <button onClick={() => { setIsPlaying(false); selectIndex(selectedIndex - 1); }} aria-label="Previous timeline event"><SkipBack size={15} /></button>
          <button className="is-primary" onClick={() => { if (selectedIndex === chronologicalActivities.length - 1) selectIndex(0); setIsPlaying((current) => !current); }} aria-label={isPlaying ? "Pause timeline" : "Play timeline"}>{isPlaying ? <Pause size={15} /> : <Play size={15} />}</button>
          <button onClick={() => { setIsPlaying(false); selectIndex(selectedIndex + 1); }} aria-label="Next timeline event"><SkipForward size={15} /></button>
        </div>
      </section>
      <section className="experience-timeline-layout">
        <article className="panel"><div className="panel__header"><div><span className="panel__eyebrow">All case activity</span><h3>Investigative event stream</h3></div><span className="panel__hint">Interactive</span></div><TimelineFeed items={chronologicalActivities} selectedActivityId={selectedActivityId} onSelect={(item) => { setIsPlaying(false); selectActivity(item.id); }} onHighlight={(item) => { focusGraph(item.entityIds); onOpenNetwork(); }} onOpenEvidence={(item) => onOpenEvidence(item.evidenceId)} /></article>
        <aside className="panel timeline-case-summary"><div className="panel__header"><div><span className="panel__eyebrow">Case context</span><h3>Activity by workspace</h3></div></div><div className="timeline-case-summary__items">{cases.map((item) => <div key={item.id}><span><LocateFixed size={14} /> {item.reference}</span><strong>{activities.filter((activity) => activity.caseId === item.id).length}</strong><small>{item.title}</small></div>)}</div></aside>
      </section>
    </div>
  );
}
