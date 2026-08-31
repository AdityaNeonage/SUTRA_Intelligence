import { type FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, FileText, Languages, Mic, MicOff, Network, Send, Sparkles } from "lucide-react";
import { initialAssistantMessages } from "../features/demo/mockData";
import { useDemoExperience } from "../features/demo/DemoExperienceProvider";
import type { AssistantMessage } from "../features/demo/types";

type AssistantStage = "idle" | "analyzing" | "entities" | "complete";

const examplePrompt = "I met Rahul at Park Street on 12 August.";

export function AssistantPage({ onOpenNetwork, onOpenEvidence }: { onOpenNetwork: () => void; onOpenEvidence: (evidenceId?: string) => void }) {
  const { addAssistantGraphUpdate } = useDemoExperience();
  const [messages, setMessages] = useState<AssistantMessage[]>(initialAssistantMessages);
  const [draft, setDraft] = useState("");
  const [language, setLanguage] = useState("auto");
  const [isListening, setIsListening] = useState(false);
  const [stage, setStage] = useState<AssistantStage>("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  function addTimer(callback: () => void, delay: number) {
    timers.current.push(window.setTimeout(callback, delay));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || stage !== "idle") return;
    const userMessage: AssistantMessage = { id: `investigator-${Date.now()}`, role: "investigator", text: content, timestamp: new Date().toISOString() };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setStage("analyzing");
    addTimer(() => setStage("entities"), 850);
    addTimer(() => {
      addAssistantGraphUpdate();
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: "I prepared a reviewable graph action from the synthetic message. The extracted items remain context to corroborate, not verified conclusions.",
        timestamp: new Date().toISOString(),
        citations: ["CHAT-104-01", "E-121"],
        graphAction: "3 entities identified · 2 relationships created",
      }]);
      setStage("complete");
    }, 1650);
    addTimer(() => setStage("idle"), 2400);
  }

  return (
    <div className="experience-page assistant-page page-stack">
      <section className="experience-page-header"><div><span className="eyebrow">AI Assistant</span><h2>Turn a message into a reviewable graph action.</h2><p>The Phase 2 assistant is a frontend-only demonstration with visible extraction, citations, and synthetic graph changes. It does not call an LLM or decide what is true.</p></div><div className="assistant-mode-chip"><Bot size={16} /> Evidence-aware mock mode</div></section>
      <section className="assistant-layout">
        <article className="panel assistant-chat"><div className="panel__header"><div><span className="panel__eyebrow">Investigation conversation</span><h3>Cited, action-oriented assistance</h3></div><span className="panel__hint">Synthetic only</span></div><div className="assistant-chat__messages" aria-live="polite">{messages.map((message) => <article className={`assistant-message assistant-message--${message.role}`} key={message.id}><span className="assistant-message__avatar">{message.role === "assistant" ? <Bot size={15} /> : "I"}</span><div><strong>{message.role === "assistant" ? "SUTRA Assistant" : "Investigator"}</strong><p>{message.text}</p>{message.citations && <div className="assistant-message__citations">{message.citations.map((citation) => <button key={citation} onClick={() => onOpenEvidence(citation.startsWith("E-") ? citation : undefined)}><FileText size={12} /> {citation}</button>)}</div>}{message.graphAction && <button className="assistant-message__graph-action" onClick={onOpenNetwork}><Network size={14} /> {message.graphAction}</button>}</div></article>)}</div><form className="assistant-composer" onSubmit={submit}><div className="assistant-composer__tools"><button type="button" className={isListening ? "icon-button assistant-mic assistant-mic--active" : "icon-button assistant-mic"} title={isListening ? "Stop mock microphone" : "Start mock microphone"} onClick={() => setIsListening((current) => !current)}>{isListening ? <MicOff size={17} /> : <Mic size={17} />}</button><label><Languages size={15} /><select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Message language"><option value="auto">Auto-detect</option><option value="en">English</option><option value="hi">Hindi</option><option value="bn">Bengali</option></select><ChevronDown size={13} /></label></div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={isListening ? "Mock microphone active — type a message to continue" : "Describe a synthetic observation or ask for cited context…"} aria-label="Assistant message" /><button className="button button--primary" type="submit" disabled={!draft.trim() || stage !== "idle"}><Send size={16} /> Send</button></form></article>
        <aside className="assistant-analysis panel"><div className="panel__header"><div><span className="panel__eyebrow">Graph action</span><h3>Visible reasoning steps</h3></div><Sparkles size={18} /></div><div className="assistant-analysis__body"><button className="assistant-example" onClick={() => setDraft(examplePrompt)}><span>Try the live demo</span><strong>{examplePrompt}</strong></button><ol className="assistant-steps"><li className={stage === "analyzing" || stage === "entities" || stage === "complete" ? "assistant-step--active" : ""}><i /><span><strong>Analyzing message</strong><small>{stage === "analyzing" ? "Checking structured context…" : stage === "idle" ? "Awaiting a message" : "Message prepared for review"}</small></span></li><li className={stage === "entities" || stage === "complete" ? "assistant-step--active" : ""}><i /><span><strong>Extracted entities</strong><small>Rahul · Park Street · 12 August</small></span></li><li className={stage === "complete" ? "assistant-step--active" : ""}><i /><span><strong>Proposed graph update</strong><small>3 entities identified · 2 relationships created</small></span></li></ol><div className="assistant-analysis__notice"><FileText size={15} /><p>Created links are clearly marked as inferred or source-backed and remain inspectable in the Network Explorer.</p></div></div></aside>
      </section>
    </div>
  );
}
