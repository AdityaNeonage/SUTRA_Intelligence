
// @ts-nocheck
import { motion, AnimatePresence } from 'motion/react';
import { NodeData, EdgeData, ConnectionWhy } from '../types';
import { X, Network, FileText, ChevronRight, AlertTriangle, Shield, GitBranch, Eye, Link } from 'lucide-react';
import { mockNodes, mockEdges } from '../data';

const NODE_CONFIG: Record<string, { color: string; icon: string }> = {
  person:       { color: '#ffffff',   icon: '👤' },
  vehicle:      { color: '#f59e0b',   icon: '🚗' },
  account:      { color: '#d946ef',   icon: '💳' },
  device:       { color: '#22d3ee',   icon: '📱' },
  location:     { color: '#4ade80',   icon: '📍' },
  phone:        { color: '#fb923c',   icon: '📞' },
  organization: { color: '#818cf8',   icon: '🏢' },
  evidence:     { color: '#94a3b8',   icon: '📷' },
  transaction:  { color: '#f43f5e',   icon: '💸' },
  case:         { color: '#60a5fa',   icon: '📂' },
  ghost:        { color: '#d946ef',   icon: '?' },
};

// Pre-computed WHY data for demo
const WHY_DATA: Record<string, { connections: number; cases: number; devices: number; locations: number; keyFinding: string; confidence: number; evidenceList: string[]; path?: string[] }> = {
  'n3': {
    connections: 47, cases: 4, devices: 3, locations: 5,
    keyFinding: 'Primary bridge between Case 104 and Case 287. Controls financial flow via ACCT-8921.',
    confidence: 0.96,
    evidenceList: ['Phone communication log (Aug 14)', 'ACCT-8921 transaction record', 'Shared device fingerprint DEV-IP-22', '3 matching timestamps across cases'],
    path: ['PERSON A', 'PHONE-X7192', 'P-037', 'ACCT-8921', 'CASE #104'],
  },
  'n1': {
    connections: 12, cases: 3, devices: 2, locations: 3,
    keyFinding: 'Primary suspect. Owner of vehicle WB12AB1234 seen at crime scene. Communication link to P-037.',
    confidence: 0.92,
    evidenceList: ['Vehicle registration record', 'CCTV CAM-04 footage (Aug 14)', 'FIR Case #104', 'Call record to PHONE-X7192'],
  },
  'n4': {
    connections: 5, cases: 1, devices: 0, locations: 2,
    keyFinding: 'Vehicle WB12AB1234 appears in CCTV at Case #104 location. Registered to Person A. 3 matching timestamps.',
    confidence: 0.95,
    evidenceList: ['CCTV CAM-04 capture (Aug 14, 14:20)', 'Vehicle registration: Person A', 'Location match: Kolkata L-09', 'Case #104 FIR reference'],
    path: ['PERSON A', 'WB12AB1234', 'CCTV CAM-04', 'CASE #104'],
  },
  'n9': {
    connections: 4, cases: 2, devices: 0, locations: 0,
    keyFinding: '₹5.2M transaction is the largest suspicious transfer in Case #104. Links ACCT-8921 to offshore ACCT-4491.',
    confidence: 0.99,
    evidenceList: ['Bank transaction log Aug 17', 'ACCT-8921 outbound record', 'ACCT-4491 inbound confirmation', 'Amount flagged by AML system'],
  },
};

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="border border-white/5 bg-sutra-surface p-3 flex flex-col gap-1">
      <div className="text-[8px] uppercase tracking-widest" style={{ color: 'rgba(160,158,171,0.7)' }}>{label}</div>
      <div className="text-lg font-black font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

interface EntityDetailPanelProps {
  node: NodeData;
  onClose: () => void;
  onShowPath?: () => void;
}

export function EntityDetailPanel({ node, onClose, onShowPath }: EntityDetailPanelProps) {
  const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.person;
  const why = WHY_DATA[node.id];

  // Find connected nodes
  const connectedEdges = mockEdges.filter(e => e.source === node.id || e.target === node.id);
  const connectedNodeIds = connectedEdges.map(e => e.source === node.id ? e.target : e.source);
  const connectedNodes = mockNodes.filter(n => connectedNodeIds.includes(n.id)).slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="absolute top-0 right-0 bottom-0 w-72 bg-sutra-dark border-l border-white/10 flex flex-col overflow-hidden z-10 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-white/10 bg-sutra-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center border-2 text-lg" style={{ borderColor: cfg.color, background: 'rgba(0,0,0,0.4)' }}>
            {cfg.icon}
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: cfg.color }}>{node.type}</div>
            <div className="text-sm font-black text-white uppercase tracking-widest leading-tight">{node.label}</div>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-white/10 text-white/40 hover:text-white transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Risk score + key stats */}
        <div className="p-4 border-b border-white/5 space-y-3">
          {/* Risk bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[8px] uppercase tracking-widest text-white/40">Risk Score</span>
              <span className="text-xs font-black font-mono text-sutra-red">{node.riskScore.toFixed(1)} / 10</span>
            </div>
            <div className="h-1 bg-white/5 w-full">
              <motion.div
                className="h-full bg-sutra-red"
                initial={{ width: 0 }}
                animate={{ width: `${node.riskScore * 10}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            </div>
          </div>

          {/* Stats grid */}
          {why && (
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Connections" value={why.connections} color={cfg.color} />
              <StatBox label="Cases" value={why.cases} color="#60a5fa" />
              <StatBox label="Devices" value={why.devices} color="#22d3ee" />
              <StatBox label="Locations" value={why.locations} color="#4ade80" />
            </div>
          )}
        </div>

        {/* Description */}
        {node.description && (
          <div className="p-4 border-b border-white/5">
            <div className="text-[8px] uppercase tracking-widest text-white/40 mb-2">Description</div>
            <p className="text-[10px] text-white/70 leading-relaxed">{node.description}</p>
          </div>
        )}

        {/* WHY PANEL */}
        {why && (
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-3 h-3 text-sutra-red" />
              <span className="text-[8px] uppercase tracking-widest text-sutra-red font-bold">Why Is This Entity Important?</span>
            </div>

            {/* Confidence */}
            <div className="flex items-center justify-between mb-3 p-2 border border-sutra-red/20 bg-sutra-red/5">
              <span className="text-[8px] uppercase tracking-widest text-white/40">AI Confidence</span>
              <span className="text-xs font-black font-mono text-sutra-red">{(why.confidence * 100).toFixed(0)}%</span>
            </div>

            {/* Key finding */}
            <div className="p-3 border-l-2 border-sutra-red bg-sutra-surface mb-3">
              <p className="text-[9px] text-white/80 leading-relaxed">{why.keyFinding}</p>
            </div>

            {/* Evidence list */}
            <div className="text-[8px] uppercase tracking-widest text-white/40 mb-2">Supporting Evidence</div>
            <ul className="space-y-1.5 mb-4">
              {why.evidenceList.map((ev, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-3 h-3 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-white/50" />
                  </div>
                  <span className="text-[9px] text-white/60">{ev}</span>
                </li>
              ))}
            </ul>

            {/* Path if available */}
            {why.path && (
              <div className="p-2 bg-sutra-surface border border-white/5">
                <div className="text-[7px] uppercase tracking-widest text-white/30 mb-2">Connection Path</div>
                <div className="flex flex-wrap items-center gap-1">
                  {why.path.map((step, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-[8px] font-bold text-white/70 bg-white/5 px-1 py-0.5">{step}</span>
                      {i < why.path!.length - 1 && <ChevronRight className="w-2.5 h-2.5 text-white/20" />}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connected nodes */}
        {connectedNodes.length > 0 && (
          <div className="p-4 border-b border-white/5">
            <div className="text-[8px] uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1.5">
              <Link className="w-3 h-3" /> Direct Connections
            </div>
            <div className="space-y-1.5">
              {connectedNodes.map(cn => {
                const cnCfg = NODE_CONFIG[cn.type] || NODE_CONFIG.person;
                const edge = connectedEdges.find(e => e.source === cn.id || e.target === cn.id);
                return (
                  <div key={cn.id} className="flex items-center justify-between p-2 border border-white/5 bg-sutra-surface hover:border-white/15 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cnCfg.icon}</span>
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: cnCfg.color }}>{cn.label}</div>
                        {edge?.label && <div className="text-[7px] text-white/30 uppercase tracking-widest">{edge.label}</div>}
                      </div>
                    </div>
                    {edge?.confidence && (
                      <span className="text-[7px] font-mono text-white/30">{(edge.confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ghost node warning */}
        {node.isGhost && (
          <div className="p-4">
            <div className="border border-sutra-red/30 bg-sutra-red/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-sutra-red" />
                <span className="text-[8px] uppercase tracking-widest text-sutra-red font-bold">AI Hypothesis</span>
              </div>
              <p className="text-[9px] text-white/60 leading-relaxed mb-2">
                This node represents a <strong className="text-white/80">potential missing intermediary</strong> detected by AI structural analysis. It is NOT confirmed evidence.
              </p>
              <div className="text-[7px] uppercase tracking-widest text-white/30">Supporting signals:</div>
              <ul className="mt-1 space-y-0.5">
                {['Shared location', 'Temporal correlation', 'Related communication event'].map((s, i) => (
                  <li key={i} className="text-[8px] text-white/50 flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-sutra-red/60" />{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-3 border-t border-white/10 bg-sutra-surface flex gap-2 shrink-0">
        <button onClick={onShowPath} className="flex-1 py-2.5 bg-white text-black text-[8px] font-black uppercase tracking-widest hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5">
          <Network className="w-3 h-3" /> Show Path
        </button>
        <button className="flex-1 py-2.5 border border-white/15 text-white/60 text-[8px] font-bold uppercase tracking-widest hover:text-white hover:border-white/30 transition-colors flex items-center justify-center gap-1.5">
          <FileText className="w-3 h-3" /> Evidence
        </button>
      </div>
    </motion.div>
  );
}
