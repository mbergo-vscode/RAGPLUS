import React from 'react';
import { NodeType, NodeDetail } from '../types';
import { NODE_DETAILS } from '../constants';
import { X, Code, Layers } from 'lucide-react';

interface DetailPanelProps {
  nodeId: NodeType | null;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ nodeId, onClose }) => {
  if (!nodeId) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 p-8 text-center border-l border-slate-800 bg-slate-900/50">
        <div>
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Select a component to view Deep Dive details</p>
          <p className="text-sm mt-2">Click on any node in the diagram</p>
        </div>
      </div>
    );
  }

  const details: NodeDetail = NODE_DETAILS[nodeId];

  return (
    <div className="h-full overflow-y-auto bg-slate-900 border-l border-slate-800 p-6 shadow-xl relative">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-blue-400 mb-1">{details.title}</h2>
        <p className="text-sm text-slate-400 italic border-b border-slate-800 pb-4">{details.subtitle}</p>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-4">
        <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
           {details.content.split('\n').map((line, i) => (
             <p key={i} className="mb-2">{line}</p>
           ))}
        </div>

        {/* Algorithm Section */}
        <div className="mt-8 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
           <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
             <Code className="w-4 h-4" /> Key Algorithms & Concepts
           </h3>
           <ul className="space-y-2">
             {details.algorithms.map((algo, idx) => (
               <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                 <span className="mt-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0"></span>
                 {algo}
               </li>
             ))}
           </ul>
        </div>

        {/* Tech Stack Section */}
        <div className="mt-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
           <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
             <Layers className="w-4 h-4" /> Tech Stack Options
           </h3>
           <div className="flex flex-wrap gap-2">
             {details.techStack.map((tech, idx) => (
               <span key={idx} className="px-2 py-1 bg-indigo-900/30 border border-indigo-500/30 text-indigo-200 text-xs rounded">
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