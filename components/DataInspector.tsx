import React from 'react';
import { SimulationStepData } from '../types';
import { Code, Database, ArrowRight, TrendingUp, Activity, FileText, Video, Loader2, Play } from 'lucide-react';

interface DataInspectorProps {
  data: SimulationStepData | null;
  onGenerateVideo?: () => void;
  videoUrl?: string | null;
  isGeneratingVideo?: boolean;
}

const DataInspector: React.FC<DataInspectorProps> = ({ 
  data, 
  onGenerateVideo, 
  videoUrl, 
  isGeneratingVideo 
}) => {
  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/30 rounded-xl border border-slate-800 p-4">
        <Database className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-xs uppercase tracking-widest font-semibold">Data Inspector Idle</span>
      </div>
    );
  }

  const renderContent = () => {
    if (data.visualType === 'ranking' && typeof data.data === 'object' && 'candidates' in data.data) {
        const candidates = (data.data as any).candidates as any[];
        return (
            <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-semibold border-b border-slate-800 pb-2 flex-1 mr-4">
                        <span>Candidate Document</span>
                        <div className="flex gap-8 pr-2">
                            <span>Rank Δ</span>
                            <span className="w-12 text-right">Score</span>
                        </div>
                    </div>
                </div>

                {/* Veo Video Integration for Ranking */}
                <div className="mb-4 bg-slate-900/50 rounded-lg border border-slate-800 p-3 flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-pink-900/30 rounded text-pink-400">
                                <Video className="w-3 h-3" />
                            </div>
                            <span className="text-xs font-bold text-slate-300">Veo Re-ranking Visualization</span>
                        </div>
                        {onGenerateVideo && !videoUrl && !isGeneratingVideo && (
                            <button 
                                onClick={onGenerateVideo}
                                className="flex items-center gap-1.5 px-2 py-1 bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold rounded transition"
                            >
                                <Play className="w-2.5 h-2.5 fill-current" /> Generate Video
                            </button>
                        )}
                    </div>
                    
                    {isGeneratingVideo && (
                        <div className="w-full h-32 bg-black rounded flex flex-col items-center justify-center text-pink-500 gap-2 border border-slate-700">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-[10px] animate-pulse">Generating Animation...</span>
                        </div>
                    )}

                    {videoUrl && (
                        <div className="w-full h-32 bg-black rounded overflow-hidden border border-slate-700 relative group">
                            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>

                {candidates.map((doc, idx) => (
                    <div key={idx} className="relative group bg-slate-900/40 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition-all">
                        <div className="flex justify-between items-start text-xs mb-2">
                            <div className="flex items-start gap-2 overflow-hidden">
                                <div className="mt-0.5 p-1 bg-slate-800 rounded text-slate-400">
                                    <FileText className="w-3 h-3" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-slate-200 font-bold text-[11px] truncate">{doc.id}</span>
                                    <span className="truncate w-full text-[10px] text-slate-500 italic block" title={doc.text}>
                                        "{doc.text}"
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 pl-2 flex-shrink-0">
                                {/* Rank Change */}
                                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                     <span className="text-slate-600 line-through decoration-slate-600/50">#{doc.old_rank}</span>
                                     <ArrowRight className="w-3 h-3 text-slate-700" />
                                     <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/50">
                                        #{doc.new_rank}
                                        <TrendingUp className="w-3 h-3" />
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Score Visualization */}
                        <div className="flex items-center gap-3">
                             <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                 <div 
                                    className={`h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-out ${
                                        doc.score > 0.8 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 
                                        doc.score > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${doc.score * 100}%` }}
                                 />
                             </div>
                             <span className={`text-[10px] font-mono font-bold w-10 text-right ${
                                    doc.score > 0.8 ? 'text-emerald-400' : 
                                    doc.score > 0.5 ? 'text-yellow-400' : 'text-red-400'
                             }`}>
                                 {doc.score.toFixed(2)}
                             </span>
                        </div>
                    </div>
                ))}
                <div className="mt-3 flex items-center gap-2 justify-center text-[10px] text-slate-500 border-t border-slate-800 pt-2">
                    <Activity className="w-3 h-3" />
                    <span>Reranker Model: {(data.data as any).model}</span>
                </div>
            </div>
        );
    }

    // Default JSON/Text View
    const isObject = typeof data.data === 'object';
    return (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-green-400 overflow-x-auto font-mono text-[11px] leading-relaxed shadow-inner">
            {isObject ? (
              <pre>{JSON.stringify(data.data, null, 2)}</pre>
            ) : (
              <div className="whitespace-pre-wrap">{data.data}</div>
            )}
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-slate-700 shadow-inner overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Code className="w-4 h-4 text-blue-400" />
           <span className="text-sm font-bold text-slate-200">{data.title}</span>
        </div>
        <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-800 animate-pulse">
            LIVE DATA
        </span>
      </div>
      
      <div className="p-4 overflow-y-auto flex-1 font-mono text-xs scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
         <div className="mb-3 text-slate-400 border-b border-slate-800 pb-2 italic">
            {data.description}
         </div>
         {renderContent()}
      </div>
    </div>
  );
};

export default DataInspector;