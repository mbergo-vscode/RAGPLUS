import React, { useState, useRef } from 'react';
import PipelineVisualizer from './components/PipelineVisualizer';
import DetailPanel from './components/DetailPanel';
import DataInspector from './components/DataInspector';
import { generateRAGResponse, generateVeoVideo } from './services/geminiService';
import { NodeType, SimulationStepDef } from './types';
import { Play, Database, RefreshCw, Terminal, ChevronRight, RotateCcw, Users, Image as ImageIcon, Video, Upload, Loader2, Zap, RefreshCcw } from 'lucide-react';

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

const getQuerySteps = (tenantId: string, isRedisHit: boolean, isFlareEnabled: boolean): SimulationStepDef[] => {
  // 1. Common Start
  const baseSteps: SimulationStepDef[] = [
    {
      stepId: 0, node: 'user', log: `User (${tenantId}): Submitting query`,
      inspectorData: { 
        title: 'User Input', 
        description: 'Raw input via API Gateway. Often ambiguous or lacking context.', 
        data: { query: "vacation policy?", user_id: "u_99", tenant_id: tenantId } 
      }
    },
    {
      stepId: 1, node: 'redis', edge: {from: 'user', to: 'redis'}, log: 'Redis: Checking Hot Cache',
      inspectorData: { 
        title: 'Cache Check (Layer 1)', 
        description: isRedisHit ? 'Cache HIT! Returning response immediately.' : 'Cache MISS. Proceeding to deep retrieval.', 
        data: { 
            cache_hit: isRedisHit, 
            latency: isRedisHit ? "2ms" : "N/A", 
            key: `chat:${tenantId}:u_99`,
            cached_response: isRedisHit ? "Vacation policy is 20 days." : null
        } 
      }
    }
  ];

  // 2. Redis Hit Short-Circuit
  if (isRedisHit) {
    return [
        ...baseSteps,
        {
          stepId: 2, node: 'user', edge: {from: 'redis', to: 'user'}, log: 'User: Received Cached Response',
          inspectorData: {
             title: 'Response Delivered',
             description: 'Latency < 10ms. No LLM or Vector DB costs incurred.',
             data: { source: "REDIS_CACHE", content: "Vacation policy is 20 days." }
          }
        }
    ];
  }

  // 3. Standard Retrieval Path (Redis Miss)
  const retrievalSteps: SimulationStepDef[] = [
    {
      stepId: 2, node: 'postgres', edge: {from: 'redis', to: 'postgres'}, log: 'Postgres: Loading Long-term History',
      inspectorData: { 
        title: 'Permanent Storage (Layer 2)', 
        description: 'Fetching full historical context from PostgreSQL. This is the "System of Record".', 
        data: { query: "SELECT * FROM chat_logs WHERE user_id = 'u_99' LIMIT 10", found_records: 124 } 
      }
    },
    {
      stepId: 3, node: 'router', edge: {from: 'redis', to: 'router'}, log: 'Router: Analyzing Intent',
      inspectorData: { 
        title: 'Semantic Router (Classification)', 
        description: 'Deciding the routing path. The model determines if the query requires Unstructured Search (Vector).', 
        data: { intent: "unstructured_information", action: "ROUTE_TO_VECTOR_DB" } 
      }
    },
    {
      stepId: 4, node: 'retriever', edge: {from: 'router', to: 'retriever'}, log: 'Retriever: Generating HyDE Document',
      inspectorData: { 
        title: 'HyDE Strategy', 
        description: 'Hallucinating an ideal answer to improve retrieval.', 
        data: { method: "HyDE", hypothetical_doc: `The vacation policy for Tenant ${tenantId} typically allows...` } 
      }
    },
    {
      stepId: 5, node: 'embedding', edge: {from: 'retriever', to: 'embedding'}, log: 'Embedding: Vectorizing Query',
      inspectorData: { 
        title: 'Query Embedding', 
        description: 'Embedding the hypothetical answer to find semantically similar REAL documents.', 
        data: { vector_preview: [0.12, -0.55, 0.91] } 
      }
    },
    {
      stepId: 6, node: 'vector_db', edge: {from: 'embedding', to: 'vector_db'}, log: `Vector DB: Search`,
      inspectorData: { 
        title: 'Hybrid Search', 
        description: 'Retrieving top candidates.', 
        data: { total_candidates: 50, filter: { tenant_id: tenantId } } 
      }
    },
    {
      stepId: 7, node: 'reranker', edge: {from: 'vector_db', to: 'reranker'}, log: 'Reranker: Filtering',
      inspectorData: { 
        title: 'Cross-Encoder Re-ranking', 
        description: 'Refining the top results.', 
        visualType: 'ranking',
        data: { 
          model: "mixedbread-ai/mxbai-rerank-large-v1",
          candidates: [
            { id: "doc_88", text: `Vacation Policy (Tenant ${tenantId})`, old_rank: 14, new_rank: 1, score: 0.98 },
            { id: "doc_12", text: "Paid Time Off Guidelines", old_rank: 3, new_rank: 2, score: 0.89 },
          ]
        } 
      }
    },
    {
        stepId: 8, node: 'llm', edge: {from: 'reranker', to: 'llm'}, log: 'LLM: Generating Initial Draft',
        inspectorData: { 
          title: 'LLM Generation Start', 
          description: 'Model begins generating the answer.', 
          data: { system_prompt: "You are a helpful HR assistant..." } 
        }
    }
  ];

  // 4. FLARE Branching
  let flareSteps: SimulationStepDef[] = [];
  if (isFlareEnabled) {
      flareSteps = [
        {
            stepId: 9, node: 'retriever', edge: {from: 'llm', to: 'retriever'}, log: 'FLARE: Low Confidence Detected!',
            inspectorData: { 
              title: 'FLARE Triggered (Active Retrieval)', 
              description: 'The LLM paused generation because confidence dropped below threshold for the term "sick leave days".', 
              data: { 
                  current_generation: "Vacation is 20 days, but sick leave is [CONFIDENCE_LOW]...",
                  action: "PAUSE_AND_RETRIEVE",
                  generated_query: "sick leave days count"
              } 
            }
        },
        {
            stepId: 10, node: 'vector_db', edge: {from: 'retriever', to: 'vector_db'}, log: 'FLARE: Targeted Retrieval',
            inspectorData: { 
              title: 'Targeted Look-up', 
              description: 'Fetching specific data for the missing term.', 
              data: { query: "sick leave days count", result: "Sick Leave = 10 days" } 
            }
        },
        {
            stepId: 11, node: 'llm', edge: {from: 'vector_db', to: 'llm'}, log: 'LLM: Resuming Generation',
            inspectorData: { 
              title: 'Generation Resumed', 
              description: 'Incorporating new evidence into the response.', 
              data: { final_segment: "...sick leave is 10 days per year." } 
            }
        }
      ];
  }

  // 5. Finalize
  const nextStepId = 8 + (isFlareEnabled ? 3 : 0) + 1;
  const finalSteps: SimulationStepDef[] = [
    {
      stepId: nextStepId, node: 'postgres', edge: {from: 'llm', to: 'postgres'}, log: 'Postgres: Archiving',
      inspectorData: { 
        title: 'Persistent Archive', 
        description: 'Writing interaction to logs.', 
        data: { action: "INSERT", table: "chat_logs" } 
      }
    },
    {
      stepId: nextStepId + 1, node: 'user', edge: {from: 'llm', to: 'user'}, log: 'User: Final Response',
      inspectorData: { 
        title: 'Final Output', 
        description: 'Delivered via SSE.', 
        data: "Based on the policy, you have **20 days** of vacation and **10 days** of sick leave." 
      }
    }
  ];

  return [...baseSteps, ...retrievalSteps, ...flareSteps, ...finalSteps];
};

const TENANTS = ['T-800', 'Cyberdyne', 'Massive Dynamic', 'Acme Corp'];

const App: React.FC = () => {
  const [activeNode, setActiveNode] = useState<NodeType | null>(null);
  const [activeFlow, setActiveFlow] = useState<'ingestion' | 'query' | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [userQuery, setUserQuery] = useState('What is the vacation policy?');
  const [selectedTenant, setSelectedTenant] = useState('T-800');
  
  // Toggles
  const [simulateRedisHit, setSimulateRedisHit] = useState(false);
  const [enableFlare, setEnableFlare] = useState(false);

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
    if(mode === 'query') {
        if(simulateRedisHit) log('[CONFIG] Redis Cache Hit Simulation: ON');
        if(enableFlare) log('[CONFIG] FLARE Active Retrieval: ON');
    }

    setInspectorData(null);
    setRerankVideoUrl(null); 
    advanceStep(mode, 0); 
  };

  const advanceStep = (mode: 'ingestion' | 'query', stepIdx: number) => {
    const steps = mode === 'ingestion' 
        ? getIngestionSteps(selectedTenant) 
        : getQuerySteps(selectedTenant, simulateRedisHit, enableFlare);
    
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

    if (mode === 'query' && step.node === 'llm' && !simulateRedisHit) {
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
          const videoUrl = await generateVeoVideo(prompt, undefined, '16:9'); 
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
            
            {/* Top Row: Query Input */}
            <div className="w-full">
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

            {/* Bottom Row: Toggles & Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-slate-800 pt-3">
                 {/* Feature Toggles */}
                 <div className="flex items-center gap-3">
                    <button 
                        onClick={() => !simulationMode && setSimulateRedisHit(!simulateRedisHit)}
                        disabled={simulationMode !== null}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            simulateRedisHit 
                                ? 'bg-red-900/30 border-red-500 text-red-300' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Simulate a Redis Cache Hit (skips retrieval)"
                    >
                        <Zap className={`w-3.5 h-3.5 ${simulateRedisHit ? 'fill-current' : ''}`} />
                        Redis Hit
                    </button>

                    <button 
                        onClick={() => !simulationMode && setEnableFlare(!enableFlare)}
                        disabled={simulationMode !== null || simulateRedisHit}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            enableFlare 
                                ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        } ${simulateRedisHit ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Enable FLARE (Self-Correcting Active Retrieval)"
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 ${enableFlare ? 'animate-spin-slow' : ''}`} />
                        FLARE Mode
                    </button>
                 </div>

                 {/* Action Buttons */}
                 <div className="flex gap-2">
                    {!simulationMode ? (
                        <>
                        <button 
                            onClick={() => startSimulation('ingestion')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition border border-slate-700"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Ingestion
                        </button>
                        <button 
                            onClick={() => startSimulation('query')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition shadow-lg shadow-blue-900/20"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Start Query
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
          </div>

          {/* Visualization Stage */}
          <div className="flex-1 min-h-[400px] flex flex-col">
             <div className="flex items-center justify-between mb-2">
               <h2 className="text-sm font-semibold text-slate-400">Architecture Diagram</h2>
               {simulationMode && (
                 <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
                    Step {currentStepIndex + 1} / {simulationMode === 'ingestion' ? getIngestionSteps(selectedTenant).length : getQuerySteps(selectedTenant, simulateRedisHit, enableFlare).length}
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