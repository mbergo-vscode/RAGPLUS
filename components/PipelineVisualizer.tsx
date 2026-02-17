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

const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ 
  activeNode, 
  onNodeClick, 
  activeFlow,
  animatingEdge 
}) => {
  const [showPayloads, setShowPayloads] = useState(false);
  
  // Local state for nodes to handle position updates during drag
  const [nodes, setNodes] = useState<PipelineNodeDef[]>(NODES);
  
  // Dragging state: tracks which node is being dragged and the offset from the cursor to the node's origin
  const [dragging, setDragging] = useState<{ id: NodeType; offsetX: number; offsetY: number } | null>(null);
  
  // Ref to track if we are actually dragging vs just clicking
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle starting the drag
  const handleMouseDown = (e: React.MouseEvent, node: PipelineNodeDef) => {
    e.stopPropagation();
    // Calculate where inside the node the user clicked so it doesn't snap to top-left
    const offsetX = e.nativeEvent.offsetX; // Coordinate within the node div
    const offsetY = e.nativeEvent.offsetY; 
    
    // We actually need the offset relative to the node, but e.nativeEvent.offsetX helps if target is the node.
    // Let's rely on client math to be safer against child element clicks (like icons).
    // Get the bounding box of the node element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickOffsetX = e.clientX - rect.left;
    const clickOffsetY = e.clientY - rect.top;

    setDragging({ id: node.id, offsetX: clickOffsetX, offsetY: clickOffsetY });
    isDraggingRef.current = false;
  };

  // Handle moving the mouse (attached to container)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    isDraggingRef.current = true;

    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate new X/Y relative to container, subtracting the initial click offset
    // The -40 adjustment in original render logic (left: node.x + 40) was to center? 
    // Actually the original CSS was `left: node.x + 40`. 
    // To keep logic simple, let's map mouse pos to raw node.x/y.
    
    // Original render: left = node.x + 40.
    // So node.x = (e.clientX - containerRect.left) - 40 - dragging.offsetX?
    // Let's adjust: The node is rendered at `left: node.x + 40`.
    // We want to update `node.x`.
    
    let newX = e.clientX - containerRect.left - dragging.offsetX - 40;
    let newY = e.clientY - containerRect.top - dragging.offsetY - 40;

    // Simple bounds checking to keep nodes roughly inside
    newX = Math.max(-20, Math.min(newX, containerRect.width - 60));
    newY = Math.max(-20, Math.min(newY, containerRect.height - 60));

    setNodes((prev) => 
      prev.map((n) => n.id === dragging.id ? { ...n, x: newX, y: newY } : n)
    );
  };

  // Handle releasing the mouse
  const handleMouseUp = () => {
    setDragging(null);
    // Note: isDraggingRef stays true until next mouse down resets it, 
    // enabling the onClick handler to know if it was a drag.
  };

  // Global mouse up to catch drags that go outside container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragging) {
        setDragging(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragging]);

  const handleNodeClick = (id: NodeType) => {
    // Only trigger click if we weren't dragging
    if (!isDraggingRef.current) {
      onNodeClick(id);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl group select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Inspection Toggle */}
      <button 
        onClick={() => setShowPayloads(!showPayloads)}
        className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors text-xs font-medium cursor-pointer"
        onMouseDown={(e) => e.stopPropagation()} // Prevent drag logic on button
      >
        {showPayloads ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {showPayloads ? 'Hide Flow Data' : 'Inspect Flows'}
      </button>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
          <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {EDGES.map((edge, idx) => {
          // Look up current position in state, not constant
          const fromNode = nodes.find(n => n.id === edge.from)!;
          const toNode = nodes.find(n => n.id === edge.to)!;
          
          const isActiveFlow = activeFlow && (edge.activeInFlow === activeFlow || edge.activeInFlow === 'both');
          const isAnimating = animatingEdge?.from === edge.from && animatingEdge?.to === edge.to;
          
          // Calculate midpoint for payload label
          // Add 40 offset because node coordinates are top-left, we want center (approx)
          const midX = (fromNode.x + 40 + toNode.x + 40) / 2;
          const midY = (fromNode.y + 40 + toNode.y + 40) / 2;

          return (
            <g key={`${edge.from}-${edge.to}-${idx}`}>
              {/* Base Line */}
              <line
                x1={fromNode.x + 40} 
                y1={fromNode.y + 40}
                x2={toNode.x + 40}
                y2={toNode.y + 40}
                stroke={isActiveFlow ? "#3b82f6" : "#334155"}
                strokeWidth={isActiveFlow ? 3 : 2}
                markerEnd={isActiveFlow ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                className="transition-colors duration-500"
                strokeDasharray={isActiveFlow ? "5,5" : "0"}
              />
              {isActiveFlow && (
                 <line
                    x1={fromNode.x + 40} 
                    y1={fromNode.y + 40}
                    x2={toNode.x + 40}
                    y2={toNode.y + 40}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    markerEnd="url(#arrowhead-active)"
                    className="animate-flow-dashed opacity-50"
                 />
              )}

              {/* Payload Inspection Label */}
              {showPayloads && (
                  <foreignObject x={midX - 60} y={midY - 15} width="120" height="40" className="overflow-visible pointer-events-none">
                      <div className={`text-[9px] text-center px-1.5 py-0.5 rounded border shadow-sm backdrop-blur-md transform transition-all duration-300
                          ${isActiveFlow ? 'bg-blue-900/80 border-blue-500 text-white scale-110' : 'bg-slate-900/80 border-slate-700 text-slate-400'}
                      `}>
                          {edge.payloadInfo || 'Data Packet'}
                      </div>
                  </foreignObject>
              )}
              
              {/* Animated Packet */}
              {isAnimating && (
                <g>
                   <circle r="12" fill={activeFlow === 'ingestion' ? '#10b981' : '#8b5cf6'} filter="url(#glow)">
                     <animateMotion 
                       dur="0.8s" 
                       repeatCount="1"
                       path={`M${fromNode.x + 40},${fromNode.y + 40} L${toNode.x + 40},${toNode.y + 40}`}
                     />
                   </circle>
                   {/* Icon inside packet */}
                   <foreignObject width="16" height="16" x="-8" y="-8">
                        <div className="w-full h-full flex items-center justify-center">
                           <animateMotion 
                             dur="0.8s" 
                             repeatCount="1"
                             path={`M${fromNode.x + 40},${fromNode.y + 40} L${toNode.x + 40},${toNode.y + 40}`}
                           />
                           {activeFlow === 'ingestion' ? 
                             <FileText className="w-3 h-3 text-white" /> : 
                             <Code className="w-3 h-3 text-white" />
                           }
                        </div>
                   </foreignObject>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => {
        const Icon = node.icon;
        const isActive = activeNode === node.id;
        const isFlowActive = activeFlow && EDGES.some(e => 
          (e.from === node.id || e.to === node.id) && 
          (e.activeInFlow === activeFlow || e.activeInFlow === 'both')
        );
        const isBeingDragged = dragging?.id === node.id;

        return (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(e, node)}
            onClick={() => handleNodeClick(node.id)}
            className={`absolute w-20 h-20 -ml-10 -mt-10 flex flex-col items-center justify-center rounded-xl cursor-grab active:cursor-grabbing transition-shadow duration-300 z-10
              ${isActive ? 'bg-blue-600 shadow-lg shadow-blue-500/50 border-2 border-white' : 
                isFlowActive ? 'bg-slate-800 border-2 border-blue-500/50' : 'bg-slate-800 border border-slate-600 hover:border-slate-400'}
              ${isBeingDragged ? 'z-50 scale-105 shadow-xl shadow-black/50' : 'hover:scale-110'}
            `}
            style={{ 
                left: node.x + 40, 
                top: node.y + 40,
                transition: isBeingDragged ? 'none' : 'transform 0.3s, background-color 0.3s' 
            }}
          >
            <Icon className={`w-8 h-8 mb-1 pointer-events-none ${isActive ? 'text-white' : 'text-blue-400'}`} />
            <span className="text-[10px] font-bold text-center leading-tight px-1 text-slate-200 pointer-events-none select-none">
              {node.label}
            </span>
          </div>
        );
      })}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 text-xs text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-700 pointer-events-none z-0">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div> Selected
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-500 rounded-full"></div> Active Flow
         </div>
         <div className="flex items-center gap-2 text-slate-500 italic">
            <span>(Drag nodes to reorganize)</span>
         </div>
      </div>
    </div>
  );
};

export default PipelineVisualizer;