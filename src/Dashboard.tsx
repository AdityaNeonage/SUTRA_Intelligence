import { useState, useRef, useEffect } from 'react';
import { InvestigationGraph } from './components/InvestigationGraph';
import { TimelineIntelligence } from './components/TimelineIntelligence';
import { EntityResolution } from './components/EntityResolution';
import { EvidenceHub } from './components/EvidenceHub';
import { AIInsights } from './components/AIInsights';
import { EntityDetailPanel } from './components/EntityDetailPanel';
import { mockNodes, mockEdges, mockEvents, mockEntityResolution } from './data';
import { NodeData } from './types';
import {
  Network, Database, Clock, Brain, GitMerge, ArrowLeft,
  X, Search, Send, Loader2, ChevronRight, MessageSquare, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  onLogout: () => void;
}

type Tab = 'network' | 'evidence' | 'timeline' | 'entity' | 'insights';

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'network', icon: <Network className="w-4 h-4" />, label: 'Network' },
  { id: 'evidence', icon: <Database className="w-4 h-4" />, label: 'Evidence' },
  { id: 'timeline', icon: <Clock className="w-4 h-4" />, label: 'Timeline' },
  { id: 'entity', icon: <GitMerge className="w-4 h-4" />, label: 'Identity' },
  { id: 'insights', icon: <Brain className="w-4 h-4" />, label: 'AI' },
];

// --- SUTRA Copilot Demo Q&A ---
type Message = { role: 'user' | 'ai'; text: string; followups?: string[] };

const DEMO_QA: Record<string, Message> = {
  'why is p-037 important': {
    role: 'ai',
    text: '',
    followups: ['Show me the path', 'What should I investigate next?', 'Show all connections to Case 104'],
  },
  'show all connections between person a and case 104': {
    role: 'ai',
    text: `**Connection Path Found:**\n\nPERSON A → PHONE-X7192 → P-037 → ACCT-8921 → CASE #104\n\nAlternate path:\nPERSON A → WB12AB1234 → CCTV CAM-04 → CASE #104\n\n4 direct evidence items support this connection chain. Confidence: 91%`,
    followups: ['Who else connects to Case 104?', 'Show timeline for this path'],
  },
  'what should i investigate next': {
    role: 'ai',
    text: `**SUTRA Recommends:**\n\n① DEVICE D-917 — Could unlock 7 unexplained relationships. HIGH IMPACT\n\n② CCTV Archive (L-09) — Confirm Aug 14 ghost node location. HIGH IMPACT\n\n③ P-037 Full CDR — Could confirm Case 104 ↔ Case 287 link. HIGH IMPACT\n\nGo to AI Insights tab for full ranked recommendations.`,
    followups: ['Tell me about the Ghost Node', 'Analyze Person A'],
  },
};

function getAIResponse(query: string): Message {
  const lower = query.toLowerCase();
  for (const key of Object.keys(DEMO_QA)) {
    if (lower.includes(key) || key.split(' ').some(w => w.length > 4 && lower.includes(w))) {
      return DEMO_QA[key];
    }
  }
  if (lower.includes('p-037') || lower.includes('p037')) {
    return {
      role: 'ai',
      text: `**Entity P-037 — Critical Analysis:**\n\nConnected Cases: 4\nRelationships: 47\nShared Devices: 3\nCommon Locations: 5\n\n**Key Finding:** P-037 is the primary structural bridge between Case 104 and Case 287. Controlling account ACCT-8921, which processed ₹5.2M suspicious transfer on Aug 17.\n\nConfidence: 96%`,
      followups: ['Show path to Case 287', 'View evidence behind this'],
    };
  }
  if (lower.includes('ghost') || lower.includes('missing')) {
    return {
      role: 'ai',
      text: `**Ghost Node Detected — AI Hypothesis:**\n\nA potential missing intermediary (GHOST-∅) has been identified between Person A and P-037.\n\nSupporting signals:\n• Shared location (Kolkata, Aug 14)\n• Temporal correlation in communication gaps\n• Financial flow pattern\n\n⚠️ This is an AI hypothesis — NOT confirmed evidence. Confidence: 45%\n\nRecommendation: Obtain Device D-917 to investigate.`,
      followups: ['How do I investigate this?', 'What is the confidence level?'],
    };
  }
  return {
    role: 'ai',
    text: `I've analyzed the investigation graph for your query. I found **${Math.floor(Math.random() * 8) + 2} relevant entities** and **${Math.floor(Math.random() * 5) + 1} potential connection paths**.\n\nFor best results, try asking:\n• "Why is P-037 important?"\n• "Show connections between Person A and Case 104"\n• "What should I investigate next?"`,
    followups: ['Why is P-037 important?', 'Show all connections to Case 104'],
  };
}

function CopilotPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Active case loaded. I am monitoring the investigation graph.\n\nYou can ask me:\n• "Why is P-037 important?"\n• "Show connections between Person A and Case 104"\n• "What should I investigate next?"', followups: ['Why is P-037 important?', 'What should I investigate next?', 'Tell me about the Ghost Node'] },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const response = getAIResponse(text);
      setMessages(prev => [...prev, response]);
    }, 1200 + Math.random() * 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      transition={{ type: 'spring', damping: 28, stiffness: 200 }}
      className="fixed top-0 right-0 bottom-0 w-80 md:w-96 bg-sutra-dark border-l border-white/10 shadow-2xl z-[100] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-sutra-surface">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-2 border-sutra-red/50 bg-black flex items-center justify-center relative">
            <Brain className="w-4 h-4 text-sutra-red" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sutra-red animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-black text-white tracking-widest uppercase">SUTRA Copilot</div>
            <div className="text-[7px] text-green-400 uppercase tracking-widest">● Active Investigation</div>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 shrink-0 border flex items-center justify-center ${msg.role === 'ai' ? 'border-sutra-red/30 bg-sutra-dark' : 'border-white/20 bg-sutra-surface'}`}>
              {msg.role === 'ai' ? <Brain className="w-3.5 h-3.5 text-sutra-red" /> : <span className="text-[8px] font-bold text-white">INV</span>}
            </div>
            <div className={`flex-1 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
              <div className={`inline-block max-w-full p-3 border text-[10px] leading-relaxed ${msg.role === 'ai' ? 'border-l-2 border-sutra-red border-y-white/5 border-r-white/5 bg-sutra-surface text-white' : 'border-white/10 bg-sutra-surface-light text-white/70'}`}>
                {msg.text.split('\n').map((line, j) => (
                  <span key={j}>
                    {line.split('**').map((part, k) =>
                      k % 2 === 1 ? <strong key={k} className="text-white font-bold">{part}</strong> : part
                    )}
                    {j < msg.text.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
              {/* Followup chips */}
              {msg.followups && msg.role === 'ai' && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.followups.map((f, j) => (
                    <button key={j} onClick={() => sendMessage(f)} className="px-2 py-1 border border-white/10 text-[7px] uppercase tracking-widest text-white/40 hover:text-white hover:border-white/30 transition-colors flex items-center gap-1">
                      {f} <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-7 h-7 shrink-0 border border-sutra-red/30 bg-sutra-dark flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-sutra-red" />
            </div>
            <div className="p-3 border border-l-2 border-sutra-red border-y-white/5 border-r-white/5 bg-sutra-surface flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1 h-1 bg-sutra-red rounded-full" animate={{ y: [-2, 2, -2] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-sutra-surface">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask SUTRA about the case..."
            className="flex-1 bg-sutra-dark border border-white/10 py-2.5 pl-3 pr-3 text-[10px] text-white placeholder:text-white/25 focus:outline-none focus:border-sutra-red/50 transition-colors"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping} className="w-9 h-9 flex items-center justify-center bg-sutra-red text-white hover:bg-sutra-red/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
            {isTyping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('network');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  return (
    <div className="min-h-screen bg-sutra-dark flex text-white font-sans selection:bg-sutra-red selection:text-white">
      {/* Sidebar */}
      <div className="w-14 md:w-44 border-r border-white/10 bg-sutra-surface flex flex-col items-center md:items-start pb-4 shrink-0 z-50">
        {/* Logo */}
        <div className="h-14 w-full flex items-center justify-center md:justify-start md:px-3 border-b border-white/10 mb-4 gap-2.5">
          <button onClick={onLogout} className="w-7 h-7 flex items-center justify-center shrink-0 border border-white/10 text-white/30 hover:text-white hover:border-white/30 hover:bg-white/5 transition-colors" title="Back">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="hidden md:flex items-center gap-2">
            <div className="w-5 h-5 border border-white flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 bg-white transform rotate-45" />
            </div>
            <span className="text-base font-black tracking-[0.2em] uppercase text-white">SUTRA</span>
          </div>
        </div>

        {/* Case badge */}
        <div className="hidden md:block mx-3 mb-4 px-2 py-1.5 border border-white/10 bg-sutra-dark w-[calc(100%-1.5rem)]">
          <div className="text-[7px] text-white/30 uppercase tracking-widest">Active Case</div>
          <div className="text-[9px] text-white font-bold uppercase tracking-wider mt-0.5">Case #104</div>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-sutra-red animate-pulse" />
            <span className="text-[7px] text-sutra-red uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 w-full flex flex-col gap-1 px-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-center md:justify-start gap-2.5 px-2.5 py-2.5 border transition-all ${activeTab === tab.id ? 'border-white/20 bg-white/5 text-white' : 'border-transparent text-white/30 hover:text-white/60 hover:bg-white/3'}`}
            >
              {tab.icon}
              <span className="hidden md:block text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
              {tab.id === 'insights' && (
                <span className="hidden md:flex ml-auto w-4 h-4 items-center justify-center rounded-full bg-sutra-red text-white text-[6px] font-black">3</span>
              )}
            </button>
          ))}
        </nav>

        {/* Graph stats (desktop only) */}
        <div className="hidden md:block mx-3 mt-auto mb-3 w-[calc(100%-1.5rem)] border-t border-white/5 pt-3">
          <div className="text-[7px] text-white/20 uppercase tracking-widest mb-2">Graph Stats</div>
          <div className="space-y-1.5">
            <div className="flex justify-between"><span className="text-[7px] text-white/30">Nodes</span><span className="text-[7px] font-mono text-white/60">{mockNodes.length}</span></div>
            <div className="flex justify-between"><span className="text-[7px] text-white/30">Edges</span><span className="text-[7px] font-mono text-white/60">{mockEdges.length}</span></div>
            <div className="flex justify-between"><span className="text-[7px] text-white/30">Events</span><span className="text-[7px] font-mono text-white/60">{mockEvents.length}</span></div>
            <div className="flex justify-between"><span className="text-[7px] text-white/30 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sutra-red inline-block" />Ghost</span><span className="text-[7px] font-mono text-sutra-red">1</span></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            {activeTab === 'network' && (
              <div className="flex-1 flex gap-0 min-h-0 relative">
                <div className="flex-1 min-w-0 relative">
                  <InvestigationGraph
                    nodes={mockNodes}
                    edges={mockEdges}
                    onNodeSelect={setSelectedNode}
                    selectedNodeId={selectedNode?.id}
                  />
                  <AnimatePresence>
                    {selectedNode && (
                      <EntityDetailPanel
                        node={selectedNode}
                        onClose={() => setSelectedNode(null)}
                        onShowPath={() => { }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {activeTab === 'evidence' && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <EvidenceHub />
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="flex-1 min-h-0 p-4 flex flex-col gap-4">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <TimelineIntelligence events={mockEvents} />
                </div>
              </div>
            )}

            {activeTab === 'entity' && (
              <div className="flex-1 min-h-0 p-4 overflow-auto">
                <EntityResolution data={mockEntityResolution} />
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <AIInsights />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Copilot panel */}
      <AnimatePresence>
        {isCopilotOpen && <CopilotPanel onClose={() => setIsCopilotOpen(false)} />}
      </AnimatePresence>

      {/* Floating Copilot button */}
      <motion.div
        className="fixed bottom-5 right-5 z-[90]"
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.4, type: 'spring', damping: 20, stiffness: 150 }}
      >
        <button
          onClick={() => setIsCopilotOpen(c => !c)}
          className={`flex items-center gap-2.5 px-4 py-3 border transition-all duration-300 shadow-2xl ${isCopilotOpen ? 'bg-sutra-surface border-white/25 text-white' : 'bg-sutra-surface border-sutra-red/25 text-white/60 hover:border-sutra-red hover:text-white'} hover:shadow-[0_0_30px_rgba(217,70,239,0.25)] group`}
        >
          <div className="relative">
            <Brain className={`w-4 h-4 transition-colors ${isCopilotOpen ? 'text-white' : 'text-sutra-red'}`} />
            {!isCopilotOpen && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sutra-red animate-pulse shadow-[0_0_8px_#d946ef]" />}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">{isCopilotOpen ? 'Close' : 'SUTRA Copilot'}</span>
          {!isCopilotOpen && <Zap className="w-3 h-3 text-sutra-red/60" />}
        </button>
      </motion.div>
    </div>
  );
}
