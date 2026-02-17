import React, { useState, useRef } from 'react';
import PipelineVisualizer from './components/PipelineVisualizer';
import DetailPanel from './components/DetailPanel';
import DataInspector from './components/DataInspector';
import { generateRAGResponse, generateVeoVideo } from './services/geminiService';
import { NodeType, SimulationStepDef } from './types';
import { Play, Database, RefreshCw, Terminal, ChevronRight, RotateCcw, Users, Image as ImageIcon, Video, Upload, Loader2 } from 'lucide-react';

// --- Dynamic Simulation Definitions ---

const getIngestionSteps = (tenantId: string): SimulationStepDef[] => [
  { 
    stepId: 0, node: 'source', log: `Source: Detecting changes for Tenant ${tenantId}`,
    inspectorData: { 
      title: 'Modular RAG Ingestion', 
      description: `Why: Modular design allows independent scaling. Apache Tika extracts text from PDFs. Metadata tagging ensures Multi-tenancy for ${tenantId}.`, 
      data: { event: "s3:ObjectCreated", file: "policy_v2.pdf", tenant_id: tenantId, technique: "Modular RAG + Tika" } 
    }
  },
  { 
    stepId: 1, node: 'kafka', edge: {from: 'source', to: 'kafka'}, log: 'Kafka: Buffering event stream',
    inspectorData: { 
      title: 'Backpressure Handling', 
      description: 'Why: Decouples the fast ingestion source from the slower embedding model.', 
      data: { topic: "raw-docs", partition_key: `doc_id_${tenantId}_551`, offset: 1042 } 
    }
  },
  { 
    stepId: 2, node: 'flink', edge: {from: 'kafka', to: 'flink'}, log: 'Flink: Cleaning & Chunking',
    inspectorData: { 
      title: 'Text Chunking', 
      description: 'Why: LLMs have fixed context windows. We need 512-token overlapping chunks for optimal retrieval.', 
      data: { method: "RecursiveCharacterSplitter", chunk_size: 512, overlap: 50, chunks_generated: 15 } 
    }
  },
  { 
    stepId: 3, node: 'embedding', edge: {from: 'flink', to: 'embedding'}, log: 'Embedding: Generating Dense Vectors',
    inspectorData: { 
      title: 'Dense Embeddings (E5/Gecko)', 
      description: 'Why: "Embeddings encode meaning into geometry." We use dense vectors for semantic similarity.', 
      data: { model: "text-embedding-004", dimensions: 768, type: "Dense (Transformer-based)" } 
    }
  },
  { 
    stepId: 4, node: 'vector_db', edge: {from: 'embedding', to: 'vector_db'}, log: `Vector DB: Indexing (HNSW) for ${tenantId}`,
    inspectorData: { 
      title: 'HNSW Indexing', 
      description: 'Why: HNSW is the "Default Winner" for latency/recall in RAM. We apply Tenant Filters here.', 
      data: { index_type: "HNSW", metric: "cosine", filter: { tenant_id: tenantId }, shards: 3 } 
    }
  }
];

const getQuerySteps = (tenantId: string): SimulationStepDef[] => [
  {
    stepId: 0, node: 'user', log: `User (${tenantId}): Submitting vague query`,
    inspectorData: { 
      title: 'User Input', 
      description: 'Raw input via API Gateway. Often ambiguous or lacking context.', 
      data: { query: "vacation policy?", user_id: "u_99", tenant_id: tenantId } 
    }
  },
  {
    stepId: 1, node: 'redis', edge: {from: 'user', to: 'redis'}, log: 'Redis: Checking Cache & History',
    inspectorData: { 
      title: 'Conversation Memory', 
      description: 'Why: To support multi-turn reasoning. Also checks Semantic Cache to save LLM costs.', 
      data: { cache_hit: false, history_fetched_turns: 3, key: `chat:${tenantId}:u_99` } 
    }
  },
  {
    stepId: 2, node: 'retriever', edge: {from: 'redis', to: 'retriever'}, log: 'Retriever: Generating HyDE Document',
    inspectorData: { 
      title: 'HyDE (Hypothetical Document Embeddings)', 
      description: 'Why: "Improves retrieval when user queries are vague." We hallucinate an ideal answer and embed THAT.', 
      data: { method: "HyDE", hypothetical_doc: `The vacation policy for Tenant ${tenantId} typically allows 20 days...`, technique: "Query Expansion" } 
    }
  },
  {
    stepId: 3, node: 'embedding', edge: {from: 'retriever', to: 'embedding'}, log: 'Embedding: Vectorizing HyDE doc',
    inspectorData: { 
      title: 'Query Embedding', 
      description: 'Embedding the hypothetical answer to find semantically similar REAL documents.', 
      data: { target: "Hypothetical Document", vector_preview: [0.12, -0.55, 0.91] } 
    }
  },
  {
    stepId: 4, node: 'vector_db', edge: {from: 'embedding', to: 'vector_db'}, log: `Vector DB: Hybrid Search (${tenantId})`,
    inspectorData: { 
      title: 'Hybrid Search (HNSW + BM25)', 
      description: 'Why: "HybridRAG combines semantic similarity with keyword fidelity." Retrieving top 50 candidates.', 
      data: { dense_results: 40, sparse_results: 10, total_candidates: 50, latency_ms: 15, filter: { tenant_id: tenantId } } 
    }
  },
  {
    stepId: 5, node: 'reranker', edge: {from: 'vector_db', to: 'reranker'}, log: 'Reranker: Cross-Encoder Refinement',
    inspectorData: { 
      title: 'Cross-Encoder Re-ranking', 
      description: 'Why: "The Secret Sauce." Highlighting score changes. Note how the "correct" document moves to the top.', 
      visualType: 'ranking',
      data: { 
        model: "mixedbread-ai/mxbai-rerank-large-v1",
        candidates: [
          { id: "doc_88", text: `Vacation Policy (Tenant ${tenantId})`, old_rank: 14, new_rank: 1, score: 0.98 },
          { id: "doc_12", text: "Paid Time Off Guidelines (General)", old_rank: 3, new_rank: 2, score: 0.89 },
          { id: "doc_05", text: "Sick Leave Policy", old_rank: 1, new_rank: 3, score: 0.76 },
          { id: "doc_99", text: "Remote Work (Reference)", old_rank: 2, new_rank: 4, score: 0.45 },
          { id: "doc_34", text: "Office Holiday Party", old_rank: 4, new_rank: 5, score: 0.12 }
        ]
      } 
    }
  },
  {
    stepId: 6, node: 'llm', edge: {from: 'reranker', to: 'llm'}, log: 'LLM: Inference with FlashAttention',
    inspectorData: { 
      title: 'LLM Generation (CoT)', 
      description: 'Why: Using Chain-of-Thought (CoT) to "force intermediate reasoning steps." FlashAttention speeds up the IO.', 
      data: { technique: "CoT + RAG", system_prompt: "You are a helpful HR assistant...", context_chunks: 5 } 
    }
  },
  {
    stepId: 7, node: 'redis', edge: {from: 'llm', to: 'redis'}, log: 'Redis: Write-back History',
    inspectorData: { 
      title: 'State Update', 
      description: 'Why: "KV Cache" concepts apply here for maintaining session context efficiently.', 
      data: { action: "Append Turn", key: `chat:history:${tenantId}:u_99`, ttl: 3600 } 
    }
  },
  {
    stepId: 8, node: 'user', edge: {from: 'llm', to: 'user'}, log: 'User: Streaming Response',
    inspectorData: { 
      title: 'Final Output', 
      description: 'Delivered via SSE (Server-Sent Events).', 
      data: "Based on the policy, you have **20 days** of vacation." 
    }
  }
];

const TENANTS = ['T-800', 'Cyberdyne', 'Massive Dynamic', 'Acme Corp'];

const App: React.FC = () => {
  const [activeNode, setActiveNode] = useState<NodeType | null>(null);
  const [activeFlow, setActiveFlow] = useState<'ingestion' | 'query' | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [userQuery, setUserQuery] = useState('What is the vacation policy?');
  const [selectedTenant, setSelectedTenant] = useState('T-800');
  
  // Simulation State
  const [simulationMode, setSimulationMode] = useState<'ingestion' | 'query' | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [animatingEdge, setAnimatingEdge] = useState<{from: string, to: string} | null>(null);
  const [inspectorData, setInspectorData] = useState<any>(null);

  // Veo Video State (Reranker Node Visualization)
  const [rerankVideoUrl, setRerankVideoUrl] = useState<string | null>(null);
  const [isGeneratingRerankVideo, setIsGeneratingRerankVideo] = useState(false);

  const log = (msg: string) => {
    setConsoleLogs(prev => [`> ${msg}`, ...prev.slice(0, 8)]); 
  };

  const startSimulation = (mode: 'ingestion' | 'query') => {
    setSimulationMode(mode);
    setCurrentStepIndex(-1);
    setActiveFlow(mode);
    setConsoleLogs([]);
    log(`Starting ${mode.toUpperCase()} pipeline simulation for ${selectedTenant}...`);
    setInspectorData(null);
    setRerankVideoUrl(null); // Reset reranker video on new flow
    advanceStep(mode, 0); 
  };

  const advanceStep = (mode: 'ingestion' | 'query', stepIdx: number) => {
    const steps = mode === 'ingestion' ? getIngestionSteps(selectedTenant) : getQuerySteps(selectedTenant);
    
    if (stepIdx >= steps.length) {
      log('Simulation Complete.');
      setSimulationMode(null);
      setAnimatingEdge(null);
      return;
    }

    const step = steps[stepIdx];
    setCurrentStepIndex(stepIdx);
    
    // Update UI
    setActiveNode(step.node);
    if (step.edge) {
      setAnimatingEdge({ from: step.edge.from, to: step.edge.to });
    } else {
      setAnimatingEdge(null);
    }
    
    log(step.log);
    setInspectorData(step.inspectorData);

    if (mode === 'query' && step.node === 'llm') {
      callGemini();
    }
  };

  const callGemini = async () => {
    const context = "Company Vacation Policy: Employees are entitled to 20 days of paid annual leave. Sick leave is 10 days per year.";
    const response = await generateRAGResponse(userQuery, context);
    log(`[Real Gemini Response]: ${response}`);
  };

  const handleNextStep = () => {
    if (!simulationMode) return;
    advanceStep(simulationMode, currentStepIndex + 1);
  };

  const resetSimulation = () => {
    setSimulationMode(null);
    setActiveFlow(null);
    setActiveNode(null);
    setAnimatingEdge(null);
    setCurrentStepIndex(-1);
    setInspectorData(null);
    setRerankVideoUrl(null);
    log('Reset.');
  };

  // Dedicated handler for the Reranker node video
  const handleGenerateRerankVideo = async () => {
      // Access global aistudio safely
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.hasSelectedApiKey) {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (!hasKey) {
              await aistudio.openSelectKey();
          }
      }

      setIsGeneratingRerankVideo(true);
      setRerankVideoUrl(null);
      log('Generating Reranker visualization video with Veo...');
      
      const prompt = "A clean, high-tech animated bar chart showing document scores re-ordering. Bars start in random order, then smoothly slide up and down to sort themselves by length (score). Green color scheme, dark background, data visualization style.";

      try {
          const videoUrl = await generateVeoVideo(prompt, undefined, '16:9'); // No image needed, prompt-based
          if (videoUrl) {
              setRerankVideoUrl(videoUrl);
              log('Rerank visualization generated.');
          } else {
              log('Failed to generate rerank video.');
          }
      } catch(e) {
          log('Error generating rerank video. Check API Key permissions.');
      } finally {
          setIsGeneratingRerankVideo(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Enterprise RAG Pipeline Explorer</h1>
            <p className="text-xs text-slate-400">Multi-tenant | Kafka Streaming | Flink | Redis | Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-semibold uppercase">Active Tenant:</span>
                <select 
                  value={selectedTenant} 
                  onChange={(e) => {
                      if (!simulationMode) setSelectedTenant(e.target.value);
                  }}
                  disabled={simulationMode !== null}
                  className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer disabled:opacity-50"
                >
                    {TENANTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <a href="https://github.com/google-gemini" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition">
              Powered by Gemini API
            </a>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-80px)]">
        
        {/* Left: Visualization & Controls */}
        <div className="lg:col-span-8 p-6 flex flex-col gap-6 overflow-y-auto">
          
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
            
            {/* Input Area */}
            <div className="flex-1 w-full md:w-auto">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">User Query Simulation</label>
              <input 
                type="text" 
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                disabled={simulationMode !== null}
                className="bg-slate-950 border border-slate-700 text-sm rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                placeholder="Ask a question..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 items-end">
              {!simulationMode ? (
                <>
                  <button 
                    onClick={() => startSimulation('ingestion')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition border border-slate-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Ingestion Flow
                  </button>
                  <button 
                    onClick={() => startSimulation('query')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition shadow-lg shadow-blue-900/20"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Query Flow
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-emerald-900/20 animate-pulse-fast"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                   <button 
                    onClick={resetSimulation}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Reset"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Visualization Stage */}
          <div className="flex-1 min-h-[400px] flex flex-col">
             <div className="flex items-center justify-between mb-2">
               <h2 className="text-sm font-semibold text-slate-400">Architecture Diagram</h2>
               {simulationMode && (
                 <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
                    Step {currentStepIndex + 1} / {simulationMode === 'ingestion' ? getIngestionSteps(selectedTenant).length : getQuerySteps(selectedTenant).length}
                 </span>
               )}
             </div>
             <PipelineVisualizer 
                activeNode={activeNode} 
                onNodeClick={setActiveNode} 
                activeFlow={activeFlow}
                animatingEdge={animatingEdge}
             />
          </div>

          {/* Bottom Panels: Logs & Data Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-56">
             {/* Data Inspector */}
             <DataInspector 
                data={inspectorData} 
                onGenerateVideo={handleGenerateRerankVideo}
                videoUrl={rerankVideoUrl}
                isGeneratingVideo={isGeneratingRerankVideo}
             />

             {/* Console Log */}
             <div className="bg-black/40 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-hidden flex flex-col shadow-inner">
              <div className="flex items-center gap-2 text-slate-500 mb-2 border-b border-slate-800 pb-2">
                <Terminal className="w-3 h-3" />
                <span>System Logs</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {consoleLogs.map((msg, i) => (
                  <div key={i} className={`truncate ${i === 0 ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                    {msg}
                  </div>
                ))}
                {consoleLogs.length === 0 && <span className="text-slate-600 italic">Ready. Select a flow to start.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Info Panel */}
        <div className="lg:col-span-4 h-full border-l border-slate-800 bg-slate-900">
          <DetailPanel nodeId={activeNode} onClose={() => setActiveNode(null)} />
        </div>

      </main>
    </div>
  );
};

export default App;