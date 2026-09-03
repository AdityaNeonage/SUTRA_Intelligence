// @ts-nocheck
import { useState } from 'react';
import { EventData } from '../types';
import { Play, Pause, SkipForward, SkipBack, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface TimelineIntelligenceProps {
  events: EventData[];
}

export function TimelineIntelligence({ events }: TimelineIntelligenceProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Parse dates for visual layout
  const startDate = new Date(events[0].timestamp);
  const endDate = new Date(events[events.length - 1].timestamp);

  return (
    <div className="w-full bg-sutra-dark border border-white/10 flex flex-col h-64">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-sutra-surface shrink-0">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-white">Timeline Intelligence</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sutra-silver-muted text-[9px] uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 relative flex flex-col justify-end">
        {/* Active Event Display */}
        <div className="absolute top-4 left-6 right-6 p-4 border border-white/5 bg-sutra-surface-light">
          <div className="text-[9px] font-bold text-sutra-red tracking-widest uppercase mb-1">
            {new Date(events[activeIndex].timestamp).toLocaleString()}
          </div>
          <div className="text-sm font-bold text-white uppercase tracking-widest mb-1">
            {events[activeIndex].title}
          </div>
          <div className="text-[10px] text-sutra-silver-muted uppercase tracking-widest">
            {events[activeIndex].description}
          </div>
        </div>

        {/* Timeline Track */}
        <div className="relative h-12 w-full mt-auto">
          {/* Base Line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[#333] -translate-y-1/2" />
          
          {/* Progress Line */}
          <motion.div 
            className="absolute top-1/2 left-0 h-px bg-sutra-red -translate-y-1/2"
            initial={{ width: '0%' }}
            animate={{ width: `${(activeIndex / (events.length - 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />

          {/* Event Nodes */}
          {events.map((event, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;
            const position = (idx / (events.length - 1)) * 100;
            
            return (
              <div 
                key={event.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer group"
                style={{ left: `${position}%` }}
                onClick={() => setActiveIndex(idx)}
              >
                <div className="mb-2 text-[9px] text-sutra-silver-muted uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleDateString()}
                </div>
                <div className={`w-3 h-3 border ${isActive ? 'border-sutra-red bg-sutra-dark' : isPast ? 'border-white bg-sutra-surface-light' : 'border-white/20 bg-sutra-dark'} transition-colors`} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 bg-sutra-surface p-2 flex justify-center gap-2">
        <button 
          onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
          className="w-8 h-8 flex items-center justify-center border border-white/10 bg-sutra-surface-light text-sutra-silver-muted hover:text-white transition-colors"
        >
          <SkipBack className="w-3 h-3" />
        </button>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-16 h-8 flex items-center justify-center border border-white/20 bg-sutra-dark text-white hover:bg-white hover:text-black transition-colors"
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
        <button 
          onClick={() => setActiveIndex(Math.min(events.length - 1, activeIndex + 1))}
          className="w-8 h-8 flex items-center justify-center border border-white/10 bg-sutra-surface-light text-sutra-silver-muted hover:text-white transition-colors"
        >
          <SkipForward className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
