// @ts-nocheck
import { useState, useEffect } from 'react';
import { EventData } from '../types';
import { Play, Pause, SkipForward, SkipBack, Calendar, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

interface TimelineIntelligenceProps {
  events: EventData[];
  onEventActive?: (event: EventData) => void;
}

export function TimelineIntelligence({ events, onEventActive }: TimelineIntelligenceProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // When active index changes, notify parent
  useEffect(() => {
    if (events && events.length > 0 && onEventActive) {
      onEventActive(events[activeIndex]);
    }
  }, [activeIndex, events, onEventActive]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveIndex((prev) => {
          if (prev >= events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500); // 1.5s per event frame
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, events.length]);

  if (!events || events.length === 0) {
    return (
      <div className="w-full bg-sutra-dark border border-white/10 flex items-center justify-center h-64 text-sutra-silver-muted text-xs uppercase tracking-widest">
        No events available in timeline.
      </div>
    );
  }

  // Parse dates for visual layout
  const startDate = new Date(events[0].timestamp);
  const endDate = new Date(events[events.length - 1].timestamp);

  // Chart Data
  const chartData = events.map((e, idx) => ({
    name: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date(e.timestamp).toLocaleDateString(),
    confidence: Math.round(e.confidence * 100),
    type: e.type,
    title: e.title,
    index: idx
  }));

  const activeEvent = chartData[activeIndex];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-sutra-dark border border-white/20 p-2 shadow-xl">
          <p className="text-[10px] text-white font-bold uppercase tracking-widest">{data.title}</p>
          <p className="text-[9px] text-sutra-red uppercase tracking-widest mt-1">Confidence: {data.confidence}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[400px] bg-sutra-dark border border-white/10 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-sutra-surface shrink-0 z-20">
        <div className="flex items-center gap-2 text-white">
          <Activity className="w-4 h-4" />
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-white">Timeline Intelligence & Analytics</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sutra-silver-muted text-[9px] uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col overflow-hidden">
        
        {/* Active Event Display */}
        <div className="absolute top-4 left-6 right-6 p-4 border border-white/10 bg-[#0a0710]/80 backdrop-blur-md z-20 shadow-2xl">
          <div className="flex justify-between items-start mb-1">
            <div className="text-[9px] font-bold text-sutra-red tracking-widest uppercase">
              {new Date(events[activeIndex].timestamp).toLocaleString()}
            </div>
            <div className="text-[9px] text-white/50 tracking-widest uppercase border border-white/10 px-1.5 py-0.5">
              Impact: {Math.round(events[activeIndex].confidence * 100)}%
            </div>
          </div>
          <div className="text-sm font-bold text-white uppercase tracking-widest mb-1">
            {events[activeIndex].title}
          </div>
          <div className="text-[10px] text-sutra-silver-muted uppercase tracking-widest">
            {events[activeIndex].description}
          </div>
        </div>

        {/* Interactive Chart */}
        <div className="absolute inset-0 pt-28 pb-20 px-4 z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} 
              onClick={(e) => {
                if (e && e.activePayload) {
                  setActiveIndex(e.activePayload[0].payload.index);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <defs>
                <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              {activeEvent && (
                <ReferenceLine x={activeEvent.name} stroke="#ef4444" strokeDasharray="3 3" />
              )}
              <Area type="monotone" dataKey="confidence" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorConfidence)" activeDot={{ r: 6, fill: "#ef4444", stroke: "#000", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline Track */}
        <div className="relative h-12 w-full mt-auto z-20 px-6">
          {/* Base Line */}
          <div className="absolute top-1/2 left-6 right-6 h-px bg-[#333] -translate-y-1/2" />
          
          {/* Progress Line */}
          <motion.div 
            className="absolute top-1/2 left-6 h-px bg-sutra-red -translate-y-1/2"
            initial={{ width: '0%' }}
            animate={{ width: `calc(${(activeIndex / (events.length - 1)) * 100}% - 48px)` }}
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
                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group"
                style={{ left: `calc(1.5rem + ${position}% * ((100% - 3rem) / 100))` }}
                onClick={() => setActiveIndex(idx)}
              >
                <div className="absolute bottom-4 text-[9px] text-sutra-silver-muted uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-sutra-dark px-1">
                  {new Date(event.timestamp).toLocaleDateString()}
                </div>
                <div className={`w-3 h-3 border ${isActive ? 'border-sutra-red bg-sutra-dark scale-125' : isPast ? 'border-white bg-white/20' : 'border-white/20 bg-sutra-dark'} transition-all`} />
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
