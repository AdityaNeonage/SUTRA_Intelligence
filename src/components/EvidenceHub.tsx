import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EvidenceItem, ExtractedEntity } from '../types';
import { mockEvidence } from '../data';
import { Upload, FileText, Image, Video, Mic, Car, Phone, CreditCard, MapPin, Globe, Mail, AlignLeft, CheckCircle2, Loader2, AlertCircle, Plus, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const EVIDENCE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; accept: string }> = {
  document: { icon: <FileText className="w-5 h-5" />, label: 'Document', color: '#94a3b8', accept: '.pdf,.doc,.docx,.txt' },
  image: { icon: <Image className="w-5 h-5" />, label: 'Image', color: '#60a5fa', accept: '.jpg,.jpeg,.png,.webp' },
  video: { icon: <Video className="w-5 h-5" />, label: 'Video / CCTV', color: '#a78bfa', accept: '.mp4,.avi,.mov,.mkv' },
  audio: { icon: <Mic className="w-5 h-5" />, label: 'Audio', color: '#f472b6', accept: '.mp3,.wav,.m4a,.ogg' },
  vehicle: { icon: <Car className="w-5 h-5" />, label: 'Vehicle No.', color: '#f59e0b', accept: '.jpg,.jpeg,.png' },
  phone: { icon: <Phone className="w-5 h-5" />, label: 'Call Records', color: '#fb923c', accept: '.csv,.xlsx' },
  account: { icon: <CreditCard className="w-5 h-5" />, label: 'Transactions', color: '#d946ef', accept: '.csv,.xlsx,.pdf' },
  location: { icon: <MapPin className="w-5 h-5" />, label: 'Location', color: '#4ade80', accept: '.kml,.geojson,.csv' },
  ip: { icon: <Globe className="w-5 h-5" />, label: 'IP / Digital', color: '#22d3ee', accept: '.log,.txt,.csv' },
  email: { icon: <Mail className="w-5 h-5" />, label: 'Email', color: '#818cf8', accept: '.eml,.msg,.txt' },
  text: { icon: <AlignLeft className="w-5 h-5" />, label: 'Report / Text', color: '#e2e8f0', accept: '.txt,.pdf,.doc' },
};

const ENTITY_NODE_CONFIG: Record<string, { color: string; icon: string }> = {
  person: { color: '#ffffff', icon: '👤' }, vehicle: { color: '#f59e0b', icon: '🚗' },
  account: { color: '#d946ef', icon: '💳' }, device: { color: '#22d3ee', icon: '📱' },
  location: { color: '#4ade80', icon: '📍' }, phone: { color: '#fb923c', icon: '📞' },
  evidence: { color: '#94a3b8', icon: '📷' }, transaction: { color: '#f43f5e', icon: '💸' },
  case: { color: '#60a5fa', icon: '📂' }, ghost: { color: '#d946ef', icon: '?' },
  organization: { color: '#818cf8', icon: '🏢' },
};

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const [expanded, setExpanded] = useState(item.status === 'done' && (item.extractedEntities?.length || 0) > 0);
  const typeCfg = EVIDENCE_TYPE_CONFIG[item.type] || EVIDENCE_TYPE_CONFIG.document;

  return (
    <motion.div
      layout
      className="border border-white/10 bg-sutra-surface overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Type icon */}
        <div className="w-9 h-9 flex items-center justify-center border border-white/10 bg-sutra-dark shrink-0" style={{ color: typeCfg.color }}>
          {typeCfg.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-white truncate uppercase tracking-widest">{item.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[7px] uppercase tracking-widest" style={{ color: typeCfg.color }}>{typeCfg.label}</span>
            {item.size && <span className="text-[7px] text-white/30">{item.size}</span>}
          </div>
        </div>

        {/* Status */}
        <div className="shrink-0 flex items-center gap-2">
          {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          {item.status === 'processing' && (
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 text-sutra-red animate-spin" />
              <span className="text-[8px] text-sutra-red font-bold">{item.progress}%</span>
            </div>
          )}
          {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          {item.status === 'queued' && <div className="text-[7px] uppercase tracking-widest text-white/30">Queued</div>}

          {item.extractedEntities && item.extractedEntities.length > 0 && (
            <button onClick={() => setExpanded(e => !e)} className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for processing */}
      {item.status === 'processing' && (
        <div className="h-0.5 bg-white/5 mx-3 mb-3">
          <motion.div className="h-full bg-sutra-red" style={{ width: `${item.progress}%` }} />
        </div>
      )}

      {/* Extracted entities */}
      <AnimatePresence>
        {expanded && item.extractedEntities && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 overflow-hidden"
          >
            <div className="px-3 py-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-sutra-red" />
              <span className="text-[7px] uppercase tracking-widest text-sutra-red font-bold">Extracted Entities</span>
            </div>
            <div className="px-3 pb-3 space-y-1.5">
              {item.extractedEntities.map(entity => {
                const enCfg = ENTITY_NODE_CONFIG[entity.type] || ENTITY_NODE_CONFIG.person;
                return (
                  <div key={entity.id} className="flex items-center justify-between p-2 border border-white/5 bg-sutra-dark group hover:border-white/15 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{enCfg.icon}</span>
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: enCfg.color }}>{entity.label}</div>
                        <div className="text-[7px] text-white/30 uppercase">{entity.type} · {(entity.confidence * 100).toFixed(0)}% confidence</div>
                      </div>
                    </div>
                    {entity.addedToGraph ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="text-[7px] uppercase tracking-widest">In Graph</span>
                      </div>
                    ) : (
                      <button className="flex items-center gap-1 text-white/40 hover:text-white transition-colors px-2 py-1 border border-white/10 hover:border-white/30">
                        <Plus className="w-3 h-3" />
                        <span className="text-[7px] uppercase tracking-widest">Add</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DropZone({ onDrop }: { onDrop?: (files: File[]) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDrop?.(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onDrop?.(Array.from(e.target.files));
    }
  };

  return (
    <>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
      />
      <div
        className={`border-2 border-dashed transition-all duration-200 p-8 flex flex-col items-center justify-center gap-4 cursor-pointer ${isDragOver ? 'border-sutra-red bg-sutra-red/5' : 'border-white/10 hover:border-white/25'}`}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <motion.div
          animate={{ y: isDragOver ? -4 : 0, scale: isDragOver ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
          className="w-12 h-12 border border-white/20 flex items-center justify-center"
          style={{ borderColor: isDragOver ? '#d946ef' : undefined }}
        >
          <Upload className={`w-6 h-6 ${isDragOver ? 'text-sutra-red' : 'text-white/30'}`} />
        </motion.div>
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white mb-1">
            {isDragOver ? 'Drop to Analyze' : 'Drag & Drop Evidence or Click to Browse'}
          </div>
          <div className="text-[8px] text-white/30 uppercase tracking-widest">
            Documents · Images · Videos · Audio · CSV · More
          </div>
        </div>
        {!isDragOver && (
          <div className="flex flex-wrap justify-center gap-1.5 max-w-xs">
            {Object.entries(EVIDENCE_TYPE_CONFIG).map(([type, cfg]) => (
              <div key={type} className="flex items-center gap-1 px-1.5 py-0.5 border border-white/10" style={{ color: cfg.color }}>
                <span className="text-[8px]">{cfg.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function EvidenceHub() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  const handleDropDemo = useCallback((files: File[]) => {
    files.forEach(file => {
      // Determine type based on extension or mime
      let type: EvidenceItem['type'] = 'document';
      const name = file.name.toLowerCase();
      if (name.match(/\.(jpg|jpeg|png|webp|heic)$/)) type = 'image';
      if (name.match(/\.(mp4|avi|mov|mkv)$/)) type = 'video';
      if (name.match(/\.(mp3|wav|m4a|ogg)$/)) type = 'audio';
      if (name.match(/\.(csv|xlsx)$/)) type = 'account';

      const demoFile: EvidenceItem = {
        id: `evi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        type: type,
        status: 'queued',
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        extractedEntities: [],
      };

      setEvidence(prev => [demoFile, ...prev]);

      // Simulate processing
      setTimeout(() => {
        setEvidence(prev => prev.map(e => e.id === demoFile.id ? { ...e, status: 'processing', progress: 30 } : e));
      }, 800);
      setTimeout(() => {
        setEvidence(prev => prev.map(e => e.id === demoFile.id ? { ...e, progress: 75 } : e));
      }, 1800);
      setTimeout(() => {
        setEvidence(prev => prev.map(e => e.id === demoFile.id ? {
          ...e, status: 'done', progress: 100,
          extractedEntities: [
            { id: `ee_${Date.now()}`, label: `EXTRACTED FROM ${file.name.substring(0, 8).toUpperCase()}`, type: 'person', confidence: 0.87, sourceEvidenceId: demoFile.id, addedToGraph: false },
          ]
        } : e));
      }, 3000);
    });
  }, []);

  const stats = {
    total: evidence.length,
    done: evidence.filter(e => e.status === 'done').length,
    processing: evidence.filter(e => e.status === 'processing').length,
    entities: evidence.reduce((acc, e) => acc + (e.extractedEntities?.length || 0), 0),
    addedToGraph: evidence.reduce((acc, e) => acc + (e.extractedEntities?.filter(en => en.addedToGraph).length || 0), 0),
  };

  return (
    <div className="w-full h-full flex flex-col bg-sutra-dark overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-sutra-surface shrink-0">
        <div>
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-white">Evidence Hub</h3>
          <div className="text-[7px] uppercase tracking-widest text-white/30 mt-0.5">Multimodal Evidence Ingestion</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            <span className="text-[7px] uppercase tracking-widest text-white/40">{stats.done} Processed</span>
          </div>
          {stats.processing > 0 && (
            <div className="flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 text-sutra-red animate-spin" />
              <span className="text-[7px] uppercase tracking-widest text-sutra-red">{stats.processing} Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 border-b border-white/5 shrink-0">
        {[
          { label: 'Evidence Files', value: stats.total, color: 'text-white' },
          { label: 'Processed', value: stats.done, color: 'text-green-400' },
          { label: 'Entities Found', value: stats.entities, color: 'text-sutra-red' },
          { label: 'In Graph', value: stats.addedToGraph, color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="py-2.5 px-3 border-r border-white/5 last:border-r-0 text-center">
            <div className={`text-lg font-black font-mono ${s.color}`}>{s.value}</div>
            <div className="text-[7px] uppercase tracking-widest text-white/30">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <DropZone onDrop={handleDropDemo} />

        {/* Processing pipeline legend */}
        <div className="flex items-center gap-0 text-[7px] uppercase tracking-widest text-white/30">
          {['Upload', '→', 'AI Extraction', '→', 'Entity Graph', '→', 'Insights'].map((s, i) => (
            <span key={i} className={s === '→' ? 'mx-2 text-sutra-red/40' : (i === 0 || i === 6 ? 'text-white/50' : '')}>{s}</span>
          ))}
        </div>

        {/* Evidence list */}
        <div className="space-y-2">
          <div className="text-[8px] uppercase tracking-widest text-white/30">Evidence Queue ({evidence.length})</div>
          {evidence.map(item => <EvidenceCard key={item.id} item={item} />)}
        </div>
      </div>
    </div>
  );
}
