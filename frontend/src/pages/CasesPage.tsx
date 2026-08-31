import { type FormEvent, useMemo, useState } from "react";
import { ArrowUpRight, Filter, Plus, Search, X } from "lucide-react";
import { useDemoExperience } from "../features/demo/DemoExperienceProvider";
import { formatDate, titleCase } from "../lib/format";
import type { DemoCase, DemoPriority } from "../features/demo/types";

type SortMode = "recent" | "priority" | "title";

const priorityWeight: Record<DemoPriority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function CasesPage({ onOpenCase }: { onOpenCase: (caseId: string) => void }) {
  const { cases, createCase } = useDemoExperience();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | DemoCase["status"]>("ALL");
  const [sort, setSort] = useState<SortMode>("recent");
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Financial fraud");
  const [priority, setPriority] = useState<DemoPriority>("MEDIUM");
  const [description, setDescription] = useState("");

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...cases]
      .filter((item) => status === "ALL" || item.status === status)
      .filter((item) => !query || [item.reference, item.title, item.category, item.owner].some((value) => value.toLowerCase().includes(query)))
      .sort((left, right) => {
        if (sort === "priority") return priorityWeight[right.priority] - priorityWeight[left.priority];
        if (sort === "title") return left.title.localeCompare(right.title);
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [cases, search, sort, status]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const record = createCase({ title, category, priority, description });
    setIsCreating(false);
    setTitle("");
    setDescription("");
    onOpenCase(record.id);
  }

  return (
    <div className="experience-page page-stack">
      <section className="experience-page-header">
        <div><span className="eyebrow">Case management</span><h2>Cases, with context ready to inspect.</h2><p>Search, filter, sort, and open synthetic case workspaces. Changes in this view remain local to the Phase 2 demonstration.</p></div>
        <button className="button button--primary" onClick={() => setIsCreating(true)}><Plus size={17} /> New case</button>
      </section>
      <section className="panel experience-filter-bar" aria-label="Case filters">
        <label className="input-with-icon experience-search"><Search size={16} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search case ID, title, category, owner…" /></label>
        <label className="experience-filter-select"><Filter size={15} /><select className="input" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="REVIEW">Review</option><option value="ARCHIVED">Archived</option></select></label>
        <label className="experience-filter-select"><span>Sort</span><select className="input" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="recent">Recently updated</option><option value="priority">Priority</option><option value="title">Title A–Z</option></select></label>
      </section>
      <section className="panel experience-cases-table-wrap">
        <div className="panel__header"><div><span className="panel__eyebrow">Authorised demonstration portfolio</span><h3>{filteredCases.length} case{filteredCases.length === 1 ? "" : "s"} in view</h3></div><span className="panel__hint">Synthetic data only</span></div>
        <div className="table-wrap">
          <table className="data-table experience-cases-table">
            <thead><tr><th>Case</th><th>Category</th><th>Priority</th><th>Status</th><th>Entities</th><th>Evidence</th><th>Updated</th><th /></tr></thead>
            <tbody>{filteredCases.map((item) => <tr key={item.id}>
              <td><button className="text-button text-button--case" onClick={() => onOpenCase(item.id)}><strong>{item.reference}</strong><span>{item.title}</span></button></td>
              <td>{item.category}</td>
              <td><span className={`priority priority--${item.priority.toLowerCase()}`}>{titleCase(item.priority)}</span></td>
              <td><span className={`experience-status experience-status--${item.status.toLowerCase()}`}>{titleCase(item.status)}</span></td>
              <td>{item.entityCount}</td><td>{item.evidenceCount}</td><td>{formatDate(item.updatedAt, true)}</td>
              <td><button className="icon-button" aria-label={`Open ${item.reference}`} onClick={() => onOpenCase(item.id)}><ArrowUpRight size={16} /></button></td>
            </tr>)}</tbody>
          </table>
        </div>
        {filteredCases.length === 0 && <div className="experience-empty">No local cases match those filters.</div>}
      </section>
      {isCreating && <div className="experience-modal-backdrop" role="presentation" onMouseDown={() => setIsCreating(false)}>
        <form className="experience-modal" role="dialog" aria-modal="true" aria-labelledby="create-case-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
          <div className="experience-modal__header"><div><span className="eyebrow">Local demonstration</span><h2 id="create-case-title">Create synthetic case</h2><p>It will stay in this browser session and is not sent to an API.</p></div><button className="icon-button" type="button" aria-label="Close" onClick={() => setIsCreating(false)}><X size={18} /></button></div>
          <label className="field-label" htmlFor="new-case-title">Case title</label><input id="new-case-title" className="input" autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g., Voucher Relay Review" />
          <div className="experience-form-row"><label className="field-label" htmlFor="new-case-category">Category<input id="new-case-category" className="input" value={category} onChange={(event) => setCategory(event.target.value)} /></label><label className="field-label" htmlFor="new-case-priority">Priority<select id="new-case-priority" className="input" value={priority} onChange={(event) => setPriority(event.target.value as DemoPriority)}><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label></div>
          <label className="field-label" htmlFor="new-case-description">Brief description<textarea id="new-case-description" className="input experience-textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should this synthetic review contain?" /></label>
          <div className="experience-modal__footer"><button className="button button--quiet" type="button" onClick={() => setIsCreating(false)}>Cancel</button><button className="button button--primary" type="submit"><Plus size={16} /> Create case</button></div>
        </form>
      </div>}
    </div>
  );
}
