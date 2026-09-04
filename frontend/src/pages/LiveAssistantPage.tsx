import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { BrainCircuit, FileSearch, Send, Sparkles, Target, TrendingUp } from "lucide-react";
import { sutraApi } from "../api/client";
import { useCases } from "../api/queries";
import { errorMessage } from "../lib/format";

const suggestedQuestions = [
  "Which entities are most connected in this case?",
  "Show the evidence path between two account IDs.",
  "What limitations should I keep in mind for this graph?",
];

export function LiveAssistantPage({ token }: { token: string }) {
  const cases = useCases(token);
  const [caseId, setCaseId] = useState("");
  const [question, setQuestion] = useState(suggestedQuestions[0]);
  const copilot = useMutation({ mutationFn: () => sutraApi.queryCopilot(token, { question, caseId: caseId || undefined }) });

  useEffect(() => {
    if (!caseId && cases.data?.[0]?.id) setCaseId(cases.data[0].id);
  }, [caseId, cases.data]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (question.trim()) copilot.mutate();
  }

  return (
    <div className="page-stack pari-ai-page">
      <section className="pari-ai-hero"><div><span className="eyebrow">Pari AI · evidence-grounded</span><h2>Pink intelligence, connected to the SUTRA graph.</h2><p>The pink AI experience from Pari’s repository is now backed by the unified copilot API. Answers are generated from stored entities and relationships and return evidence IDs plus explicit limitations.</p></div><span className="pari-ai-orb"><img src="/sutra-hacker.png" alt="Pari AI hacker" /></span></section>
      <section className="pari-ai-insights">
        <article><Target size={18} /><div><span>Next best evidence</span><strong>Verify collector-account KYC and beneficiary ownership</strong><p>Prioritise ACC0146–ACC0150 after the mule CSV is loaded.</p></div></article>
        <article><BrainCircuit size={18} /><div><span>Leading hypothesis</span><strong>Smurfing followed by rapid consolidation</strong><p>Review pass-through transfers inside the 48-hour detection window.</p></div></article>
        <article><TrendingUp size={18} /><div><span>Pattern signal</span><strong>Cycle and community detection</strong><p>Compare high in/out ratios and circular fund paths before escalation.</p></div></article>
      </section>
      <section className="pari-ai-layout">
        <article className="panel pari-ai-query"><div className="panel__header"><div><span className="panel__eyebrow">Investigator query</span><h3>Ask the live evidence graph</h3></div><Sparkles size={18} /></div><form onSubmit={submit}><label>Case context<select className="input" value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">All accessible evidence</option>{cases.data?.map((item) => <option key={item.id} value={item.id}>{item.case_number} - {item.title}</option>)}</select></label><textarea className="input" value={question} onChange={(event) => setQuestion(event.target.value)} /><div className="pari-ai-suggestions">{suggestedQuestions.map((item) => <button type="button" key={item} onClick={() => setQuestion(item)}>{item}</button>)}</div><button className="button button--primary pari-ai-submit" disabled={copilot.isPending || question.trim().length < 3}>{copilot.isPending ? "Analysing graph…" : <><Send size={16} /> Ask Pari AI</>}</button></form></article>
        <aside className="panel pari-ai-answer"><div className="panel__header"><div><span className="panel__eyebrow">Grounded result</span><h3>Answer and provenance</h3></div><FileSearch size={18} /></div>{copilot.isError ? <div className="inline-error">{errorMessage(copilot.error)}</div> : copilot.data ? <div className="pari-ai-answer__body"><div className="pari-ai-answer__copy"><Sparkles size={18} /><p>{copilot.data.answer}</p></div><div className="pari-ai-answer__metrics"><span><strong>{copilot.data.entity_ids.length}</strong>Entities</span><span><strong>{copilot.data.edge_ids.length}</strong>Edges</span><span><strong>{copilot.data.evidence.length}</strong>Evidence records</span></div><div><span className="pari-ai-label">Limitations</span><ul>{copilot.data.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div></div> : <div className="experience-empty">Choose a case and ask a question. Pari AI will only use the graph records your account is authorised to access.</div>}</aside>
      </section>
    </div>
  );
}
