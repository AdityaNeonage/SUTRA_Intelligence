import { useMemo, useState } from "react";
import { FileSearch, Search, ShieldCheck } from "lucide-react";
import { EvidenceList, EvidenceReferenceCard } from "../features/demo/ExperienceWidgets";
import { useDemoExperience } from "../features/demo/DemoExperienceProvider";
import type { EvidenceReference } from "../features/demo/types";

export function EvidencePage({ initialEvidenceId, onOpenNetwork }: { initialEvidenceId?: string; onOpenNetwork: () => void }) {
  const { evidence, focusGraph } = useDemoExperience();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EvidenceReference | undefined>(() => evidence.find((item) => item.id === initialEvidenceId));
  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    return evidence.filter((item) => !query || [item.documentRef, item.title, item.source, item.kind, item.status].some((value) => value.toLowerCase().includes(query)));
  }, [evidence, search]);

  return (
    <div className="experience-page page-stack">
      <section className="experience-page-header"><div><span className="eyebrow">Evidence</span><h2>Every signal keeps a source reference.</h2><p>Confidence and evidence status are visible together. Inference is not displayed as verified fact.</p></div><div className="experience-header-stat"><ShieldCheck size={17} /><span>{evidence.length} references</span></div></section>
      <section className="panel experience-filter-bar"><label className="input-with-icon experience-search"><Search size={16} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find document reference, source, or evidence type..." /></label></section>
      <section className="evidence-page-layout">
        <article className="panel workspace-evidence"><div className="panel__header"><div><span className="panel__eyebrow">Evidence register</span><h3>Source-aware synthetic records</h3></div></div><EvidenceList items={items} onInspect={(item) => setSelected(item)} /></article>
        <aside className="panel evidence-inspector"><div className="panel__header"><div><span className="panel__eyebrow">Evidence context</span><h3>{selected ? selected.documentRef : "Select a reference"}</h3></div><FileSearch size={18} /></div>{selected ? <div className="evidence-inspector__body"><EvidenceReferenceCard item={selected} compact /><button className="button button--primary button--wide" onClick={() => { focusGraph(selected.entityIds); onOpenNetwork(); }}>Highlight linked entities</button><p>This action focuses reviewable relationships in the local Network Explorer; it does not create a finding.</p></div> : <div className="experience-empty">Select an evidence card to inspect its source, confidence, timestamp, and linked entity context.</div>}</aside>
      </section>
    </div>
  );
}
