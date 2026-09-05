import { useEffect, useState, type FormEvent } from "react";
import { Bot, FileSearch, Network, Send, Sparkles } from "lucide-react";
import { demoEvidence } from "../features/demo/mockData";
import { useDemoExperience } from "../features/demo/DemoExperienceProvider";

const examplePrompt = "I met Rahul at Park Street on 12 August.";
export function AssistantPage({ onOpenNetwork, onOpenEvidence, onOpenTimeline }: { onOpenNetwork: () => void; onOpenEvidence: (evidenceId?: string) => void; onOpenTimeline: () => void }) {
  const { addAssistantGraphUpdate, focusGraph, selectCase } = useDemoExperience();
  useEffect(() => { selectCase("case-104"); }, [selectCase]);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Array<{ question: string; supported: boolean }>>([]);
  const [applied, setApplied] = useState(false);
  const evidence = demoEvidence.find(item => item.id === "E-121")!;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setMessages(current => [...current, { question: draft.trim(), supported: draft.trim().toLowerCase() === examplePrompt.toLowerCase() }]);
    setDraft("");
  }
  function applyGraph() { if (!applied) addAssistantGraphUpdate(); setApplied(true); focusGraph(["person-rahul", "location-park-street"]); onOpenNetwork(); }
  return <div className="experience-page page-stack copilot-page">
    <section className="copilot-header"><div><span className="eyebrow">SUTRA Copilot</span><h2>From a statement to an inspectable lead.</h2><p>Case 104 · Financial fraud · Sample investigation</p></div><span className="copilot-mode">SYNTHETIC DEMO · No backend or LLM call</span></section>
    <section className="copilot-layout">
      <article className="panel copilot-conversation"><div className="panel__header"><h3>Investigation conversation</h3><Bot size={19} /></div><div className="copilot-messages" aria-live="polite"><div className="copilot-welcome"><Sparkles size={28} /><h3>Follow the source, not just the suggestion.</h3><p>This scripted example shows a reviewable graph proposal. Use the sample statement below; arbitrary text is not analysed in this public demonstration.</p><button className="assistant-example" onClick={() => setDraft(examplePrompt)}><span>Use sample statement</span><strong>{examplePrompt}</strong></button></div>
      {messages.map((message, index) => <div className="copilot-turn" key={index}><div className="copilot-question"><small>INVESTIGATOR</small><p>{message.question}</p></div><div className="copilot-response"><span className="eyebrow">SUTRA Copilot · scripted response</span><p>{message.supported ? "Sample proposal: Rahul, Park Street and 12 August form three reviewable items with two proposed relationships. The source is a reported statement, not proof that the meeting occurred." : "This public demo only supports the displayed sample statement. No entities were extracted from your message and no graph was changed. Open the live console to query stored evidence."}</p>{message.supported && <div className="workspace-action-row"><button className="text-button" onClick={() => onOpenEvidence("E-121")}>Inspect E-121</button><button className="button button--primary" onClick={applyGraph}>{applied ? "Open proposed graph" : "Apply sample proposal & open graph"}</button></div>}</div></div>)}</div>
      <form className="copilot-composer" onSubmit={submit}><label htmlFor="demo-copilot-question">Sample observation</label><textarea id="demo-copilot-question" value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)} placeholder={examplePrompt} /><div><small>Demo changes stay in browser session state; nothing is uploaded.</small><button className="button button--primary" disabled={!draft.trim()}><Send size={16} /> Review statement</button></div></form></article>
      <aside className="copilot-context"><section className="panel"><div className="panel__header"><h3>Supporting record</h3><FileSearch size={17} /></div><div className="copilot-panel-body"><article className="copilot-source"><strong>{evidence.documentRef} · {evidence.id}</strong><span>{evidence.status} · Synthetic source</span><p>{evidence.excerpt}</p><time>{evidence.timestamp}</time><button className="text-button" onClick={() => onOpenEvidence(evidence.id)}>Open evidence</button></article></div></section>
      <section className="panel"><div className="panel__header"><h3>Suggested review</h3><Sparkles size={17} /></div><div className="copilot-panel-body"><p>Corroborate the reported meeting against independent records. Identity, place and timing remain subject to review.</p><div className="copilot-actions"><button className="button button--quiet" onClick={onOpenNetwork}><Network size={16} /> Explore sample network</button><button className="button button--quiet" onClick={onOpenTimeline}>Open sample timeline</button></div></div></section>
      <section className="copilot-limitations"><strong>Uncertainty stays visible</strong><ul><li>This is a fixed example, not general entity extraction.</li><li>Source-backed, inferred and hypothesis records are not interchangeable.</li><li>No automated accusation, voice input or multilingual analysis is performed.</li></ul></section></aside>
    </section>
  </div>;
}
