// @ts-nocheck
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { mockHypotheses, mockNextEvidence } from '../data';
import { Hypothesis, NextEvidence } from '../types';
import { AlertTriangle, Lightbulb, Target, TrendingUp, Search, CheckCircle2, X, ChevronRight, Zap, Brain, Activity } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const IMPACT_CONFIG = {
  high:   { color: '#d946ef', bg: 'bg-sutra-red/10', border: 'border-sutra-red/30', label: 'HIGH IMPACT' },
  medium: { color: '#f59e0b', bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  label: 'MED IMPACT' },
  low:    { color: '#60a5fa', bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   label: 'LOW IMPACT' },
};

const NODE_TYPE_ICON: Record<string, string> = {
  device: '📱', location: '📍', account: '💳', phone: '📞',
  person: '👤', vehicle: '🚗', transaction: '💸', case: '📂',
};

function NextEvidenceCard({ item }: { item: NextEvidence }) {
  const cfg = IMPACT_CONFIG[item.impact];
  return (
    <motion.div
      className={`border ${cfg.border} ${cfg.bg} p-4 hover:border-opacity-60 transition-all cursor-pointer group`}
      whileHover={{ x: 3 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="text-2xl shrink-0 mt-0.5">{NODE_TYPE_ICON[item.type] || '🔍'}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-white">{item.title}</div>
              <div className="px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-widest border" style={{ color: cfg.color, borderColor: cfg.color }}>{cfg.label}</div>
            </div>
            <p className="text-[9px] text-white/50 leading-relaxed mb-3">{item.description}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border border-white/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white/40" />
                </div>
                <span className="text-[8px] text-white/40 uppercase tracking-widest">{item.relationships} relationships</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Brain className="w-3 h-3 text-sutra-red/60" />
                <span className="text-[8px] text-white/40 uppercase tracking-widest">{item.hypothesesAffected} hypotheses</span>
              </div>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}

function HypothesisCard({ item, onDismiss, onConfirm }: { item: Hypothesis; onDismiss: () => void; onConfirm: () => void }) {
  const [expanded, setExpanded] = useState(false);
  
  const typeConfig = {
    ghost_node:  { icon: '👻', color: '#d946ef', label: 'Ghost Node' },
    cross_case:  { icon: '🔗', color: '#60a5fa', label: 'Cross-Case Link' },
    pattern:     { icon: '🧬', color: '#f59e0b', label: 'Behavior Pattern' },
    missing_link:{ icon: '❓', color: '#fb923c', label: 'Missing Link' },
  };
  const tc = typeConfig[item.type];

  return (
    <motion.div
      layout
      className="border border-white/10 bg-sutra-surface overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-xl shrink-0">{tc.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 border" style={{ color: tc.color, borderColor: `${tc.color}40` }}>{tc.label}</div>
              <div className="text-[7px] text-white/30 uppercase tracking-widest">AI Hypothesis</div>
            </div>
            <div className="text-[10px] font-bold text-white uppercase tracking-widest leading-tight">{item.title}</div>
          </div>
          {/* Confidence */}
          <div className="shrink-0 text-center">
            <div className="text-xs font-black font-mono" style={{ color: tc.color }}>{(item.confidence * 100).toFixed(0)}%</div>
            <div className="text-[6px] uppercase tracking-widest text-white/30">conf.</div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="h-0.5 bg-white/5 mb-3">
          <motion.div
            className="h-full"
            style={{ background: tc.color }}
            initial={{ width: 0 }}
            animate={{ width: `${item.confidence * 100}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        </div>

        <p className="text-[9px] text-white/50 leading-relaxed mb-3">{item.description}</p>

        <button onClick={() => setExpanded(e => !e)} className="text-[8px] uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-1">
          Supporting Signals ({item.supportingSignals.length})
          <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 space-y-1 overflow-hidden"
            >
              {item.supportingSignals.map((sig, i) => (
                <li key={i} className="flex items-start gap-2 text-[9px] text-white/60">
                  <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: tc.color }} />
                  {sig}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex border-t border-white/5">
        <button onClick={onConfirm} className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-white/50 hover:text-green-400 hover:bg-green-400/5 transition-colors border-r border-white/5">
          <CheckCircle2 className="w-3 h-3" /> Investigate
        </button>
        <button onClick={onDismiss} className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
          <X className="w-3 h-3" /> Dismiss
        </button>
      </div>
    </motion.div>
  );
}

export function AIInsights() {
  const [tab, setTab] = useState<'next' | 'hypotheses' | 'metrics'>('next');
  const [hypotheses, setHypotheses] = useState(mockHypotheses.filter(h => h.status === 'active'));

  const activeHypotheses = hypotheses.filter(h => h.status === 'active');

  const processingData = [
    { time: '10:00', ms: 120 },
    { time: '10:05', ms: 155 },
    { time: '10:10', ms: 210 },
    { time: '10:15', ms: 175 },
    { time: '10:20', ms: 280 },
    { time: '10:25', ms: 165 },
    { time: '10:30', ms: 140 },
  ];

  const correlationData = [
    { depth: 'L1', density: 10 },
    { depth: 'L2', density: 35 },
    { depth: 'L3', density: 85 },
    { depth: 'L4', density: 140 },
    { depth: 'L5', density: 210 },
    { depth: 'L6', density: 175 },
    { depth: 'L7', density: 90 },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-sutra-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-sutra-surface shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-sutra-red" />
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-white">AI Insights</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {activeHypotheses.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 border border-sutra-red/30 bg-sutra-red/5">
              <div className="w-1.5 h-1.5 rounded-full bg-sutra-red animate-pulse" />
              <span className="text-[7px] text-sutra-red font-bold uppercase tracking-widest">{activeHypotheses.length} Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 shrink-0">
        {[
          { id: 'next', label: 'Next Best Evidence', icon: <Target className="w-3 h-3" /> },
          { id: 'hypotheses', label: 'Hypotheses', icon: <Lightbulb className="w-3 h-3" />, badge: activeHypotheses.length },
          { id: 'metrics', label: 'Metrics', icon: <Activity className="w-3 h-3" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[8px] font-bold uppercase tracking-widest transition-colors border-b-2 ${tab === t.id ? 'border-sutra-red text-white' : 'border-transparent text-white/30 hover:text-white/60'}`}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="px-1 py-0.5 bg-sutra-red text-white text-[6px] font-black rounded-sm">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {tab === 'next' && (
            <motion.div
              key="next"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="text-[8px] text-white/30 uppercase tracking-widest leading-relaxed">
                SUTRA AI recommends gathering these pieces of evidence next, ranked by structural impact on the investigation graph.
              </div>
              {mockNextEvidence.map((item, i) => (
                <div key={item.id} className="flex gap-2">
                  <div className="w-5 h-5 shrink-0 mt-1 border border-white/10 flex items-center justify-center text-[8px] font-black text-white/30 font-mono">{i + 1}</div>
                  <div className="flex-1"><NextEvidenceCard item={item} /></div>
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'hypotheses' && (
            <motion.div
              key="hyp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="text-[8px] text-white/30 uppercase tracking-widest leading-relaxed">
                AI-generated hypotheses based on graph structure analysis. These are potential connections — NOT confirmed evidence. Investigate before acting on any hypothesis.
              </div>
              {activeHypotheses.length === 0 && (
                <div className="text-center py-12 text-white/20">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-3" />
                  <div className="text-[9px] uppercase tracking-widest">All hypotheses resolved</div>
                </div>
              )}
              {activeHypotheses.map(h => (
                <HypothesisCard
                  key={h.id}
                  item={h}
                  onDismiss={() => setHypotheses(prev => prev.filter(x => x.id !== h.id))}
                  onConfirm={() => setHypotheses(prev => prev.filter(x => x.id !== h.id))}
                />
              ))}
            </motion.div>
          )}

          {tab === 'metrics' && (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-[8px] text-white/30 uppercase tracking-widest leading-relaxed">
                System telemetry indicating network processing times and entity correlation density across the investigation graph.
              </div>

              {/* Processing Time Chart */}
              <div className="border border-white/10 bg-white/5 p-4 rounded-xl">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                  <Activity className="w-3 h-3 text-sutra-red" />
                  Network Processing Time
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processingData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}ms`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0a0710', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px' }}
                        itemStyle={{ color: '#d946ef' }}
                      />
                      <Line type="monotone" dataKey="ms" stroke="#d946ef" strokeWidth={2} dot={{ r: 3, fill: '#d946ef', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Correlation Density Chart */}
              <div className="border border-white/10 bg-white/5 p-4 rounded-xl">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                  <Target className="w-3 h-3 text-blue-400" />
                  Entity Correlation Density
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={correlationData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <defs>
                        <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="depth" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0a0710', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px' }}
                        itemStyle={{ color: '#60a5fa' }}
                      />
                      <Area type="monotone" dataKey="density" stroke="#60a5fa" fillOpacity={1} fill="url(#colorDensity)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
