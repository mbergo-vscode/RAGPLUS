import React, { useState, useRef, useEffect } from 'react';
import { NODES, EDGES } from '../constants';
import { NodeType, PipelineNodeDef } from '../types';
import { Eye, EyeOff, FileText, Code } from 'lucide-react';

interface PipelineVisualizerProps {
  activeNode: NodeType | null;
  onNodeClick: (node: NodeType) => void;
  activeFlow: 'ingestion' | 'query' | null;
  animatingEdge: { from: string; to: string } | null;
}

// Category Color Mapping
const CATEGORY_STYLES = {
  ingestion: {
    bg: 'bg-emerald-900/80',
    border: 'border-emerald-500/50',
    activeBorder: 'border-emerald-400',
    icon: 'text-emerald-400',
    glow: 'shadow-emerald-500/40',
    label: 'text-emerald-100'
  },
  storage: {
    bg: 'bg-amber-900/80',
    border: 'border-amber-500/50',
    activeBorder: 'border-amber-400',
    icon: 'text-amber-400',
    glow: 'shadow-amber-500/40',
    label: 'text-amber-100'
  },
  query: {
    bg: 'bg-indigo-900/80',
    border: 'border-indigo-500/50',
    activeBorder: 'border-indigo-400',
    icon: 'text-indigo-400',
    glow: 'shadow-indigo-500/40',
    label: 'text-indigo-100'
  }
};

const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ 
  activeNode, 
  onNodeClick, 
  activeFlow,
  animatingEdge 
}) => {
  const [showPayloads, setShowPayloads] = useState(false);
  const [nodes, setNodes] = useState<PipelineNodeDef[]>(NODES);
  const [dragging, setDragging] = useState<{ id: NodeType; offsetX: number; offsetY: number } | null>(null);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, node: PipelineNodeDef) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickOffsetX = e.clientX - rect.left;
    const clickOffsetY = e.clientY - rect.top;
    setDragging({ id: node.id, offsetX: clickOffsetX, offsetY: clickOffsetY });
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    isDraggingRef.current = true;
    const containerRect = containerRef.current.getBoundingClientRect();
    let newX = e.clientX - containerRect.left - dragging.offsetX - 40;
    let newY = e.clientY - containerRect.top - dragging.offsetY - 40;
    newX = Math.max(-20, Math.min(newX, containerRect.width - 60));
    newY = Math.max(-20, Math.min(newY, containerRect.height - 60));
    setNodes((prev) => prev.map((n) => n.id === dragging.id ? { ...n, x: newX, y: newY } : n));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragging) setDragging(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragging]);

  const handleNodeClick = (id: NodeType) => {
    if (!isDraggingRef.current) {
      onNodeClick(id);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] bg-navy-900 rounded-xl border border-white/10 overflow-hidden shadow-2xl group select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Grid - Lighter/Cleaner */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-navy-900/50 pointer-events-none"></div>

      {/* Inspection Toggle */}
      <button 
        onClick={() => setShowPayloads(!showPayloads)}
        className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-white/10 transition-colors text-xs font-medium cursor-pointer backdrop-blur-sm"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {showPayloads ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {showPayloads ? 'Hide Payloads' : 'Inspect Flows'}
      </button>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
          </marker>
          <marker id="arrowhead-ingestion" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
          </marker>
          <marker id="arrowhead-query" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
          </marker>
          <filter id="glow-ingestion">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feFlood floodColor="#10b981" result="glowColor" />
            <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow_colored" />
            <feMerge>
              <feMergeNode in="softGlow_colored"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
           <filter id="glow-query">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feFlood floodColor="#6366f1" result="glowColor" />
            <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow_colored" />
            <feMerge>
              <feMergeNode in="softGlow_colored"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {EDGES.map((edge, idx) => {
          const fromNode = nodes.find(n => n.id === edge.from)!;
          const toNode = nodes.find(n => n.id === edge.to)!;
          const isActiveFlow = activeFlow && (edge.activeInFlow === activeFlow || edge.activeInFlow === 'both');
          const isAnimating = animatingEdge?.from === edge.from && animatingEdge?.to === edge.to;
          
          let strokeColor = "#334155"; // Default Slate-700
          let markerUrl = "url(#arrowhead)";
          
          if (isActiveFlow) {
              if (activeFlow === 'ingestion') {
                  strokeColor = "#10b981"; // Emerald-500
                  markerUrl = "url(#arrowhead-ingestion)";
              } else {
                  strokeColor = "#6366f1"; // Indigo-500
                  markerUrl = "url(#arrowhead-query)";
              }
          }

          const midX = (fromNode.x + 40 + toNode.x + 40) / 2;
          const midY = (fromNode.y + 40 + toNode.y + 40) / 2;

          return (
            <g key={`${edge.from}-${edge.to}-${idx}`}>
              <line
                x1={fromNode.x + 40} y1={fromNode.y + 40}
                x2={toNode.x + 40} y2={toNode.y + 40}
                stroke={strokeColor}
                strokeWidth={isActiveFlow ? 3 : 2}
                markerEnd={markerUrl}
                className="transition-colors duration-500"
                strokeDasharray={isActiveFlow ? "6,4" : "0"}
                opacity={isActiveFlow ? 1 : 0.4}
              />
              {isActiveFlow && (
                 <line
                    x1={fromNode.x + 40} y1={fromNode.y + 40}
                    x2={toNode.x + 40} y2={toNode.y + 40}
                    stroke={strokeColor}
                    strokeWidth="3"
                    markerEnd={markerUrl}
                    className="animate-flow-dashed opacity-70"
                 />
              )}

              {/* Payload Inspection Label */}
              {showPayloads && (
                  <foreignObject x={midX - 60} y={midY - 15} width="120" height="40" className="overflow-visible pointer-events-none">
                      <div className={`text-[9px] text-center px-2 py-1 rounded shadow-lg backdrop-blur-md transform transition-all duration-300 font-mono font-bold
                          ${isActiveFlow 
                              ? (activeFlow === 'ingestion' ? 'bg-emerald-900/90 border border-emerald-500 text-emerald-100 scale-110' : 'bg-indigo-900/90 border border-indigo-500 text-indigo-100 scale-110') 
                              : 'bg-slate-800/90 border border-slate-600 text-slate-400'}
                      `}>
                          {edge.payloadInfo || 'Data Packet'}
                      </div>
                  </foreignObject>
              )}
              
              {/* Animated Packet */}
              {isAnimating && (
                <g filter={activeFlow === 'ingestion' ? "url(#glow-ingestion)" : "url(#glow-query)"}>
                   <circle r="14" fill={activeFlow === 'ingestion' ? '#10b981' : '#6366f1'} className="opacity-90">
                     <animateMotion 
                       dur="0.8s" 
                       repeatCount="1"
                       path={`M${fromNode.x + 40},${fromNode.y + 40} L${toNode.x + 40},${toNode.y + 40}`}
                     />
                   </circle>
                   <foreignObject width="20" height="20" x="-10" y="-10">
                        <div className="w-full h-full flex items-center justify-center">
                           <animateMotion 
                             dur="0.8s" 
                             repeatCount="1"
                             path={`M${fromNode.x + 40},${fromNode.y + 40} L${toNode.x + 40},${toNode.y + 40}`}
                           />
                           {activeFlow === 'ingestion' ? 
                             <FileText className="w-3.5 h-3.5 text-white" /> : 
                             <Code className="w-3.5 h-3.5 text-white" />
                           }
                        </div>
                   </foreignObject>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes with Categorical Coloring */}
      {nodes.map((node) => {
        const Icon = node.icon;
        const isActive = activeNode === node.id;
        const style = CATEGORY_STYLES[node.category];
        const isBeingDragged = dragging?.id === node.id;

        // Base Classes
        let wrapperClasses = `absolute w-20 h-20 -ml-10 -mt-10 flex flex-col items-center justify-center rounded-2xl cursor-grab active:cursor-grabbing transition-all duration-300 z-10 backdrop-blur-md border-2 shadow-lg `;
        
        if (isActive) {
            // Highlighted State (Selected)
            wrapperClasses += `${style.bg} ${style.activeBorder} ${style.glow} scale-110 ring-4 ring-white/10`;
        } else {
            // Normal State
            wrapperClasses += `bg-slate-800/60 border-white/5 hover:border-white/20 hover:bg-slate-800/80 hover:scale-105`;
        }

        if (isBeingDragged) {
             wrapperClasses += ' z-50 scale-110 shadow-2xl';
        }

        return (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(e, node)}
            onClick={() => handleNodeClick(node.id)}
            className={wrapperClasses}
            style={{ 
                left: node.x + 40, 
                top: node.y + 40,
                transition: isBeingDragged ? 'none' : 'transform 0.3s, box-shadow 0.3s' 
            }}
          >
            {/* Inner Glow/Gradient */}
            <div className={`absolute inset-0 rounded-2xl opacity-20 bg-gradient-to-br from-white/20 to-transparent pointer-events-none`}></div>
            
            <Icon className={`w-8 h-8 mb-1.5 relative z-10 ${isActive ? 'text-white' : style.icon}`} />
            <span className={`text-[10px] font-bold text-center leading-tight px-1 relative z-10 pointer-events-none select-none ${isActive ? 'text-white' : 'text-slate-300'}`}>
              {node.label}
            </span>
          </div>
        );
      })}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-medium bg-slate-900/90 backdrop-blur p-2.5 rounded-lg border border-white/10 pointer-events-none z-0 shadow-lg">
         <div className="flex items-center gap-2 text-emerald-300">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Ingestion
         </div>
         <div className="flex items-center gap-2 text-indigo-300">
            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div> Query
         </div>
         <div className="flex items-center gap-2 text-amber-300">
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Storage
         </div>
      </div>
    </div>
  );
};

export default PipelineVisualizer;