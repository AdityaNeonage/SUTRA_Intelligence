import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, FileSearch, Network, Send, Sparkles } from "lucide-react";
import { sutraApi } from "../api/client";
import { useCases, useNeighborhood } from "../api/queries";
import { errorMessage } from "../lib/format";
import type { CopilotResponse } from "../types/api";
import { copilotSources } from "../features/evidence/copilotSources";

type Turn = { question: string; response: CopilotResponse };
export function LiveAssistantPage({ token, onNavigate }: { token: string; onNavigate: (path: string) => void }) {
  const cases = useCases(token);
  const [caseId, setCaseId] = useState("");
  useEffect(() => { if (!caseId && cases.data?.[0]) setCaseId(cases.data[0].id); }, [caseId, cases.data]);
  return <div className="page-stack copilot-page">
    <section className="copilot-header"><div><span className="eyebrow">SUTRA Copilot</span><h2>Ask. Inspect. Follow the evidence.</h2><p>Graph-grounded decision support with source records kept in view.</p></div><span className="copilot-mode">REAL BACKEND · Rules + graph, not an LLM</span></section>
    <label className="copilot-case">Case context<select className="input" value={caseId} onChange={e => setCaseId(e.target.value)}><option value="" disabled>Select an authorised case</option>{cases.data?.map(c => <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>)}</select></label>
    {cases.isError && <p role="alert" className="inline-error">{errorMessage(cases.error)}</p>}
    {cases.isLoading ? <p role="status">Loading cases…</p> : caseId ? <CaseConversation key={caseId} token={token} caseId={caseId} onNavigate={onNavigate} /> : <p className="experience-empty">Create a case in the live console or load the synthetic dataset as an administrator.</p>}
  </div>;
}

function CaseConversation({ token, caseId, onNavigate }: { token: string; caseId: string; onNavigate: (path: string) => void }) {
  const graph = useNeighborhood(token, { caseId }, true);
  const [entityId, setEntityId] = useState("");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [selectedTurn, setSelectedTurn] = useState(0);
  const copilot = useMutation({
    mutationFn: (input: { question: string; entityId?: string }) => sutraApi.queryCopilot(token, { ...input, caseId }),
    onSuccess: (response, input) => { setTurns(current => [...current, { question: input.question, response }]); setSelectedTurn(turns.length); setQuestion(""); },
  });
  const selected = turns[selectedTurn]?.response;
  const sources = copilotSources(selected?.evidence ?? []);
  const label = graph.data?.nodes.find(n => n.id === entityId)?.label;
  const suggestions = [
    label ? "Why is " + label + " important?" : "Select an entity, then ask why it is important.",
    "Show the path between " + (label || "[first account]") + " and [second account].",
  ];
  function submit(event: FormEvent) {
    event.preventDefault();
    if (question.trim().length >= 3 && !copilot.isPending) copilot.mutate({ question: question.trim(), entityId: entityId || undefined });
  }
  const caseQuery = "?case=" + encodeURIComponent(caseId);
  return <section className="copilot-layout">
    <article className="panel copilot-conversation"><div className="panel__header"><h3>Investigation conversation</h3><Bot size={19} /></div>
      <div className="copilot-messages" aria-live="polite">
        {!turns.length && <div className="copilot-welcome"><Sparkles size={28} /><h3>Start with a stored entity.</h3><p>Select a person, phone or account in the context panel. Ask why it matters, or name two stored accounts to inspect their path. This deterministic engine does not provide general chat, voice input or autonomous findings.</p></div>}
        {turns.map((turn, index) => <div key={index} className="copilot-turn"><div className="copilot-question"><small>INVESTIGATOR</small><p>{turn.question}</p></div><div className={"copilot-response" + (index === selectedTurn ? " is-selected" : "")}><span className="eyebrow"><Sparkles size={14} /> SUTRA Copilot</span><p>{turn.response.answer}</p><button className="text-button" onClick={() => setSelectedTurn(index)}>Inspect sources and limitations ({turn.response.evidence.length})</button></div></div>)}
        {copilot.isPending && <p className="copilot-pending" role="status">Querying stored graph and provenance…</p>}
        {copilot.isError && <p className="inline-error" role="alert">{errorMessage(copilot.error)} Your question is retained; you can retry.</p>}
      </div>
      <form className="copilot-composer" onSubmit={submit}><label htmlFor="live-copilot-question">Investigator question</label><textarea id="live-copilot-question" value={question} onChange={e => setQuestion(e.target.value)} maxLength={2000} disabled={copilot.isPending} placeholder="Why is this entity important? Or: Show the path between ACC0121 and ACC0149." /><div><small>Review all suggestions. A graph connection does not establish wrongdoing.</small><button className="button button--primary" disabled={copilot.isPending || question.trim().length < 3}><Send size={16} /> {copilot.isPending ? "Working…" : "Ask Copilot"}</button></div></form>
    </article>
    <aside className="copilot-context">
      <section className="panel"><div className="panel__header"><h3>Case & entity context</h3><Network size={17} /></div><div className="copilot-panel-body"><label>Stored entity<select className="input" value={entityId} disabled={copilot.isPending} onChange={e => setEntityId(e.target.value)}><option value="">Match names from the question</option>{graph.data?.nodes.map(n => <option key={n.id} value={n.id}>{n.label} · {n.entityType}</option>)}</select></label>{graph.isError && <p className="inline-error">{errorMessage(graph.error)}</p>}{graph.data && !graph.data.nodes.length && <p>No entities yet. Upload evidence for this case first.</p>}<div className="copilot-suggestions">{suggestions.map((s, i) => <button key={s} disabled={copilot.isPending || (i === 0 && !label)} onClick={() => setQuestion(s)}>{s}</button>)}</div></div></section>
      <section className="panel"><div className="panel__header"><h3>Cited evidence</h3><FileSearch size={17} /></div><div className="copilot-panel-body">{selected && <div className="copilot-suggestions"><span className="eyebrow">Entities referenced</span>{selected.entity_ids.map(id => <button key={id} onClick={() => onNavigate("/live/network" + caseQuery + "&entity=" + encodeURIComponent(id))}>{graph.data?.nodes.find(n => n.id === id)?.label ?? id} · Show on graph</button>)}</div>}{sources.length ? sources.map((source, i) => <article className="copilot-source" key={source.id + i}><strong>{source.sourceRecordId || source.id}</strong><span>{source.status || "Status not supplied"}{source.confidence !== undefined ? " · " + Math.round(source.confidence * 100) + "% confidence" : ""}</span><p>{source.text || "No excerpt supplied. Inspect the original stored record."}</p>{source.timestamp && <time>{source.timestamp}</time>}{source.documentId && <button className="text-button" onClick={() => onNavigate("/live/data-store" + caseQuery + "&record=" + encodeURIComponent(source.documentId!))}>Open source record</button>}</article>) : <p>{selected ? "No source records returned for this answer. This is not a verified finding." : "Submit a question to see the API's cited records."}</p>}</div></section>
      <section className="panel"><div className="panel__header"><h3>Investigator actions</h3></div><div className="copilot-panel-body copilot-actions"><button className="button button--quiet" onClick={() => onNavigate("/live/network" + caseQuery + ((selected?.entity_ids[0] || entityId) ? "&entity=" + encodeURIComponent(selected?.entity_ids[0] || entityId) : ""))}>Show graph context</button><button className="button button--quiet" onClick={() => onNavigate("/live/data-store" + caseQuery)}>Open case evidence</button><button className="button button--quiet" onClick={() => onNavigate("/live/cases/" + encodeURIComponent(caseId) + "?focus=timeline")}>Open case timeline</button></div></section>
      <section className="copilot-limitations"><strong>Limitations · not conclusions</strong><ul>{(selected?.limitations.length ? selected.limitations : ["Only stored relationships are considered. Missing evidence is not evidence of absence.", "This is deterministic graph analysis, not a generative AI model."]).map(item => <li key={item}>{item}</li>)}</ul></section>
    </aside>
  </section>;
}
