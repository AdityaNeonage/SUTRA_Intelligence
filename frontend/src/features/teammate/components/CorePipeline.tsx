import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, BrainCircuit, Link2, Network, Bot } from 'lucide-react';

const STAGES = [
  { id: 'evidence', label: 'Evidence Input', icon: <Database className="w-8 h-8" /> },
  { id: 'ai', label: 'Evidence Extraction', icon: <BrainCircuit className="w-8 h-8" /> },
  { id: 'linking', label: 'Entity Linking', icon: <Link2 className="w-8 h-8" /> },
  { id: 'graph', label: 'Investigation Graph', icon: <Network className="w-8 h-8" /> },
  { id: 'copilot', label: 'Sutra Copilot', icon: <Bot className="w-8 h-8" /> },
];

export function CorePipeline() {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % STAGES.length);
    }, 2500); // 2.5 seconds per stage
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-transparent relative overflow-hidden text-white min-h-[300px]">
      
      <div className="relative w-full max-w-5xl h-64 mt-2">
        
        {/* Background track line */}
        <div className="absolute top-1/2 left-[5%] right-[5%] h-1 border-t-[3px] border-dashed border-white/10 -translate-y-1/2 z-0"></div>
        
        {/* Progress highlight line */}
        <motion.div 
          className="absolute top-1/2 left-[5%] h-1 bg-sutra-red -translate-y-1/2 z-0"
          initial={{ width: '0%' }}
          animate={{ width: `${(activeStage / (STAGES.length - 1)) * 90}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />

        {/* Traveling energy particle */}
        <motion.div
          className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_20px_#fff] -translate-y-1/2 -translate-x-1/2 z-10"
          initial={{ left: '5%' }}
          animate={{ left: `${5 + (activeStage / (STAGES.length - 1)) * 90}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />

        {STAGES.map((stage, idx) => {
          const isActive = idx === activeStage;
          const isPast = idx < activeStage;
          const position = 5 + (idx / (STAGES.length - 1)) * 90;
          
          return (
            <div 
              key={stage.id} 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-40"
              style={{ left: `${position}%` }}
            >
              <motion.div 
                className={`w-20 h-20 rounded-full flex items-center justify-center border-[3px] transition-all duration-700 bg-sutra-dark backdrop-blur-md
                  ${isActive 
                    ? 'border-sutra-red text-sutra-red shadow-[0_0_40px_rgba(239,68,68,0.5)]' 
                    : isPast 
                      ? 'border-white/60 text-white/90' 
                      : 'border-white/20 text-white/30'}`}
                animate={{
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -5 : 0
                }}
              >
                {stage.icon}
              </motion.div>
              
              <div className={`mt-8 text-center transition-all duration-700
                ${isActive ? 'text-white translate-y-0 opacity-100' : isPast ? 'text-white/60 translate-y-0 opacity-100' : 'text-white/30 translate-y-2 opacity-50'}`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em]">{stage.label}</div>
              </div>

              {isActive && (
                <motion.div 
                  className="absolute top-1/2 left-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2 border border-sutra-red rounded-full"
                  style={{ marginTop: '-24px' }} // adjust for icon offset
                  initial={{ opacity: 1, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
