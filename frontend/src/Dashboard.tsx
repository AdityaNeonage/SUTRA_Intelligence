
//3rd try 
//@ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InvestigationGraph } from './components/InvestigationGraph';
import { TimelineIntelligence } from './components/TimelineIntelligence';
import { EntityResolution } from './components/EntityResolution';
import { EvidenceHub } from './components/EvidenceHub';
import { AIInsights } from './components/AIInsights';
import { EntityDetailPanel } from './components/EntityDetailPanel';
import CrimeHotspotMap from './components/CrimeHotspotMap';
import { mockNodes, mockEdges, mockEvents, mockEntityResolution } from './data';
import { NodeData } from './types';

import {
  Network,
  Database,
  Clock,
  Brain,
  GitMerge,
  ArrowLeft,
  X,
  Search,
  Send,
  Loader2,
  ChevronRight,
  MessageSquare,
  Zap,
  Map
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Constants ---

interface DashboardProps {
  onLogout: () => void;
}

type Tab =
  | 'network'
  | 'evidence'
  | 'timeline'
  | 'entity'
  | 'insights'
  | 'hotspots';

type Message = {
  role: 'user' | 'ai';
  text: string;
  followups?: string[];
};

const TABS: {
  id: Tab;
  icon: React.ReactNode;
  label: string;
}[] = [
    {
      id: 'network',
      icon: <Network className="w-4 h-4" />,
      label: 'Network'
    },
    {
      id: 'evidence',
      icon: <Database className="w-4 h-4" />,
      label: 'Evidence'
    },
    {
      id: 'timeline',
      icon: <Clock className="w-4 h-4" />,
      label: 'Timeline'
    },
    {
      id: 'entity',
      icon: <GitMerge className="w-4 h-4" />,
      label: 'Identity'
    },
    {
      id: 'hotspots',
      icon: <Map className="w-4 h-4" />,
      label: 'Map'
    },
    {
      id: 'insights',
      icon: <Brain className="w-4 h-4" />,
      label: 'AI Insights'
    },

  ];

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'ai',
    text: 'Active case loaded. I am monitoring the investigation graph.\n\nYou can ask me:\n• "Why is P-037 important?"\n• "Show connections between Person A and Case 104"\n• "What should I investigate next?"',
    followups: [
      'Why is P-037 important?',
      'What should I investigate next?',
      'Tell me about the Ghost Node'
    ]
  },
];

// --- Mock AI Logic (Keep external to component to prevent recreation) ---

function getAIResponse(query: string): Message {
  const lower = query.toLowerCase();

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
      followups: [
        'How do I investigate this?',
        'What is the confidence level?'
      ],
    };
  }

  return {
    role: 'ai',
    text: `I've analyzed the investigation graph for your query. I found **${Math.floor(Math.random() * 8) + 2} relevant entities** and **${Math.floor(Math.random() * 5) + 1} potential connection paths**.\n\nFor best results, try asking:\n• "Why is P-037 important?"\n• "Show connections between Person A and Case 104"\n• "What should I investigate next?"`,
    followups: [
      'Why is P-037 important?',
      'Show all connections to Case 104'
    ],
  };
}

// --- Components ---

const Sidebar = ({
  activeTab,
  setActiveTab,
  onLogout
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onLogout: () => void
}) => (
  <aside className="w-16 md:w-56 border-r border-white/10 bg-sutra-surface flex flex-col items-center md:items-start pb-4 shrink-0 z-50 transition-all duration-300">

    <div className="h-16 w-full flex items-center justify-center md:justify-start md:px-4 border-b border-white/10 mb-4 gap-3">

      <button
        onClick={onLogout}
        aria-label="Back to dashboard"
        className="w-8 h-8 flex items-center justify-center shrink-0 rounded-md border border-white/10 text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-sutra-red outline-none"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="hidden md:flex items-center gap-2">

        <div className="w-6 h-6 border-2 border-white flex items-center justify-center shrink-0">
          <div className="w-3 h-3 bg-white transform rotate-45" />
        </div>

        <span className="text-lg font-black tracking-[0.2em] uppercase text-white">
          SUTRA
        </span>

      </div>

    </div>

    <div className="hidden md:block mx-4 mb-6 px-3 py-2 border border-white/10 bg-sutra-dark w-[calc(100%-2rem)] rounded-sm">

      <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
        Active Case
      </div>

      <div className="text-xs text-white font-bold uppercase tracking-wider mt-1">
        Case #104
      </div>

      <div className="flex items-center gap-1.5 mt-2">

        <div className="w-2 h-2 rounded-full bg-sutra-red animate-pulse" />

        <span className="text-[10px] text-sutra-red font-bold uppercase tracking-widest">
          Live Monitoring
        </span>

      </div>

    </div>

    <nav
      className="flex-1 w-full flex flex-col gap-1.5 px-3"
      role="tablist"
    >

      {TABS.map(tab => (

        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-3 border rounded-md transition-all focus-visible:ring-2 focus-visible:ring-white/30 outline-none
            ${activeTab === tab.id
              ? 'border-white/20 bg-white/5 text-white shadow-sm'
              : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5'
            }`}
        >

          {tab.icon}

          <span className="hidden md:block text-xs font-bold uppercase tracking-widest">
            {tab.label}
          </span>

          {tab.id === 'insights' && (
            <span className="hidden md:flex ml-auto w-5 h-5 items-center justify-center rounded-full bg-sutra-red text-white text-[10px] font-black shadow-[0_0_8px_#d946ef]">
              3
            </span>
          )}

        </button>

      ))}

    </nav>

  </aside>
);

const CopilotPanel = ({
  onClose,
  messages,
  isTyping,
  onSendMessage
}: {
  onClose: () => void;
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (text: string) => void
}) => {

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, isTyping]);

  const handleSend = () => {

    if (!input.trim() || isTyping) return;

    onSendMessage(input);

    setInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      transition={{
        type: 'spring',
        damping: 30,
        stiffness: 250
      }}
      className="fixed top-0 right-0 bottom-0 w-80 md:w-96 bg-sutra-dark border-l border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[100] flex flex-col"
    >

      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-sutra-surface">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 border-2 border-sutra-red/50 bg-black flex items-center justify-center relative rounded-sm">

            <Brain className="w-5 h-5 text-sutra-red" />

            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-sutra-red animate-pulse" />

          </div>

          <div>

            <div className="text-xs font-black text-white tracking-widest uppercase">
              SUTRA Copilot
            </div>

            <div className="text-[10px] text-green-400 uppercase tracking-widest font-semibold mt-0.5">
              ● Analysis Active
            </div>

          </div>

        </div>

        <button
          onClick={onClose}
          aria-label="Close Copilot"
          className="w-8 h-8 flex items-center justify-center rounded-md border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 outline-none"
        >
          <X className="w-4 h-4" />
        </button>

      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {messages.map((msg, i) => (

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={`flex gap-3 ${msg.role === 'user'
                ? 'flex-row-reverse'
                : ''
              }`}
          >

            <div
              className={`w-8 h-8 shrink-0 border rounded-sm flex items-center justify-center ${msg.role === 'ai'
                  ? 'border-sutra-red/40 bg-sutra-dark'
                  : 'border-white/20 bg-sutra-surface'
                }`}
            >
              {msg.role === 'ai'
                ? <Brain className="w-4 h-4 text-sutra-red" />
                : <span className="text-[10px] font-bold text-white">INV</span>}
            </div>

            <div
              className={`flex-1 ${msg.role === 'user'
                  ? 'flex justify-end'
                  : ''
                }`}
            >

              <div
                className={`inline-block max-w-full p-3.5 rounded-sm text-xs leading-relaxed shadow-sm ${msg.role === 'ai'
                    ? 'border border-l-2 border-sutra-red border-y-white/5 border-r-white/5 bg-sutra-surface text-white/90'
                    : 'border border-white/10 bg-sutra-surface-light text-white/70'
                  }`}
              >

                {msg.text.split('\n').map((line, j) => (

                  <React.Fragment key={j}>

                    {line.split('**').map((part, k) =>
                      k % 2 === 1
                        ? (
                          <strong
                            key={k}
                            className="text-white font-bold"
                          >
                            {part}
                          </strong>
                        )
                        : part
                    )}

                    {j < msg.text.split('\n').length - 1 && <br />}

                  </React.Fragment>

                ))}

              </div>

              {msg.followups && msg.role === 'ai' && (

                <div className="mt-3 flex flex-wrap gap-2">

                  {msg.followups.map((f, j) => (

                    <button
                      key={j}
                      onClick={() => onSendMessage(f)}
                      className="px-2.5 py-1.5 border border-white/10 rounded-sm text-[10px] uppercase tracking-widest text-white/50 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center gap-1.5 focus-visible:ring-1 outline-none"
                    >
                      {f}
                      <ChevronRight className="w-3 h-3" />
                    </button>

                  ))}

                </div>

              )}

            </div>

          </motion.div>

        ))}

        {isTyping && (

          <div className="flex gap-3">

            <div className="w-8 h-8 shrink-0 border border-sutra-red/40 rounded-sm bg-sutra-dark flex items-center justify-center">
              <Brain className="w-4 h-4 text-sutra-red" />
            </div>

            <div className="p-4 border border-l-2 border-sutra-red border-y-white/5 border-r-white/5 rounded-sm bg-sutra-surface flex items-center gap-2">

              {[0, 1, 2].map(i => (

                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-sutra-red rounded-full"
                  animate={{ y: [-3, 3, -3] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15
                  }}
                />

              ))}

            </div>

          </div>

        )}

        <div ref={bottomRef} />

      </div>

      <div className="p-4 border-t border-white/10 bg-sutra-surface">

        <div className="relative flex items-center gap-2">

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask SUTRA about the case..."
            className="flex-1 bg-sutra-dark border border-white/10 rounded-sm py-3 px-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-sutra-red/60 focus:ring-1 focus:ring-sutra-red/60 transition-all shadow-inner"
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="w-10 h-10 flex items-center justify-center rounded-sm bg-sutra-red text-white hover:bg-sutra-red/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sutra-dark outline-none"
          >
            {isTyping
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4 ml-0.5" />}
          </button>

        </div>

      </div>

    </motion.div>
  );
};

export function Dashboard({ onLogout }: DashboardProps) {

  const [activeTab, setActiveTab] =
    useState<Tab>('network');

  const [selectedNode, setSelectedNode] =
    useState<NodeData | null>(null);

  // Lifted Copilot State
  const [isCopilotOpen, setIsCopilotOpen] =
    useState(false);

  const [copilotMessages, setCopilotMessages] =
    useState<Message[]>(INITIAL_MESSAGES);

  const [isCopilotTyping, setIsCopilotTyping] =
    useState(false);

  // Memoized send function to prevent unnecessary re-renders of the CopilotPanel
  const handleSendMessage = useCallback((text: string) => {

    if (!text.trim()) return;

    setCopilotMessages(prev => [
      ...prev,
      {
        role: 'user',
        text
      }
    ]);

    setIsCopilotTyping(true);

    // Simulate network delay
    setTimeout(() => {

      const response = getAIResponse(text);

      setCopilotMessages(prev => [
        ...prev,
        response
      ]);

      setIsCopilotTyping(false);

    }, 1200 + Math.random() * 600);

  }, []);

  return (

    <div className="min-h-screen bg-sutra-dark flex text-white font-sans selection:bg-sutra-red selection:text-white overflow-hidden">

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
      />

      {/* Main Content Area */}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        <AnimatePresence mode="wait">

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: 0.2,
              ease: "easeInOut"
            }}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >

            {activeTab === 'network' && (

              <div className="flex-1 flex gap-0 min-h-0 relative bg-black/20">

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

            {/* Other tabs */}

            {activeTab === 'evidence' && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <EvidenceHub />
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="flex-1 min-h-0 p-6 flex flex-col gap-4">
                <TimelineIntelligence events={mockEvents} />
              </div>
            )}

            {activeTab === 'entity' && (
              <div className="flex-1 min-h-0 p-6 overflow-auto">
                <EntityResolution data={mockEntityResolution} />
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <AIInsights />
              </div>
            )}

            {/* NEW MAP SECTION ONLY */}

            {activeTab === 'hotspots' && (
              <CrimeHotspotMap />
            )}

          </motion.div>

        </AnimatePresence>

      </main>

      {/* Optional mobile scrim for the sidebar */}

      <AnimatePresence>

        {isCopilotOpen && (

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCopilotOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] md:hidden"
            aria-hidden="true"
          />

        )}

      </AnimatePresence>

      <AnimatePresence>

        {isCopilotOpen && (

          <CopilotPanel
            onClose={() => setIsCopilotOpen(false)}
            messages={copilotMessages}
            isTyping={isCopilotTyping}
            onSendMessage={handleSendMessage}
          />

        )}

      </AnimatePresence>

      {/* Floating Action Button */}

      <motion.div
        className="fixed bottom-6 right-6 z-[80]"
        initial={{
          opacity: 0,
          scale: 0.8,
          y: 20
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0
        }}
        transition={{
          delay: 0.2,
          type: 'spring',
          damping: 20,
          stiffness: 150
        }}
      >

        <button
          onClick={() => setIsCopilotOpen(c => !c)}
          aria-expanded={isCopilotOpen}
          aria-label="Toggle SUTRA Copilot"
          className={`flex items-center gap-3 px-5 py-3.5 rounded-full border transition-all duration-300 shadow-2xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sutra-dark outline-none
            ${isCopilotOpen
              ? 'bg-sutra-surface border-white/20 text-white'
              : 'bg-sutra-surface border-sutra-red/30 text-white/80 hover:border-sutra-red hover:text-white hover:shadow-[0_0_30px_rgba(217,70,239,0.3)]'
            }
            group`}
        >

          <div className="relative flex items-center justify-center">

            {isCopilotOpen
              ? <X className="w-5 h-5 text-white" />
              : <Brain className="w-5 h-5 text-sutra-red group-hover:scale-110 transition-transform" />}

            {!isCopilotOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sutra-red animate-pulse shadow-[0_0_10px_#d946ef]" />
            )}

          </div>

          <span className="text-xs font-black uppercase tracking-widest hidden sm:block">
            {isCopilotOpen
              ? 'Close AI'
              : 'SUTRA Copilot'}
          </span>

          {!isCopilotOpen && (
            <Zap className="w-3.5 h-3.5 text-sutra-red/80 hidden sm:block" />
          )}

        </button>

      </motion.div>

    </div>
  );
}