import React from 'react';
import { NodeType, NodeDetail, PipelineNodeDef } from '../types';
import { NODE_DETAILS, NODES } from '../constants';
import { X, Code, Layers } from 'lucide-react';

interface DetailPanelProps {
  nodeId: NodeType | null;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ nodeId, onClose }) => {
  if (!nodeId) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 p-8 text-center">
        <div>
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
             <Layers className="w-10 h-10 opacity-50" />
          </div>
          <p className="text-lg font-medium text-slate-300">Select a component</p>
          <p className="text-sm mt-2 text-slate-500">Click on any node in the diagram to view technical details</p>
        </div>
      </div>
    );
  }

  const details: NodeDetail = NODE_DETAILS[nodeId];
  const nodeDef = NODES.find(n => n.id === nodeId);
  
  // Dynamic header color based on category
  let accentColor = "text-blue-400";
  let bgAccent = "bg-blue-500";
  
  if (nodeDef?.category === 'ingestion') {
      accentColor = "text-emerald-400";
      bgAccent = "bg-emerald-500";
  } else if (nodeDef?.category === 'storage') {
      accentColor = "text-amber-400";
      bgAccent = "bg-amber-500";
  } else if (nodeDef?.category === 'query') {
      accentColor = "text-indigo-400";
      bgAccent = "bg-indigo-500";
  }

  return (
    <div className="h-full overflow-y-auto p-6 relative">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mb-8">
        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white mb-2 ${bgAccent}`}>
            {nodeDef?.category} Layer
        </div>
        <h2 className={`text-3xl font-bold ${accentColor} mb-2 tracking-tight`}>{details.title}</h2>
        <p className="text-sm text-slate-400 italic border-b border-white/10 pb-6 leading-relaxed">{details.subtitle}</p>
      </div>

      <div className="space-y-6">
        <div className="prose prose-invert prose-sm max-w-none">
           {details.content.split('\n').map((line, i) => (
             <p key={i} className="mb-3 text-slate-300 leading-7">{line}</p>
           ))}
        </div>

        {/* Algorithm Section */}
        <div className="bg-slate-800/40 p-5 rounded-xl border border-white/5 shadow-inner">
           <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${accentColor}`}>
             <Code className="w-4 h-4" /> Key Algorithms
           </h3>
           <ul className="space-y-2.5">
             {details.algorithms.map((algo, idx) => (
               <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                 <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${bgAccent}`}></span>
                 {algo}
               </li>
             ))}
           </ul>
        </div>

        {/* Tech Stack Section */}
        <div className="bg-slate-800/40 p-5 rounded-xl border border-white/5 shadow-inner">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
             <Layers className="w-4 h-4" /> Tech Stack Options
           </h3>
           <div className="flex flex-wrap gap-2">
             {details.techStack.map((tech, idx) => (
               <span key={idx} className="px-3 py-1.5 bg-slate-700/50 border border-white/5 text-slate-200 text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors">
                 {tech}
               </span>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPanel;