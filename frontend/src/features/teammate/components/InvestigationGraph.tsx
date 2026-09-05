import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NodeData, EdgeData } from '../types';
import { Filter, Maximize2, Search, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

// Node color config per type
const NODE_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  person:       { color: '#ffffff',   bg: '#1a1625', icon: '👤', label: 'Person' },
  vehicle:      { color: '#f59e0b',   bg: '#1c1600', icon: '🚗', label: 'Vehicle' },
  account:      { color: '#d946ef',   bg: '#1a0520', icon: '💳', label: 'Account' },
  device:       { color: '#22d3ee',   bg: '#001a1c', icon: '📱', label: 'Device' },
  location:     { color: '#4ade80',   bg: '#001a08', icon: '📍', label: 'Location' },
  phone:        { color: '#fb923c',   bg: '#1c0800', icon: '📞', label: 'Phone' },
  organization: { color: '#818cf8',   bg: '#08001c', icon: '🏢', label: 'Org' },
  evidence:     { color: '#94a3b8',   bg: '#111827', icon: '📷', label: 'Evidence' },
  transaction:  { color: '#f43f5e',   bg: '#1c0008', icon: '💸', label: 'Transaction' },
  case:         { color: '#60a5fa',   bg: '#001020', icon: '📂', label: 'Case' },
  ghost:        { color: '#d946ef',   bg: '#0d0013', icon: '?',  label: 'Ghost' },
};

const EDGE_COLOR: Record<string, string> = {
  transaction:   '#d946ef',
  communication: '#22d3ee',
  owns:          '#f59e0b',
  appears_at:    '#4ade80',
  inferred:      '#d946ef',
  linked_to:     'rgba(255,255,255,0.25)',
  part_of:       'rgba(96,165,250,0.4)',
  calls:         '#fb923c',
  shared_device: '#22d3ee',
  identified_by: '#94a3b8',
  located_at:    '#4ade80',
};

interface InvestigationGraphProps {
  nodes: NodeData[];
  edges: EdgeData[];
  onNodeSelect?: (node: NodeData | null) => void;
  selectedNodeId?: string | null;
  highlightedNodeIds?: string[];
  onExport?: () => void;
  onEdgeSelect?: (id: string) => void;
  selectedEdgeId?: string;
}

export function InvestigationGraph({ nodes, edges, onNodeSelect, selectedNodeId, highlightedNodeIds, onExport, onEdgeSelect, selectedEdgeId }: InvestigationGraphProps) {
  const graphId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 40, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const handleMouseDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as Element).closest('[role="button"]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001)));
  }, []);

  const resetView = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height || !nodes.length) return;
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const left = Math.min(...xs) - 80, top = Math.min(...ys) - 60;
    const width = Math.max(...xs) - left + 80, height = Math.max(...ys) - top + 60;
    const scale = Math.min(1.6, rect.width / width, rect.height / height);
    setZoom(scale);
    setPan({ x: (rect.width - width * scale) / 2 - left * scale, y: (rect.height - height * scale) / 2 - top * scale });
  }, [nodes]);
  useEffect(() => {
    resetView();
    if (!svgRef.current) return;
    const observer = new ResizeObserver(resetView);
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, [resetView]);

  const filteredNodes = nodes.filter(n => {
    if (filterType && n.type !== filterType) return false;
    if (searchTerm && !n.label.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

  const nodeTypes = [...new Set(nodes.map(n => n.type))];

  return (
    <div className="relative w-full h-full bg-sutra-dark border border-white/10 flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-sutra-surface shrink-0 gap-2">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-white whitespace-nowrap">Investigation Graph</h3>
        
        <div className="flex items-center gap-1.5">
          {/* Legend pills */}
          <div className="hidden lg:flex items-center gap-1.5 mr-2">
            {nodeTypes.slice(0, 5).map(type => {
              const cfg = NODE_CONFIG[type] || NODE_CONFIG.person;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? null : type)}
                  className={`px-2 py-0.5 text-[8px] uppercase tracking-widest font-bold border transition-colors ${filterType === type ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-white/40 hover:text-white/70'}`}
                  style={{ borderColor: filterType === type ? cfg.color : undefined, color: filterType === type ? cfg.color : undefined }}
                >
                  {cfg.icon} {type}
                </button>
              );
            })}
          </div>

          {showSearch && (
            <input
              autoFocus
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              className="w-32 bg-sutra-dark border border-white/20 px-2 py-1 text-[10px] text-white placeholder:text-white/30 focus:outline-none focus:border-sutra-red/50"
            />
          )}
          <button aria-label="Search nodes" onClick={() => { setShowSearch(s => !s); setSearchTerm(''); }} className="w-7 h-7 flex items-center justify-center border border-white/10 bg-sutra-dark text-white/40 hover:text-white transition-colors"><Search className="w-3.5 h-3.5" /></button>
          <button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="w-7 h-7 flex items-center justify-center border border-white/10 bg-sutra-dark text-white/40 hover:text-white transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
          <button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="w-7 h-7 flex items-center justify-center border border-white/10 bg-sutra-dark text-white/40 hover:text-white transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button aria-label="Fit graph" onClick={resetView} className="w-7 h-7 flex items-center justify-center border border-white/10 bg-sutra-dark text-white/40 hover:text-white transition-colors"><RotateCcw className="w-3.5 h-3.5" /></button>
          {onExport && (
            <button onClick={onExport} title="Export Analysis (JSON)" className="w-7 h-7 flex items-center justify-center border border-white/10 bg-sutra-dark text-white/40 hover:text-white transition-colors"><Download className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>

      {/* SVG Graph */}
      <div className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing">
        {/* Dot grid background */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <pattern id={graphId + "-dot-grid"} width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.06)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${graphId}-dot-grid)`} />
        </svg>

        <svg
          ref={svgRef}
          className="w-full h-full"
          onPointerDown={handleMouseDown}
          onPointerMove={handleMouseMove}
          onPointerUp={handleMouseUp}
          onPointerCancel={handleMouseUp} style={{touchAction: "none"}}
          onWheel={handleWheel}
        >
          <defs>
            <marker id={graphId + "-arrow"} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,255,255,0.2)" />
            </marker>
            {Object.entries(EDGE_COLOR).map(([type, color]) => (
              <marker key={type} id={`${graphId}-arrow-${type}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill={color} />
              </marker>
            ))}
            <filter id={graphId + "-glow-white"}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id={graphId + "-glow-red"}>
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map(edge => {
              const src = nodes.find(n => n.id === edge.source);
              const tgt = nodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;
              const isTimelineActive = highlightedNodeIds && highlightedNodeIds.length > 0;
              const hidden = !filteredNodeIds.has(src.id) || !filteredNodeIds.has(tgt.id) || (isTimelineActive && (!highlightedNodeIds.includes(src.id) && !highlightedNodeIds.includes(tgt.id)));
              const isHighlightedEdge = isTimelineActive && highlightedNodeIds.includes(src.id) && highlightedNodeIds.includes(tgt.id);
              const isInferred = edge.type === 'inferred';
              const isHovered = hoveredEdge === edge.id || selectedEdgeId === edge.id;
              const edgeColor = isHighlightedEdge ? '#ef4444' : (EDGE_COLOR[edge.type] || 'rgba(255,255,255,0.15)');
              // Midpoint for label
              const mx = (src.x + tgt.x) / 2;
              const my = (src.y + tgt.y) / 2;
              return (
                <g key={edge.id} role="button" tabIndex={hidden ? -1 : 0} aria-label={`${src.label} to ${tgt.label}: ${edge.label ?? edge.type}`} onClick={() => onEdgeSelect?.(edge.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEdgeSelect?.(edge.id); } }} style={{ opacity: hidden ? 0.05 : isHovered ? 1 : 0.55 }} className="transition-opacity">
                  <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="transparent" strokeWidth={16} />
                  <line
                    x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                    stroke={edgeColor}
                    strokeWidth={isHovered ? edge.weight + 1 : edge.weight * 0.8}
                    strokeDasharray={isInferred ? '6 8' : undefined}
                    markerEnd={`url(#${graphId}-arrow-${edge.type})`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredEdge(edge.id)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                  {isHovered && edge.label && (
                    <g>
                      <rect x={mx - 32} y={my - 10} width={64} height={16} fill="#0a0710" rx={2} stroke={edgeColor} strokeWidth={0.5} />
                      <text x={mx} y={my + 2} textAnchor="middle" fill={edgeColor} fontSize={7} fontWeight="bold" letterSpacing={0.5} style={{ textTransform: 'uppercase', pointerEvents: 'none' }}>
                        {edge.label}
                      </text>
                    </g>
                  )}
                  {isInferred && (
                    <text x={mx} y={my - 6} textAnchor="middle" fill={edgeColor} fontSize={7} style={{ pointerEvents: 'none' }}>Inferred / hypothesis</text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const cfg = NODE_CONFIG[node.type] || NODE_CONFIG.person;
              const isSelected = selectedNodeId === node.id;
              const isHidden = !filteredNodeIds.has(node.id) || (highlightedNodeIds && highlightedNodeIds.length > 0 && !highlightedNodeIds.includes(node.id));
              const isHighlighted = highlightedNodeIds?.includes(node.id);
              const r = isSelected || isHighlighted ? 22 : node.type === 'case' ? 20 : 16;
              return (
                <g
                  key={node.id}
                  role="button" tabIndex={isHidden ? -1 : 0} aria-label={`${node.label}, ${node.type}`}
                  onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onNodeSelect?.(isSelected ? null : node); } }}
                  className="node-group cursor-pointer"
                  style={{ opacity: isHidden ? 0.08 : 1 }}
                  onClick={() => onNodeSelect?.(isSelected ? null : node)}
                >
                  {/* Highlight ring for timeline playback */}
                  {isHighlighted && !isSelected && (
                    <motion.circle
                      cx={node.x} cy={node.y} r={r + 8}
                      fill="none" stroke="#ef4444" strokeWidth={2}
                      animate={{ opacity: [0.3, 0.9, 0.3], r: [r + 6, r + 14, r + 6] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  {/* Ghost node pulsing ring */}
                  {node.isGhost && (
                    <motion.circle
                      cx={node.x} cy={node.y} r={r + 8}
                      fill="none" stroke={cfg.color} strokeWidth={1}
                      strokeDasharray="4 4"
                      animate={{ opacity: [0.2, 0.8, 0.2], r: [r + 6, r + 12, r + 6] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <motion.circle
                      cx={node.x} cy={node.y}
                      r={r + 10}
                      fill="none"
                      stroke={cfg.color}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      style={{ originX: node.x, originY: node.y }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={node.x} cy={node.y} r={r}
                    fill={cfg.bg}
                    stroke={isSelected ? cfg.color : node.isGhost ? cfg.color : `${cfg.color}66`}
                    strokeWidth={isSelected ? 2.5 : node.isGhost ? 1.5 : 1.5}
                    strokeDasharray={node.isGhost ? '4 3' : undefined}
                    filter={isSelected ? `url(#${graphId}-glow-white)` : undefined}
                  />

                  {/* Icon */}
                  <text
                    x={node.x} y={node.y - 3}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={node.isGhost ? 14 : 12}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {cfg.icon}
                  </text>

                  {/* Label */}
                  <text
                    x={node.x} y={node.y + r + 11}
                    textAnchor="middle"
                    fill={isSelected ? cfg.color : 'rgba(255,255,255,0.75)'}
                    fontSize={7.5}
                    fontWeight="bold"
                    letterSpacing={0.8}
                    style={{ textTransform: 'uppercase', pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.label}
                  </text>

                  {/* Risk badge */}
                  {node.riskScore >= 8 && !node.isGhost && (
                    <g>
                      <circle cx={node.x + r - 2} cy={node.y - r + 2} r={5} fill="#d946ef" />
                      <text x={node.x + r - 2} y={node.y - r + 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={5.5} fontWeight="bold" style={{ pointerEvents: 'none' }}>!</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom indicator */}
        <div className="absolute bottom-3 left-3 text-[8px] text-white/20 uppercase tracking-widest font-mono">
          {(zoom * 100).toFixed(0)}% · {filteredNodes.length}/{nodes.length} nodes
        </div>

        {/* Node type legend (bottom right) */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          {Object.entries(NODE_CONFIG).slice(0, 6).map(([type, cfg]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full border" style={{ borderColor: cfg.color, background: cfg.bg }} />
              <span className="text-[7px] uppercase tracking-widest" style={{ color: cfg.color }}>{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
