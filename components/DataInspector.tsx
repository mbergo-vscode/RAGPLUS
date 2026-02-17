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
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-800/30 rounded-xl border border-white/5 p-4">
        <Database className="w-10 h-10 mb-3 opacity-30" />
        <span className="text-xs uppercase tracking-widest font-bold opacity-60">Data Inspector Idle</span>
      </div>
    );
  }

  const renderContent = () => {
    if (data.visualType === 'ranking' && typeof data.data === 'object' && 'candidates' in data.data) {
        const candidates = (data.data as any).candidates as any[];
        return (
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold border-b border-white/10 pb-2 flex-1 mr-4">
                        <span>Candidate Document</span>
                        <div className="flex gap-8 pr-2">
                            <span>Rank Δ</span>
                            <span className="w-12 text-right">Score</span>
                        </div>
                    </div>
                </div>

                {/* Veo Video Integration for Ranking */}
                <div className="mb-4 bg-navy-900 rounded-lg border border-white/10 p-3 flex flex-col items-center shadow-md">
                    <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-pink-500/10 rounded text-pink-400">
                                <Video className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-slate-200">Veo Re-ranking Visualization</span>
                        </div>
                        {onGenerateVideo && !videoUrl && !isGeneratingVideo && (
                            <button 
                                onClick={onGenerateVideo}
                                className="flex items-center gap-1.5 px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold rounded-md transition shadow-lg shadow-pink-900/20"
                            >
                                <Play className="w-2.5 h-2.5 fill-current" /> Generate Video
                            </button>
                        )}
                    </div>
                    
                    {isGeneratingVideo && (
                        <div className="w-full h-32 bg-black/50 rounded flex flex-col items-center justify-center text-pink-400 gap-2 border border-white/5">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-[10px] animate-pulse font-mono">Generating Animation...</span>
                        </div>
                    )}

                    {videoUrl && (
                        <div className="w-full h-32 bg-black rounded overflow-hidden border border-slate-700 relative group">
                            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>

                {candidates.map((doc, idx) => (
                    <div key={idx} className="relative group bg-slate-800/60 p-3 rounded-lg border border-white/5 hover:border-indigo-500/30 hover:bg-slate-800 transition-all shadow-sm">
                        <div className="flex justify-between items-start text-xs mb-3">
                            <div className="flex items-start gap-3 overflow-hidden">
                                <div className="mt-0.5 p-1.5 bg-slate-700/50 rounded text-indigo-300">
                                    <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-white font-bold text-[11px] truncate mb-0.5">{doc.id}</span>
                                    <span className="truncate w-full text-[11px] text-slate-400 italic block leading-relaxed" title={doc.text}>
                                        "{doc.text}"
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 pl-2 flex-shrink-0">
                                {/* Rank Change */}
                                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                     <span className="text-slate-500 line-through">#{doc.old_rank}</span>
                                     <ArrowRight className="w-3 h-3 text-slate-600" />
                                     <div className="flex items-center gap-1 text-emerald-300 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        #{doc.new_rank}
                                        <TrendingUp className="w-3 h-3" />
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Score Visualization */}
                        <div className="flex items-center gap-3">
                             <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                 <div 
                                    className={`h-full rounded-full shadow-lg transition-all duration-1000 ease-out ${
                                        doc.score > 0.8 ? 'bg-emerald-500' : 
                                        doc.score > 0.5 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${doc.score * 100}%` }}
                                 />
                             </div>
                             <span className={`text-[10px] font-mono font-bold w-10 text-right ${
                                    doc.score > 0.8 ? 'text-emerald-400' : 
                                    doc.score > 0.5 ? 'text-amber-400' : 'text-red-400'
                             }`}>
                                 {doc.score.toFixed(2)}
                             </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Default JSON/Text View - Styled like a code editor
    const isObject = typeof data.data === 'object';
    return (
        <div className="bg-[#0f141f] p-4 rounded-lg border border-white/10 text-emerald-300 overflow-x-auto font-mono text-[12px] leading-relaxed shadow-inner">
            {isObject ? (
              <pre>{JSON.stringify(data.data, null, 2)}</pre>
            ) : (
              <div className="whitespace-pre-wrap">{data.data}</div>
            )}
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl overflow-hidden">
      <div className="bg-slate-800/50 px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
           <Code className="w-4 h-4 text-indigo-400" />
           <span className="text-sm font-bold text-slate-200">{data.title}</span>
        </div>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 animate-pulse font-bold tracking-wider">
            LIVE
        </span>
      </div>
      
      <div className="p-5 overflow-y-auto flex-1 font-mono text-xs scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
         <div className="mb-4 text-slate-400 border-b border-white/5 pb-3 italic leading-relaxed">
            {data.description}
         </div>
         {renderContent()}
      </div>
    </div>
  );
};

export default DataInspector;