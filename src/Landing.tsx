import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { Network, Brain, Eye, FileText, MessageSquare, ChevronRight, Database, Zap, Shield, GitMerge, Activity } from 'lucide-react';
import { cn } from './lib/utils';

// ─── DATA ────────────────────────────────────────────────────────────────────

const EVIDENCE_TYPES = [
  { icon: '📄', label: 'Documents', sub: 'FIR, Reports, PDFs', color: '#94a3b8' },
  { icon: '🖼️', label: 'Images',    sub: 'Vehicles, Crime scenes', color: '#60a5fa' },
  { icon: '🎥', label: 'Videos',    sub: 'CCTV, Recordings', color: '#a78bfa' },
  { icon: '🎙️', label: 'Audio',     sub: 'Calls, Transcripts', color: '#f472b6' },
  { icon: '🚗', label: 'Vehicles',  sub: 'Number plates, Records', color: '#f59e0b' },
  { icon: '📱', label: 'Phones',    sub: 'CDR, Contacts', color: '#fb923c' },
  { icon: '💳', label: 'Accounts',  sub: 'Transactions, Flows', color: '#d946ef' },
  { icon: '📍', label: 'Location',  sub: 'GPS, Check-ins, Maps', color: '#4ade80' },
  { icon: '🌐', label: 'Digital ID',sub: 'IPs, Devices, Logs', color: '#22d3ee' },
  { icon: '📧', label: 'Emails',    sub: 'Headers, Threads', color: '#818cf8' },
];

const PIPELINE_STEPS = [
  { icon: '📥', label: 'Evidence Input', sub: 'Drag · Drop · Upload', color: '#94a3b8' },
  { icon: '🧠', label: 'Multimodal AI', sub: 'Gemini-powered extraction', color: '#d946ef' },
  { icon: '🔗', label: 'Entity Linking', sub: 'People · Vehicles · Accounts', color: '#f59e0b' },
  { icon: '🕸️', label: 'Investigation Graph', sub: 'Relationships · Patterns', color: '#22d3ee' },
  { icon: '💡', label: 'SUTRA Insights', sub: 'Next Evidence · Hypotheses', color: '#4ade80' },
];

const FEATURES = [
  {
    category: 'Investigation Core',
    icon: <Network className="w-5 h-5" />,
    color: '#d946ef',
    items: [
      { title: 'Investigation Graph', desc: 'Interactive graph with clickable entities, relationships, path-finding, and filters.' },
      { title: 'Case Workspace', desc: 'Unified environment integrating evidence, timeline, and insights.' },
      { title: 'Command Center', desc: 'Main dashboard with network overview and case-level alerts.' },
    ],
  },
  {
    category: 'Evidence Intelligence',
    icon: <Database className="w-5 h-5" />,
    color: '#22d3ee',
    items: [
      { title: 'Evidence Hub', desc: 'Drag & drop processing across all evidence modalities.' },
      { title: 'Multimodal AI', desc: 'Extracts entities from documents, images, videos, audio, CSV and more.' },
      { title: 'Cross-Evidence Fusion', desc: 'Connects evidence across sources into a unified graph.' },
    ],
  },
  {
    category: 'Temporal Intelligence',
    icon: <Activity className="w-5 h-5" />,
    color: '#f59e0b',
    items: [
      { title: 'Timeline Intelligence', desc: 'Sync events with graph states. Click events to jump to evidence.' },
      { title: 'Crime Time Machine', desc: 'Replay network evolution. Compare historical snapshots.' },
      { title: 'Network Pulse', desc: 'Detect structural changes before and after key events.' },
    ],
  },
  {
    category: 'Cross-Case Intelligence',
    icon: <GitMerge className="w-5 h-5" />,
    color: '#818cf8',
    items: [
      { title: 'CaseDNA', desc: 'Compare cases side-by-side to find shared patterns.' },
      { title: 'Cross-Case Discovery', desc: 'Automatically surface related investigations.' },
    ],
  },
  {
    category: 'Advanced AI Reasoning',
    icon: <Brain className="w-5 h-5" />,
    color: '#4ade80',
    items: [
      { title: 'Ghost Node Detection', desc: 'AI identifies missing intermediaries as labeled hypotheses.' },
      { title: 'Next Best Evidence', desc: 'Ranked recommendations for what to gather next.' },
      { title: 'Hypothesis Workbench', desc: 'Test competing theories against collected evidence.' },
    ],
  },
  {
    category: 'SUTRA Copilot',
    icon: <MessageSquare className="w-5 h-5" />,
    color: '#f472b6',
    items: [
      { title: 'Natural Language Queries', desc: '"Why is P-037 important?" — SUTRA explains with evidence.' },
      { title: 'WHY Panel', desc: 'For every connection, see the evidence and confidence behind it.' },
      { title: 'Explainable AI', desc: 'Every hypothesis is labeled and distinguished from hard evidence.' },
    ],
  },
];

const COPILOT_DEMO = [
  {
    question: 'Why is P-037 important in this case?',
    answer: {
      text: 'Entity P-037 is structurally critical:',
      bullets: ['Connected to 4 active cases', '47 encrypted communication events', 'Shared device footprint with Target X', 'Primary bridge between Case 104 and Case 287'],
      confidence: 96,
      actions: ['Show Path', 'View Evidence'],
    },
  },
  {
    question: 'What should I investigate next?',
    answer: {
      text: 'SUTRA recommends (by graph impact):',
      bullets: ['① Device D-917 — unlocks 7 unexplained relationships · HIGH IMPACT', '② CCTV Archive (L-09) — confirms Aug 14 timeline · HIGH IMPACT', '③ P-037 Full CDR — confirms Case 104 ↔ Case 287 link · HIGH IMPACT'],
      confidence: 91,
      actions: ['View All Recommendations'],
    },
  },
  {
    question: 'Show me the ghost node hypothesis.',
    answer: {
      text: '⚠️ AI Hypothesis (NOT confirmed evidence):',
      bullets: ['Potential missing intermediary between Person A and P-037', 'Supporting: Shared location · Temporal correlation · Communication gap', 'Confidence: 45% — needs Device D-917 to confirm or dismiss'],
      confidence: 45,
      actions: ['Investigate', 'Dismiss'],
    },
  },
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Header({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header className={cn('fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b', scrolled ? 'bg-[#0a0710]/95 backdrop-blur border-white/10' : 'bg-transparent border-transparent')}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border border-white/60 flex items-center justify-center">
            <div className="w-3.5 h-3.5 bg-white transform rotate-45" />
          </div>
          <span className="text-xl font-black tracking-[0.2em] uppercase text-white">SUTRA</span>
          <span className="hidden md:inline text-[8px] text-white/30 tracking-widest uppercase px-2 py-0.5 border border-white/10">Investigation v4.0</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-[9px] uppercase tracking-widest text-white/40">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pipeline" className="hover:text-white transition-colors">Pipeline</a>
          <a href="#copilot" className="hover:text-white transition-colors">Copilot</a>
          <button onClick={onOpenDashboard} className="px-4 py-2 border border-white/20 text-white hover:bg-white hover:text-black transition-all font-bold">
            Open Live Demo
          </button>
        </nav>
      </div>
    </header>
  );
}

function Hero({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [activeEvidence, setActiveEvidence] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveEvidence(i => (i + 1) % EVIDENCE_TYPES.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 overflow-hidden" style={{ background: '#0a0710' }}>
      {/* Background layers */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#8a2be2]/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#d946ef]/25 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#d946ef]/40 bg-[#d946ef]/8 text-[9px] font-bold uppercase tracking-widest text-[#d946ef]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#d946ef] animate-pulse" />
            AI-Powered Cybercrime Investigation Platform
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-[1.05]"
        >
          Fragmented Evidence<br />
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #d946ef, #8a2be2)' }}>
            → Investigation Graph
          </span>
        </motion.h1>

        {/* Subline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-white/50 text-base md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          SUTRA Copilot transforms{' '}
          <AnimatePresence mode="wait">
            <motion.span
              key={activeEvidence}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="font-bold"
              style={{ color: EVIDENCE_TYPES[activeEvidence].color }}
            >
              {EVIDENCE_TYPES[activeEvidence].icon} {EVIDENCE_TYPES[activeEvidence].label.toLowerCase()}
            </motion.span>
          </AnimatePresence>
          {' '}into a structured visual investigation environment. Discover entities, relationships, timelines, and hidden connections.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <button
            onClick={onOpenDashboard}
            className="group relative px-10 py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-all flex items-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(217,70,239,0.35)]"
          >
            <Zap className="w-4 h-4" />
            Open Sample Investigation
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <a href="#pipeline" className="px-8 py-4 border border-white/15 text-white/60 font-bold text-[9px] uppercase tracking-widest hover:text-white hover:border-white/35 transition-all">
            See How It Works
          </a>
        </motion.div>

        {/* Evidence type pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto"
        >
          {EVIDENCE_TYPES.map((ev, i) => (
            <motion.div
              key={ev.label}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-white/8 bg-white/3 text-white/40 text-[8px] uppercase tracking-widest hover:text-white/70 hover:border-white/20 transition-all cursor-default"
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.04 }}
            >
              <span>{ev.icon}</span>
              <span>{ev.label}</span>
            </motion.div>
          ))}
          <div className="flex items-center gap-1.5 px-2.5 py-1 border border-[#d946ef]/30 bg-[#d946ef]/8 text-[#d946ef] text-[8px] uppercase tracking-widest font-bold">
            <span>→</span>
            <span>Drag · Drop · Analyze</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PipelineSection() {
  return (
    <section id="pipeline" className="py-28 relative bg-[#080510] border-y border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#8a2be2/10,transparent_60%)] pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-block px-3 py-1 border border-[#d946ef]/30 text-[9px] uppercase tracking-widest text-[#d946ef] font-bold mb-5">Core Pipeline</div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">Evidence → Graph → Insights</h2>
          <p className="text-white/40 text-sm max-w-xl mx-auto">
            Every piece of evidence you upload passes through SUTRA's AI pipeline and emerges as connected, queryable knowledge.
          </p>
        </motion.div>

        {/* Pipeline steps */}
        <div className="flex flex-col md:flex-row items-stretch gap-0">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.label} className="flex flex-row md:flex-col items-center md:flex-1">
              <motion.div
                className="flex-1 md:flex-none border border-white/10 bg-sutra-surface p-5 md:w-full flex flex-col items-center text-center gap-3 group hover:border-white/25 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-3xl">{step.icon}</div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white mb-1" style={{ color: step.color }}>{step.label}</div>
                  <div className="text-[8px] text-white/30 uppercase tracking-widest">{step.sub}</div>
                </div>
              </motion.div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="flex items-center justify-center w-8 md:w-full h-8 md:h-8 shrink-0">
                  <div className="hidden md:flex w-full h-px bg-white/10 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-white/10" />
                  </div>
                  <div className="md:hidden w-px h-full bg-white/10" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VehicleDemo() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: 'Upload Evidence', desc: 'Investigator uploads WB12AB1234.jpg', code: '📤 WB12AB1234.jpg' },
    { label: 'AI Extraction', desc: 'SUTRA identifies vehicle number, location, timestamp', code: 'Vehicle: WB12AB1234\nLocation: Kolkata\nDate: 14 Aug, 14:20\nConfidence: 97%' },
    { label: 'Graph Node Created', desc: 'Entity added to investigation graph', code: 'WB12AB1234\n  └── type: vehicle\n  └── risk: 7.5' },
    { label: 'Cross-Evidence Fusion', desc: 'Connected to CCTV, Case, Person A', code: 'WB12AB1234\n  ├── PERSON A (owns)\n  ├── CCTV CAM-04 (captured by)\n  ├── KOLKATA / L-09 (appears at)\n  └── CASE #104 (part of)' },
    { label: 'WHY Panel Active', desc: 'Click any node to see reasoning', code: 'WHY THIS MATTERS:\n✓ Appears in CCTV CAM-04\n✓ Registered to Person A\n✓ Near Case #104 location\n✓ 3 matching timestamps\nConfidence: 95%' },
  ];

  return (
    <section className="py-28 bg-[#0a0710]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-block px-3 py-1 border border-[#f59e0b]/30 text-[9px] uppercase tracking-widest text-[#f59e0b] font-bold mb-5">🚗 Vehicle Investigation</div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">WB12AB1234 → Investigation Graph</h2>
          <p className="text-white/40 text-sm max-w-xl mx-auto">
            See how a single vehicle image becomes a rich graph of connected entities.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Steps navigator */}
          <div className="space-y-2">
            {steps.map((s, i) => (
              <motion.button
                key={i}
                onClick={() => setStep(i)}
                className={`w-full text-left p-4 border transition-all ${step === i ? 'border-[#f59e0b]/50 bg-[#f59e0b]/8' : 'border-white/5 bg-sutra-surface hover:border-white/15'}`}
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 border flex items-center justify-center text-[9px] font-black shrink-0 ${step === i ? 'border-[#f59e0b] text-[#f59e0b]' : 'border-white/15 text-white/30'}`}>{i + 1}</div>
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest ${step === i ? 'text-white' : 'text-white/50'}`}>{s.label}</div>
                    <div className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">{s.desc}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Code/output display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border border-white/10 bg-sutra-dark p-6 font-mono"
            >
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <span className="text-[8px] uppercase tracking-widest text-[#f59e0b]">Step {step + 1}: {steps[step].label}</span>
              </div>
              <pre className="text-[10px] text-white/70 leading-relaxed whitespace-pre-wrap">{steps[step].code}</pre>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function CrossEvidenceSection() {
  const sources = [
    { icon: '📄', label: 'FIR', result: 'Person A', color: '#94a3b8' },
    { icon: '🎥', label: 'CCTV', result: 'Vehicle X', color: '#a78bfa' },
    { icon: '📱', label: 'Call Log', result: 'Phone Y', color: '#fb923c' },
    { icon: '💳', label: 'Transactions', result: 'Account Z', color: '#d946ef' },
    { icon: '🎙️', label: 'Audio', result: 'Person B', color: '#f472b6' },
  ];

  return (
    <section className="py-28 bg-[#080510] border-y border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-block px-3 py-1 border border-[#22d3ee]/30 text-[9px] uppercase tracking-widest text-[#22d3ee] font-bold mb-5">🧬 Cross-Evidence Fusion</div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">Individually Fragmented</h2>
          <p className="text-white/40 text-sm max-w-xl mx-auto">
            Each evidence file tells a partial story. SUTRA fuses them into one unified investigation graph.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 items-center">
          {/* Sources */}
          <div className="space-y-3">
            <div className="text-[8px] uppercase tracking-widest text-white/30 mb-4">Evidence Sources</div>
            {sources.map((s, i) => (
              <motion.div
                key={i}
                className="flex items-center justify-between p-3 border border-white/5 bg-sutra-surface"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{s.label}</span>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: s.color }}>{s.result}</span>
              </motion.div>
            ))}
          </div>

          {/* Arrow + AI */}
          <div className="flex flex-col items-center gap-4">
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 border-2 border-[#d946ef]/50 bg-[#d946ef]/10 flex items-center justify-center mb-3">
                <Brain className="w-8 h-8 text-[#d946ef]" />
              </div>
              <div className="text-[9px] font-bold text-white uppercase tracking-widest">SUTRA AI</div>
              <div className="text-[7px] text-white/30 uppercase tracking-widest">Cross-evidence fusion</div>
              <div className="w-px h-6 bg-white/10 my-2" />
              <div className="text-[9px] text-[#d946ef]">↓</div>
            </motion.div>
          </div>

          {/* Result graph */}
          <div>
            <div className="text-[8px] uppercase tracking-widest text-white/30 mb-4">Unified Investigation Graph</div>
            <motion.div
              className="border border-[#22d3ee]/20 bg-sutra-dark p-4 font-mono"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <pre className="text-[9px] text-white/60 leading-relaxed">{`PERSON A
  ├── 📱 PHONE Y (calls)
  │     └── 📋 CALL LOG
  └── 🚗 VEHICLE X (owns)
        └── 🎥 CCTV EVENT
              │
         CASE #104
              │
        💳 ACCOUNT Z
              │
         (Person B)`}</pre>
            </motion.div>
            <div className="mt-3 p-2.5 border border-[#22d3ee]/20 bg-[#22d3ee]/5">
              <div className="text-[8px] text-[#22d3ee] font-bold uppercase tracking-widest mb-1">SUTRA USP</div>
              <div className="text-[8px] text-white/50 leading-relaxed">Fragmented evidence → unified investigation graph. Every node clickable. Every relationship has evidence behind it.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GhostNodeSection() {
  return (
    <section className="py-28 bg-[#0a0710]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-block px-3 py-1 border border-[#d946ef]/30 text-[9px] uppercase tracking-widest text-[#d946ef] font-bold mb-6">👻 Ghost Node Detection</div>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">SUTRA Sees What's Missing</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-8">
              Don't just show what's there — reveal what's missing. SUTRA AI analyzes structural gaps to identify potential hidden intermediaries. Every ghost node is clearly labeled as an AI hypothesis, not confirmed fact.
            </p>
            <ul className="space-y-4">
              {['AI detects structural anomalies in the graph', 'Potential intermediaries shown as hypothesis nodes', 'Supporting signals with confidence scores', 'Clear distinction: evidence vs AI hypothesis', 'One click to open Hypothesis Workbench'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[9px] text-white/60 uppercase tracking-widest">
                  <div className="w-5 h-5 border border-white/15 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 bg-white/50" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="border border-white/10 bg-sutra-surface p-8 relative"
          >
            {/* Visual graph with ghost node */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="w-16 h-16 rounded-full border-2 border-white bg-sutra-dark flex flex-col items-center justify-center">
                <span className="text-lg">👤</span>
                <span className="text-[6px] text-white uppercase tracking-widest mt-0.5">Person A</span>
              </div>
              <div className="relative flex items-center justify-center w-24">
                <div className="absolute inset-x-0 h-px border-b border-dashed border-[#d946ef]/60" />
                <motion.div
                  className="w-14 h-14 rounded-full border-2 border-dashed border-[#d946ef] bg-sutra-dark flex items-center justify-center z-10"
                  animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <span className="text-xl text-[#d946ef] font-black">?</span>
                </motion.div>
              </div>
              <div className="w-16 h-16 rounded-full border-2 border-white/30 bg-sutra-dark flex flex-col items-center justify-center">
                <span className="text-lg">👤</span>
                <span className="text-[6px] text-white/60 uppercase tracking-widest mt-0.5">P-037</span>
              </div>
            </div>

            {/* Hypothesis card */}
            <div className="border border-[#d946ef]/25 bg-[#d946ef]/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#d946ef] animate-pulse" />
                <span className="text-[8px] text-[#d946ef] font-bold uppercase tracking-widest">AI Hypothesis — NOT Confirmed Evidence</span>
              </div>
              <div className="text-[10px] font-bold text-white mb-2">Potential Missing Intermediary</div>
              <p className="text-[9px] text-white/50 leading-relaxed mb-3">A and B appear structurally connected, but the intermediary is not present in the evidence graph.</p>
              <div className="text-[7px] text-white/30 uppercase tracking-widest mb-2">Supporting signals</div>
              {['Shared location', 'Temporal correlation', 'Related communication event'].map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 mb-1">
                  <div className="w-1 h-1 rounded-full bg-[#d946ef]/50" />
                  <span className="text-[8px] text-white/50">{s}</span>
                </div>
              ))}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className="text-[8px] text-white/30 uppercase tracking-widest">Confidence: 45%</span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-[#d946ef] text-black text-[7px] font-black uppercase tracking-widest hover:bg-[#d946ef]/80 transition-colors">Investigate</button>
                  <button className="px-3 py-1 border border-white/10 text-white/40 text-[7px] font-bold uppercase tracking-widest hover:text-white transition-colors">Dismiss</button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function CopilotSection({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [activeDemo, setActiveDemo] = useState(0);
  const demo = COPILOT_DEMO[activeDemo];

  return (
    <section id="copilot" className="py-28 bg-[#080510] border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#d946ef/10,transparent_60%)] pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="w-14 h-14 mx-auto border-2 border-[#d946ef]/50 flex items-center justify-center mb-5 bg-[#d946ef]/8">
            <MessageSquare className="w-7 h-7 text-[#d946ef]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">SUTRA Copilot</h2>
          <p className="text-white/40 text-sm max-w-xl mx-auto">Ask complex questions about your investigation. Get evidence-backed answers with paths, confidence scores, and next steps.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {COPILOT_DEMO.map((d, i) => (
            <button
              key={i}
              onClick={() => setActiveDemo(i)}
              className={`p-4 border text-left transition-all ${activeDemo === i ? 'border-[#d946ef]/50 bg-[#d946ef]/8' : 'border-white/5 bg-sutra-surface hover:border-white/15'}`}
            >
              <div className={`text-[9px] font-bold uppercase tracking-widest leading-relaxed ${activeDemo === i ? 'text-white' : 'text-white/40'}`}>{d.question}</div>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeDemo}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="border border-white/10 bg-sutra-surface overflow-hidden"
          >
            {/* Chat header */}
            <div className="border-b border-white/10 bg-sutra-dark/50 p-4 flex items-center gap-3">
              <div className="w-8 h-8 border border-[#d946ef]/30 bg-black flex items-center justify-center">
                <Brain className="w-4 h-4 text-[#d946ef]" />
              </div>
              <div>
                <div className="text-[9px] font-black text-white tracking-widest uppercase">SUTRA AI</div>
                <div className="text-[7px] text-green-400 uppercase tracking-widest">● Active Investigation</div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* User question */}
              <div className="flex gap-3 flex-row-reverse">
                <div className="w-7 h-7 shrink-0 border border-white/20 bg-sutra-dark flex items-center justify-center">
                  <span className="text-[7px] font-bold text-white">INV</span>
                </div>
                <div className="border border-white/10 bg-sutra-dark px-4 py-2.5">
                  <p className="text-[10px] text-white/70">{demo.question}</p>
                </div>
              </div>

              {/* AI response */}
              <div className="flex gap-3">
                <div className="w-7 h-7 shrink-0 border border-[#d946ef]/30 bg-black flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-[#d946ef]" />
                </div>
                <div className="border-l-2 border-[#d946ef] border-y-white/5 border-r-white/5 bg-sutra-dark px-5 py-4 flex-1">
                  <p className="text-[10px] text-white mb-3 uppercase tracking-widest font-bold">{demo.answer.text}</p>
                  <ul className="space-y-2 mb-4">
                    {demo.answer.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 bg-white/40 shrink-0 mt-1" />
                        <span className="text-[9px] text-white/60 uppercase tracking-widest leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between mb-4 p-2 border border-[#d946ef]/15 bg-[#d946ef]/5">
                    <span className="text-[8px] text-white/40 uppercase tracking-widest">AI Confidence</span>
                    <span className="text-sm font-black font-mono text-[#d946ef]">{demo.answer.confidence}%</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {demo.answer.actions.map((a, i) => (
                      <button key={i} onClick={onOpenDashboard} className={`px-4 py-2 text-[8px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${i === 0 ? 'bg-white text-black hover:bg-white/90' : 'border border-white/20 text-white/50 hover:text-white hover:border-white/40'}`}>
                        <Network className="w-3 h-3" />
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-28 bg-[#0a0710]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">Complete Investigation Intelligence</h2>
          <p className="text-white/40 text-sm max-w-xl mx-auto">From evidence ingestion to AI-assisted hypothesis generation. Everything needed to map, analyze, and dismantle complex networks.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((group, idx) => (
            <motion.div
              key={group.category}
              className="border border-white/8 bg-sutra-surface p-6 hover:border-white/20 transition-all group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: (idx % 3) * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                <div className="w-8 h-8 border border-white/10 flex items-center justify-center" style={{ color: group.color }}>{group.icon}</div>
                <h3 className="text-[9px] font-black uppercase tracking-widest text-white">{group.category}</h3>
              </div>
              <ul className="space-y-4">
                {group.items.map((item, i) => (
                  <li key={i}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-1" style={{ background: group.color }} />
                      <span className="text-[9px] font-bold text-white uppercase tracking-widest">{item.title}</span>
                    </div>
                    <span className="text-[8px] text-white/35 pl-3 leading-relaxed block">{item.desc}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <section className="py-28 bg-[#080510] border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#8a2be2/15,transparent_70%)] pointer-events-none" />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
            SUTRA doesn't just analyze evidence —
          </h2>
          <p className="text-2xl md:text-3xl font-black mb-10" style={{ background: 'linear-gradient(90deg,#d946ef,#8a2be2,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            it connects the dots and shows investigators the story hidden inside it.
          </p>
          <button
            onClick={onOpenDashboard}
            className="group px-12 py-5 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-all flex items-center gap-3 mx-auto shadow-[0_0_60px_rgba(217,70,239,0.3)] hover:shadow-[0_0_80px_rgba(217,70,239,0.5)]"
          >
            <Eye className="w-4 h-4" />
            Open Sample Investigation
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#080510] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 border border-white/60 flex items-center justify-center">
                <div className="w-3.5 h-3.5 bg-white transform rotate-45" />
              </div>
              <span className="text-xl font-black tracking-[0.2em] uppercase text-white">SUTRA</span>
            </div>
            <p className="text-white/30 text-[9px] uppercase tracking-widest leading-relaxed max-w-xs">
              AI-powered multimodal cybercrime investigation platform.<br />
              Mapping the unseen. Decoding the complex.
            </p>
          </div>
          <div>
            <h4 className="text-[8px] font-black uppercase tracking-widest text-white mb-4">Platform</h4>
            <ul className="space-y-2.5 text-[8px] uppercase tracking-widest text-white/30">
              {['Investigation Graph', 'Evidence Hub', 'SUTRA Copilot', 'AI Insights', 'Timeline'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[8px] font-black uppercase tracking-widest text-white mb-4">Legal</h4>
            <ul className="space-y-2.5 text-[8px] uppercase tracking-widest text-white/30">
              {['Privacy Policy', 'Terms of Service', 'Security'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex items-center justify-between text-[7px] uppercase tracking-widest text-white/20">
          <p>© {new Date().getFullYear()} SUTRA Analysis Systems. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            <span>Secure Enterprise Environment</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0710] font-sans text-white selection:bg-[#d946ef]/30 selection:text-white">
      <Header onOpenDashboard={onOpenDashboard} />
      <main>
        <Hero onOpenDashboard={onOpenDashboard} />
        <PipelineSection />
        <VehicleDemo />
        <CrossEvidenceSection />
        <GhostNodeSection />
        <CopilotSection onOpenDashboard={onOpenDashboard} />
        <Features />
        <FinalCTA onOpenDashboard={onOpenDashboard} />
      </main>
      <Footer />
    </div>
  );
}
