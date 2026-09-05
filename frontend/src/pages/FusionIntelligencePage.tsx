import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Fingerprint,
  GitMerge,
  LocateFixed,
  MapPin,
  Network,
  Pause,
  Play,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Upload,
  Workflow,
  XCircle,
} from "lucide-react";
import "../styles/fusion.css";

import { FusionMapWorkbench } from "../features/fusion/FusionMapWorkbench";

type FusionMode = "map" | "hotspots" | "resolution" | "pipeline";
type Severity = "Critical" | "High" | "Medium" | "Low";
type ReviewState = "Pending review" | "Confirmed match" | "Kept separate";

interface HotspotSignal {
  id: string;
  label: string;
  zone: string;
  x: number;
  y: number;
  severity: Severity;
  category: string;
  cases: number;
  signals: number;
  status: string;
}

interface ResolutionCandidate {
  id: string;
  primary: { name: string; reference: string; phone: string; location: string; dob: string };
  candidate: { name: string; reference: string; phone: string; location: string; dob: string };
  score: number;
  matches: string[];
  conflicts: string[];
  sources: string[];
}

const hotspotSignals: HotspotSignal[] = [
  { id: "HS-01", label: "Park Street", zone: "Central Kolkata", x: 52, y: 47, severity: "Critical", category: "Cross-case convergence", cases: 4, signals: 18, status: "Escalated for review" },
  { id: "HS-02", label: "Salt Lake", zone: "Bidhannagar", x: 72, y: 30, severity: "High", category: "Shared device activity", cases: 3, signals: 12, status: "Active monitoring" },
  { id: "HS-03", label: "Howrah Yard", zone: "Howrah", x: 25, y: 56, severity: "High", category: "Vehicle-location overlap", cases: 2, signals: 9, status: "Evidence requested" },
  { id: "HS-04", label: "New Town", zone: "Rajarhat", x: 86, y: 20, severity: "Medium", category: "Account access cluster", cases: 2, signals: 7, status: "Analyst triage" },
  { id: "HS-05", label: "Ballygunge", zone: "South Kolkata", x: 58, y: 73, severity: "Low", category: "Uncorroborated observation", cases: 1, signals: 3, status: "Context only" },
  { id: "HS-06", label: "Esplanade", zone: "Central Kolkata", x: 43, y: 39, severity: "Medium", category: "Communication burst", cases: 2, signals: 6, status: "Needs corroboration" },
];

const resolutionCandidates: ResolutionCandidate[] = [
  {
    id: "ER-104-01",
    primary: { name: "Rahul Verma", reference: "CASE-104 / P-037", phone: "+91 ******0217", location: "Park Street, Kolkata", dob: "19**-04-12" },
    candidate: { name: "R. Verma", reference: "CASE-087 / P-112", phone: "+91 ******0217", location: "Central Kolkata", dob: "19**-04-12" },
    score: 94,
    matches: ["Masked phone", "Date of birth", "Surname", "City context"],
    conflicts: ["First-name precision", "Location granularity"],
    sources: ["CDR-104-07", "DOC-087-04", "WIT-104-03"],
  },
  {
    id: "ER-311-02",
    primary: { name: "Nexus Logistics", reference: "CASE-104 / ORG-09", phone: "+91 ******8840", location: "Salt Lake, Kolkata", dob: "Registered 2019" },
    candidate: { name: "Nexus Logistic Services", reference: "CASE-311 / ORG-31", phone: "+91 ******8849", location: "New Town, Kolkata", dob: "Registered 2020" },
    score: 72,
    matches: ["Name tokens", "Operating region", "Shared device reference"],
    conflicts: ["Phone suffix", "Registration year", "Registered address"],
    sources: ["DEV-104-19", "CCTV-311-02"],
  },
  {
    id: "ER-087-03",
    primary: { name: "Device D-131", reference: "CASE-104 / DEVICE", phone: "Fingerprint 90:A", location: "Recovered record", dob: "First seen 12 Aug" },
    candidate: { name: "Delta-19", reference: "CASE-087 / DEVICE", phone: "Fingerprint 90:A", location: "Remote session", dob: "First seen 19 Aug" },
    score: 86,
    matches: ["Browser fingerprint", "Operating system", "Account access pattern"],
    conflicts: ["First-seen timestamp", "Reported device label"],
    sources: ["DEV-104-19", "DOC-087-04"],
  },
];

const pipelineStages = [
  { id: "intake", label: "Evidence intake", description: "Register the file, source, case scope, and checksum before analysis begins.", icon: Upload, output: "6 source records indexed", confidence: "Source metadata retained" },
  { id: "extract", label: "Entity extraction", description: "Identify candidate people, accounts, devices, vehicles, dates, and locations.", icon: FileSearch, output: "14 candidate entities", confidence: "Confidence range 71-99%" },
  { id: "resolve", label: "Entity resolution", description: "Compare candidates across cases while keeping conflicts visible for human review.", icon: Fingerprint, output: "3 possible matches", confidence: "No automatic merging" },
  { id: "graph", label: "Relationship graph", description: "Create traceable nodes and links with source references and evidence classifications.", icon: Network, output: "17 reviewable links", confidence: "Verified and inferred separated" },
  { id: "insights", label: "Investigator insights", description: "Surface bridge entities, hotspots, missing context, and next-evidence suggestions.", icon: Sparkles, output: "4 prioritised leads", confidence: "Decision support only" },
];

const severityOrder: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

function HotspotWorkbench({ onOpenNetwork }: { onOpenNetwork: () => void }) {
  const [filter, setFilter] = useState<"All" | Severity>("All");
  const visibleSignals = useMemo(() => hotspotSignals.filter((item) => filter === "All" || item.severity === filter), [filter]);
  const [selectedId, setSelectedId] = useState(hotspotSignals[0].id);
  const selected = hotspotSignals.find((item) => item.id === selectedId) ?? visibleSignals[0] ?? hotspotSignals[0];
  const ranked = [...hotspotSignals].sort((left, right) => severityOrder[right.severity] - severityOrder[left.severity] || right.signals - left.signals);

  useEffect(() => {
    if (!visibleSignals.some((item) => item.id === selectedId) && visibleSignals[0]) setSelectedId(visibleSignals[0].id);
  }, [selectedId, visibleSignals]);

  return (
    <div className="fusion-workbench fusion-workbench--hotspots">
      <article className="panel fusion-map-panel">
        <div className="panel__header">
          <div><span className="panel__eyebrow">Synthetic geospatial context</span><h3>Crime signal convergence map</h3></div>
          <span className="panel__hint">{visibleSignals.length} zones visible</span>
        </div>
        <div className="fusion-filter-row" aria-label="Filter hotspot severity">
          {(["All", "Critical", "High", "Medium", "Low"] as const).map((level) => <button key={level} className={filter === level ? "is-active" : ""} onClick={() => setFilter(level)}>{level}</button>)}
        </div>
        <div className="fusion-map" role="img" aria-label="Stylised synthetic hotspot map of Kolkata">
          <div className="fusion-map__river" />
          <span className="fusion-map__zone fusion-map__zone--north">NORTH</span>
          <span className="fusion-map__zone fusion-map__zone--central">CENTRAL</span>
          <span className="fusion-map__zone fusion-map__zone--east">EAST</span>
          <span className="fusion-map__zone fusion-map__zone--south">SOUTH</span>
          {visibleSignals.map((item) => (
            <button
              key={item.id}
              className={`fusion-map__marker fusion-map__marker--${item.severity.toLowerCase()}${selected.id === item.id ? " is-selected" : ""}`}
              style={{ "--marker-x": `${item.x}%`, "--marker-y": `${item.y}%` } as CSSProperties}
              onClick={() => setSelectedId(item.id)}
              aria-label={`${item.label}, ${item.severity} severity`}
            >
              <i /><span>{item.signals}</span><strong>{item.label}</strong>
            </button>
          ))}
          <div className="fusion-map__legend"><span><i className="is-critical" /> Critical</span><span><i className="is-high" /> High</span><span><i className="is-medium" /> Medium</span><span><i className="is-low" /> Low</span></div>
        </div>
      </article>

      <aside className="fusion-side-stack">
        <article className="panel fusion-selected-card">
          <div className="panel__header"><div><span className="panel__eyebrow">Selected zone</span><h3>{selected.label}</h3></div><span className={`fusion-severity fusion-severity--${selected.severity.toLowerCase()}`}>{selected.severity}</span></div>
          <div className="fusion-selected-card__body">
            <span><LocateFixed size={15} /> {selected.zone}</span>
            <h4>{selected.category}</h4>
            <div className="fusion-signal-metrics"><div><strong>{selected.cases}</strong><small>linked cases</small></div><div><strong>{selected.signals}</strong><small>review signals</small></div></div>
            <p>{selected.status}. This map groups synthetic signals for prioritisation; it does not predict crime or identify culpability.</p>
            <button className="button button--primary button--wide" onClick={onOpenNetwork}>Inspect linked network <ArrowRight size={15} /></button>
          </div>
        </article>
        <article className="panel fusion-ranking-card">
          <div className="panel__header"><div><span className="panel__eyebrow">Priority ranking</span><h3>Zones to review</h3></div></div>
          <div className="fusion-ranking-card__list">{ranked.slice(0, 4).map((item, index) => <button key={item.id} onClick={() => { setFilter("All"); setSelectedId(item.id); }}><em>0{index + 1}</em><span><strong>{item.label}</strong><small>{item.category}</small></span><b>{item.signals}</b></button>)}</div>
        </article>
      </aside>
    </div>
  );
}

function ResolutionWorkbench({ onOpenNetwork }: { onOpenNetwork: () => void }) {
  const [selectedId, setSelectedId] = useState(resolutionCandidates[0].id);
  const [reviewStates, setReviewStates] = useState<Record<string, ReviewState>>({});
  const selected = resolutionCandidates.find((item) => item.id === selectedId) ?? resolutionCandidates[0];
  const state = reviewStates[selected.id] ?? "Pending review";

  return (
    <div className="fusion-resolution-layout">
      <aside className="panel fusion-candidate-list">
        <div className="panel__header"><div><span className="panel__eyebrow">Candidate queue</span><h3>Possible duplicates</h3></div><span className="panel__hint">{resolutionCandidates.length} pairs</span></div>
        <div className="fusion-candidate-list__body">{resolutionCandidates.map((item) => {
          const candidateState = reviewStates[item.id] ?? "Pending review";
          return <button key={item.id} className={selected.id === item.id ? "is-active" : ""} onClick={() => setSelectedId(item.id)}><span><strong>{item.primary.name}</strong><small>{item.candidate.name}</small></span><em>{item.score}%</em><i className={candidateState === "Confirmed match" ? "is-confirmed" : candidateState === "Kept separate" ? "is-separate" : ""}>{candidateState}</i></button>;
        })}</div>
      </aside>

      <article className="panel fusion-resolution-card">
        <div className="panel__header"><div><span className="panel__eyebrow">Investigator review required</span><h3>Entity resolution comparison</h3></div><span className={`fusion-review-state fusion-review-state--${state.replace(/ /g, "-").toLowerCase()}`}>{state}</span></div>
        <div className="fusion-resolution-score-row">
          <div className="fusion-resolution-score" style={{ "--match-score": `${selected.score * 3.6}deg` } as CSSProperties}><strong>{selected.score}%</strong><span>similarity</span></div>
          <div><span className="panel__eyebrow">Candidate match</span><h4>{selected.primary.name} <GitMerge size={17} /> {selected.candidate.name}</h4><p>Similarity is a review signal, not an automatic identity decision.</p></div>
        </div>
        <div className="fusion-entity-comparison">
          {[selected.primary, selected.candidate].map((entity, index) => <section key={entity.reference}><span>ENTITY {index === 0 ? "A" : "B"}</span><h4>{entity.name}</h4><dl><div><dt>Reference</dt><dd>{entity.reference}</dd></div><div><dt>Phone / ID</dt><dd>{entity.phone}</dd></div><div><dt>Location</dt><dd>{entity.location}</dd></div><div><dt>Date context</dt><dd>{entity.dob}</dd></div></dl></section>)}
        </div>
        <div className="fusion-resolution-signals">
          <section><h4><CheckCircle2 size={15} /> Consistent attributes</h4>{selected.matches.map((item) => <span key={item}>{item}</span>)}</section>
          <section className="has-conflicts"><h4><AlertTriangle size={15} /> Conflicts to resolve</h4>{selected.conflicts.map((item) => <span key={item}>{item}</span>)}</section>
          <section><h4><ShieldCheck size={15} /> Source trail</h4>{selected.sources.map((item) => <span key={item}>{item}</span>)}</section>
        </div>
        <div className="fusion-resolution-actions">
          <button className="button button--quiet" onClick={() => setReviewStates((current) => ({ ...current, [selected.id]: "Kept separate" }))}><XCircle size={15} /> Keep separate</button>
          <button className="button" onClick={onOpenNetwork}><Network size={15} /> Compare in network</button>
          <button className="button button--primary" onClick={() => setReviewStates((current) => ({ ...current, [selected.id]: "Confirmed match" }))}><CheckCircle2 size={15} /> Confirm match</button>
        </div>
      </article>
    </div>
  );
}

function PipelineWorkbench({ onOpenEvidence }: { onOpenEvidence: () => void }) {
  const [activeStage, setActiveStage] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const active = pipelineStages[activeStage];

  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setTimeout(() => {
      if (activeStage >= pipelineStages.length - 1) setIsRunning(false);
      else setActiveStage((current) => current + 1);
    }, 1250);
    return () => window.clearTimeout(timer);
  }, [activeStage, isRunning]);

  const reset = () => { setIsRunning(false); setActiveStage(0); };
  return (
    <div className="fusion-pipeline-layout">
      <article className="panel fusion-pipeline-card">
        <div className="panel__header"><div><span className="panel__eyebrow">Core intelligence pipeline</span><h3>Evidence to reviewable insight</h3></div><span className="panel__hint">Synthetic run</span></div>
        <div className="fusion-pipeline-track" role="list" aria-label="Pipeline stages">
          {pipelineStages.map((stage, index) => {
            const Icon = stage.icon;
            return <button role="listitem" key={stage.id} className={`${index === activeStage ? "is-active" : ""}${index < activeStage ? " is-complete" : ""}`} onClick={() => { setIsRunning(false); setActiveStage(index); }}><i><Icon size={17} /></i><span><strong>{stage.label}</strong><small>0{index + 1}</small></span>{index < pipelineStages.length - 1 && <em><ArrowRight size={14} /></em>}</button>;
          })}
        </div>
        <div className="fusion-pipeline-progress"><i style={{ width: `${((activeStage + 1) / pipelineStages.length) * 100}%` }} /></div>
        <div className="fusion-pipeline-focus">
          <div className="fusion-pipeline-focus__icon">{(() => { const Icon = active.icon; return <Icon size={26} />; })()}</div>
          <div><span>STAGE 0{activeStage + 1}</span><h4>{active.label}</h4><p>{active.description}</p></div>
          <dl><div><dt>Output</dt><dd>{active.output}</dd></div><div><dt>Control</dt><dd>{active.confidence}</dd></div></dl>
        </div>
        <div className="fusion-pipeline-actions">
          <button className="button button--quiet" onClick={reset}><RotateCcw size={15} /> Reset</button>
          <button className="button button--primary" onClick={() => { if (activeStage === pipelineStages.length - 1) setActiveStage(0); setIsRunning((current) => !current); }}>{isRunning ? <Pause size={15} /> : <Play size={15} />} {isRunning ? "Pause demo" : "Run pipeline demo"}</button>
        </div>
      </article>

      <aside className="panel fusion-pipeline-queue">
        <div className="panel__header"><div><span className="panel__eyebrow">Evidence queue</span><h3>Current intake</h3></div><span className="panel__hint">3 records</span></div>
        <div className="fusion-pipeline-queue__body">
          <div className="is-complete"><FileSearch size={16} /><span><strong>CDR-104-07.csv</strong><small>Extracted - 8 entities</small></span><CheckCircle2 size={15} /></div>
          <div className="is-active"><Fingerprint size={16} /><span><strong>DEV-104-19.json</strong><small>Resolution review - 86%</small></span><ScanSearch size={15} /></div>
          <div><Upload size={16} /><span><strong>CCTV-311-02.mp4</strong><small>Registered - awaiting extraction</small></span><em>QUEUED</em></div>
        </div>
        <div className="fusion-pipeline-guardrail"><ShieldCheck size={17} /><p><strong>Provenance stays attached.</strong> Every output retains its source, classification, and confidence throughout the pipeline.</p></div>
        <button className="button button--wide" onClick={onOpenEvidence}>Open evidence register <ArrowRight size={15} /></button>
      </aside>
    </div>
  );
}

export function FusionIntelligencePage({ onOpenNetwork, onOpenEvidence }: { onOpenNetwork: () => void; onOpenEvidence: (id?: string) => void }) {
  const [mode, setMode] = useState<FusionMode>("map");
  const modes: Array<{ id: FusionMode; label: string; description: string; icon: typeof MapPin }> = [
    { id: "map", label: "Investigation Map", description: "Link sample events with graph entities", icon: MapPin },
    { id: "hotspots", label: "Signal zones (demo)", description: "Legacy schematic, not a geographic map", icon: MapPin },
    { id: "resolution", label: "Entity Resolution", description: "Review possible cross-case matches", icon: ScanSearch },
    { id: "pipeline", label: "Evidence Pipeline", description: "Trace records into graph insights", icon: Workflow },
  ];

  return (
    <div className="experience-page fusion-page page-stack">
      <section className="experience-page-header fusion-page__header">
        <div><span className="eyebrow">Evidence • location • relationships</span><h2>Intelligence Fusion Center</h2><p>Bring location patterns, entity-resolution candidates, and the evidence pipeline into the same evidence-first investigation workspace.</p></div>
        <div className="fusion-page__status"><i /><span><strong>Fusion services</strong><small>Synthetic demo ready</small></span></div>
      </section>

      <nav className="fusion-mode-tabs" aria-label="Intelligence Fusion Center modes">
        {modes.map(({ id, label, description, icon: Icon }) => <button key={id} className={mode === id ? "is-active" : ""} onClick={() => setMode(id)}><Icon size={19} /><span><strong>{label}</strong><small>{description}</small></span></button>)}
      </nav>

      {mode === "map" && <FusionMapWorkbench onOpenNetwork={onOpenNetwork} onOpenEvidence={onOpenEvidence} />}
      {mode === "hotspots" && <HotspotWorkbench onOpenNetwork={onOpenNetwork} />}
      {mode === "resolution" && <ResolutionWorkbench onOpenNetwork={onOpenNetwork} />}
      {mode === "pipeline" && <PipelineWorkbench onOpenEvidence={onOpenEvidence} />}
    </div>
  );
}
