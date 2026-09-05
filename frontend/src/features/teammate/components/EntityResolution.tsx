import { useState } from 'react';
import { EntityResolutionData } from '../types';
import { GitMerge, GitBranch, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface EntityResolutionProps {
  data: EntityResolutionData;
}

export function EntityResolution({ data }: EntityResolutionProps) {
  const [decision, setDecision] = useState<string>();
  return (
    <div className="w-full h-full bg-sutra-dark border border-white/10 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-sutra-surface shrink-0">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-white flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-sutra-red" />
          Entity Resolution
        </h3>
        <div className="px-2 py-1 border border-sutra-red/30 bg-sutra-dark text-[9px] text-sutra-red font-bold tracking-widest uppercase">
          AI Confidence: {(data.similarityScore * 100).toFixed(1)}%
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/20 bg-sutra-surface-light flex items-center justify-center text-[10px] text-white font-bold z-10">
            VS
          </div>
          
          {/* Entity A */}
          <div className="border border-white/5 bg-sutra-surface p-4">
            <div className="text-[9px] text-sutra-silver-muted uppercase tracking-widest mb-1">Record ID</div>
            <div className="text-[10px] font-bold text-white uppercase tracking-widest font-mono mb-4">{data.entityA.id}</div>
            
            <div className="space-y-3">
              <div>
                <div className="text-[9px] text-sutra-silver-muted uppercase tracking-widest">Name</div>
                <div className="text-xs text-sutra-silver font-bold uppercase tracking-widest">{data.entityA.name}</div>
              </div>
              <div>
                <div className="text-[9px] text-sutra-silver-muted uppercase tracking-widest">Phone</div>
                <div className="text-xs text-sutra-silver font-bold uppercase tracking-widest">{data.entityA.phone}</div>
              </div>
              <div>
                <div className="text-[9px] text-sutra-silver-muted uppercase tracking-widest">Location</div>
                <div className="text-xs text-sutra-silver font-bold uppercase tracking-widest">{data.entityA.location}</div>
              </div>
            </div>
          </div>

          {/* Entity B */}
          <div className="border border-white/5 bg-sutra-surface p-4">
            <div className="text-[9px] text-sutra-silver-muted uppercase tracking-widest mb-1">Record ID</div>
            <div className="text-[10px] font-bold text-white uppercase tracking-widest font-mono mb-4">{data.entityB.id}</div>
            
            <div className="space-y-3">
              <div>
                <div className="text-[9px] text-sutra-silver-muted uppercase tracking-widest">Name</div>
                <div className="text-xs text-sutra-silver font-bold uppercase tracking-widest">{data.entityB.name}</div>
              </div>
              <div>
                <div className="text-[9px] text-sutra-silver-muted uppercase tracking-widest">Phone</div>
                <div className="text-xs text-sutra-silver font-bold uppercase tracking-widest">{data.entityB.phone}</div>
              </div>
              <div>
                <div className="text-[9px] text-sutra-silver-muted uppercase tracking-widest">Location</div>
                <div className="text-xs text-sutra-silver font-bold uppercase tracking-widest">{data.entityB.location}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-white/5 p-3 bg-sutra-surface">
            <div className="flex items-center gap-2 text-[9px] text-white font-bold tracking-widest uppercase mb-2">
              <CheckCircle2 className="w-3 h-3 text-white" /> Confirmed Matches
            </div>
            <ul className="space-y-1">
              {data.matches.map((match, idx) => (
                <li key={idx} className="text-[10px] text-sutra-silver-muted uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 bg-white" /> {match}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-sutra-red/30 p-3 bg-sutra-surface-light">
            <div className="flex items-center gap-2 text-[9px] text-sutra-red font-bold tracking-widest uppercase mb-2">
              <AlertTriangle className="w-3 h-3 text-sutra-red" /> Conflict Signals
            </div>
            <ul className="space-y-1">
              {data.conflicts.map((conflict, idx) => (
                <li key={idx} className="text-[10px] text-sutra-silver-muted uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 bg-sutra-red" /> {conflict}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {decision && <p role="status" className="p-3 text-xs text-sutra-red">Sample review: {decision}. No live records changed.</p>}
      <div className="p-4 border-t border-white/10 bg-sutra-surface flex gap-3">
        <button onClick={() => setDecision("merge proposed for review")} className="flex-1 py-3 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2">
          <GitMerge className="w-3 h-3" /> Merge Profiles
        </button>
        <button onClick={() => setDecision("profiles kept separate")} className="flex-1 py-3 border border-white/5 text-sutra-silver-muted text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2">
          <GitBranch className="w-3 h-3" /> Keep Separate
        </button>
      </div>
    </div>
  );
}
