import { motion } from 'motion/react';

export function HoloSection() {
  return (
    <section className="py-32 relative bg-[#0a0710] overflow-hidden flex flex-col items-center justify-center min-h-[80vh] border-y border-white/5">
      {/* Header Text */}
      <motion.div 
        className="text-center z-20 mb-20"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#8a2be2]/30 bg-black/50 text-[#d946ef] text-[10px] font-bold uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
          System Core
        </div>
        <h2 className="text-3xl md:text-5xl font-black tracking-[0.1em] uppercase text-white drop-shadow-[0_0_20px_rgba(138,43,226,0.4)]">
          Nexus Projection
        </h2>
      </motion.div>

      {/* Hologram Container */}
      <div className="relative w-[500px] h-[400px] flex items-center justify-center" style={{ perspective: "1000px" }}>
        
        {/* Base / Floor Rings */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: "rotateX(70deg)", transformStyle: "preserve-3d" }}
        >
          {/* Ring 1 (Outer) */}
          <motion.div 
            className="absolute w-[450px] h-[450px] rounded-full border-4 border-[#8a2be2]/20 border-t-[#d946ef]/60"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute w-[420px] h-[420px] rounded-full border-[1px] border-dashed border-white/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          />
          {/* Ring 2 */}
          <motion.div 
            className="absolute w-[340px] h-[340px] rounded-full border-8 border-transparent border-l-[#8a2be2]/40 border-r-[#d946ef]/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          >
            {/* tech details on ring */}
            <div className="absolute top-0 left-1/2 w-4 h-8 bg-white/40 -translate-x-1/2 shadow-[0_0_15px_#fff]" />
            <div className="absolute bottom-0 left-1/2 w-4 h-8 bg-[#d946ef]/60 -translate-x-1/2 shadow-[0_0_15px_#d946ef]" />
          </motion.div>
          {/* Ring 3 */}
          <motion.div 
            className="absolute w-[260px] h-[260px] rounded-full border-2 border-white/10"
          />
          <motion.div 
            className="absolute w-[240px] h-[240px] rounded-full border-[3px] border-dashed border-[#d946ef]/50 shadow-[0_0_30px_rgba(217,70,239,0.3)]"
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          {/* Ring 4 (Inner core glow) */}
          <motion.div 
            className="absolute w-[160px] h-[160px] rounded-full border-4 border-[#8a2be2] shadow-[0_0_50px_#8a2be2,inset_0_0_30px_#8a2be2]"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute top-[-4px] left-1/2 w-8 h-8 border-t-4 border-[#d946ef] rounded-full -translate-x-1/2 shadow-[0_0_20px_#d946ef]" />
          </motion.div>
        </div>

        {/* Projector Beam (Vertical) */}
        <div className="absolute bottom-[200px] left-1/2 -translate-x-1/2 w-[140px] h-[250px] bg-gradient-to-t from-[#d946ef]/40 via-[#8a2be2]/10 to-transparent blur-[8px] pointer-events-none transform origin-bottom" style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)" }} />
        
        {/* Core Diamond (Standing Up) */}
        <motion.div 
          className="absolute z-10 bottom-[180px] left-1/2 -translate-x-1/2 w-[60px] h-[60px] bg-white shadow-[0_0_40px_#fff,0_0_80px_#d946ef]"
          style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-1 bg-[#d946ef]" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
          <div className="absolute inset-2 bg-[#0a0710]" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
          <div className="absolute inset-3 bg-white" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
        </motion.div>

        {/* Floating Hologram Screen (Vertical) */}
        <motion.div 
          className="absolute z-20 bottom-[260px] left-1/2 -translate-x-1/2 w-[220px] h-[120px] bg-[#0a0710]/60 backdrop-blur-md border border-[#d946ef]/50 shadow-[0_0_30px_rgba(138,43,226,0.3)] flex flex-col p-3 overflow-hidden"
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(217, 70, 239, .3) 25%, rgba(217, 70, 239, .3) 26%, transparent 27%, transparent 74%, rgba(217, 70, 239, .3) 75%, rgba(217, 70, 239, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(217, 70, 239, .3) 25%, rgba(217, 70, 239, .3) 26%, transparent 27%, transparent 74%, rgba(217, 70, 239, .3) 75%, rgba(217, 70, 239, .3) 76%, transparent 77%, transparent)', backgroundSize: '16px 16px' }} />
          
          <div className="flex justify-between items-center border-b border-[#d946ef]/30 pb-1 mb-2">
            <span className="text-[#d946ef] text-[8px] uppercase tracking-widest font-bold">Target Locked</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-white animate-pulse" />
              <div className="w-1 h-1 bg-white animate-pulse delay-75" />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-2 w-3/4 bg-[#8a2be2]/40 rounded-full overflow-hidden">
              <motion.div className="h-full bg-white" animate={{ width: ["0%", "100%", "0%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
            </div>
            <div className="h-2 w-1/2 bg-[#8a2be2]/40 rounded-full" />
            <div className="h-2 w-full bg-[#8a2be2]/20 rounded-full mt-auto flex gap-1 p-[1px]">
              {[...Array(10)].map((_, i) => (
                <motion.div 
                  key={i} 
                  className="h-full flex-1 bg-[#d946ef]"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
