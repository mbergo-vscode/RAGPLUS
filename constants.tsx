import { Database, Server, Cpu, Layers, MessageSquare, User, FileText, Zap, BrainCircuit, Filter } from 'lucide-react';
import { PipelineNodeDef, PipelineEdgeDef, NodeDetail } from './types';

// Coordinates optimized for a 1200x500 layout
export const NODES: PipelineNodeDef[] = [
  // Ingestion Row (Bottom)
  { id: 'source', label: 'Data Sources', x: 50, y: 350, icon: FileText, description: 'Multi-tenant documents', category: 'ingestion' },
  { id: 'kafka', label: 'Apache Kafka', x: 250, y: 350, icon: Layers, description: 'Event streaming', category: 'ingestion' },
  { id: 'flink', label: 'Apache Flink', x: 450, y: 350, icon: Zap, description: 'Stream processing', category: 'ingestion' },
  { id: 'embedding', label: 'Embedding Model', x: 650, y: 350, icon: BrainCircuit, description: 'Vectorization', category: 'ingestion' },
  { id: 'vector_db', label: 'Vector DB', x: 850, y: 350, icon: Database, description: 'Knowledge Base', category: 'storage' },
  
  // Query Row (Top)
  { id: 'user', label: 'User Client', x: 50, y: 100, icon: User, description: 'Interface', category: 'query' },
  { id: 'redis', label: 'Redis Memory', x: 250, y: 100, icon: Server, description: 'History & Cache', category: 'storage' },
  { id: 'retriever', label: 'Retriever', x: 450, y: 100, icon: Cpu, description: 'Orchestrator', category: 'query' },
  { id: 'reranker', label: 'Reranker', x: 650, y: 100, icon: Filter, description: 'Precision Filtering', category: 'query' },
  { id: 'llm', label: 'LLM (Gemini)', x: 850, y: 100, icon: MessageSquare, description: 'Generation', category: 'query' },
];

export const EDGES: PipelineEdgeDef[] = [
  // Ingestion Flow
  { from: 'source', to: 'kafka', label: 'CDC Events', activeInFlow: 'ingestion', payloadInfo: 'Binary Stream (Apache Tika Extracted)' },
  { from: 'kafka', to: 'flink', label: 'Stream', activeInFlow: 'ingestion', payloadInfo: 'Kafka Record <Key, PDF_Chunk>' },
  { from: 'flink', to: 'embedding', label: 'Chunks', activeInFlow: 'ingestion', payloadInfo: 'Cleaned Text List[String]' },
  { from: 'embedding', to: 'vector_db', label: 'Vectors', activeInFlow: 'ingestion', payloadInfo: 'Float32Array[768]' },
  
  // Query Flow
  { from: 'user', to: 'redis', label: '1. Check Cache', activeInFlow: 'query', payloadInfo: 'JSON: { query, tenant_id }' },
  { from: 'redis', to: 'retriever', label: '2. History', activeInFlow: 'query', payloadInfo: 'List[ChatHistoryItem]' },
  { from: 'retriever', to: 'embedding', label: '3. Embed', activeInFlow: 'query', payloadInfo: 'HyDE String' },
  { from: 'embedding', to: 'retriever', label: 'Vector', activeInFlow: 'query', payloadInfo: 'Vector[768]' },
  { from: 'retriever', to: 'vector_db', label: '4. ANN Search', activeInFlow: 'query', payloadInfo: 'KNN Query + Filters' },
  { from: 'vector_db', to: 'reranker', label: '5. Raw Results', activeInFlow: 'query', payloadInfo: 'List[ScoredPoint] (Top 100)' }, 
  { from: 'reranker', to: 'llm', label: '6. Top K', activeInFlow: 'query', payloadInfo: 'Context Window (Top 5)' },
  { from: 'llm', to: 'redis', label: '7. Write-back', activeInFlow: 'query', payloadInfo: 'New Turn Object' },
  { from: 'llm', to: 'user', label: '8. Stream', activeInFlow: 'query', payloadInfo: 'SSE / Markdown Stream' },
];

export const NODE_DETAILS: Record<string, NodeDetail> = {
  source: {
    title: 'Data Ingestion Source',
    subtitle: 'Modular RAG Foundation',
    content: `The start of the pipeline. In a **Modular RAG** architecture, this module handles the extraction and normalization of data.

**Key Technology: Apache Tika**:
We use Apache Tika here to detect and extract text/metadata from various file formats (PDF, DOCX, PPT) before they hit the stream.

**Key Concepts**:
*   **Modular RAG**: Allows swapping components (e.g., replacing PDF parser with OCR) without breaking the pipeline.
*   **Multi-tenancy**: Strict isolation using \`tenant_id\` metadata from the very first step.`,
    algorithms: ['CDC (Change Data Capture)', 'Apache Tika (Extraction)', 'Unstructured.io'],
    techStack: ['Apache Tika', 'S3', 'PostgreSQL', 'SharePoint API']
  },
  kafka: {
    title: 'Apache Kafka',
    subtitle: 'Event Backbone',
    content: `Decouples ingestion from processing. 

**Why it fits**:
*   **Backpressure**: Prevents the Embedding model from being overwhelmed during bulk uploads.
*   **Ordering**: Ensures document updates (v1 -> v2) are processed in sequence using Key-Partitioning.`,
    algorithms: ['Log-structured storage', 'Zero-copy transfer', 'MurmurHash2 Partitioning'],
    techStack: ['Apache Kafka', 'Confluent Cloud']
  },
  flink: {
    title: 'Apache Flink',
    subtitle: 'Stream Processing & Chunking',
    content: `Handles **Cleaning** and **Chunking**.

**Why Chunking Matters**:
LLMs have finite context windows. We must split documents into manageable pieces (e.g., 512 tokens).

**Advanced Logic**:
*   **Sanitization**: Removing PII or HTML tags.
*   **Deduping**: Using Bloom Filters to avoid re-indexing identical chunks.`,
    algorithms: ['Sliding Window', 'Recursive Character Splitter', 'Bloom Filters'],
    techStack: ['Apache Flink', 'PyFlink']
  },
  embedding: {
    title: 'Embedding Models',
    subtitle: 'Dense, Sparse & Multimodal',
    content: `Encodes meaning into geometry. "King" - "Man" + "Woman" ≈ "Queen".

**Taxonomy (from PDF)**:
1.  **Dense Embeddings**: (The Standard) Fixed-size float vectors. Good for semantic match.
    *   *Examples*: OpenAI, E5, GTE, Gecko.
2.  **Sparse Embeddings**: (The Specialist) High-dimensional, mostly zeros. Good for exact keyword match.
    *   *Examples*: **SPLADE**, DeepImpact.
3.  **Multimodal**: Connects text to images/audio.
    *   *Examples*: **CLIP**, ImageBind.

**Why?**
Dense finds "conceptual" matches; Sparse finds "exact" matches. Hybrid systems use both.`,
    algorithms: ['Transformer (BERT)', 'SPLADE (Sparse)', 'CLIP (Multimodal)'],
    techStack: ['Google Gemini Embeddings', 'HuggingFace', 'Voyage AI']
  },
  vector_db: {
    title: 'Vector Database',
    subtitle: 'ANN Search (HNSW / DiskANN)',
    content: `Stores vectors for similarity search.

**Cheat Sheet (from PDF)**:
1.  **HNSW**: Fast + High Recall + RAM heavy. *The default winner for most teams.*
2.  **IVF-PQ**: Massive scale + Cheaper + Slight recall loss. Uses Product Quantization.
3.  **DiskANN (Vamana)**: SSD-resident. Great when RAM is limited but you have huge datasets.

**Gotcha**: "Filtering matters". If you filter by \`tenant_id\`, standard HNSW can degrade unless the DB supports **Filtered HNSW** natively.`,
    algorithms: ['HNSW (Graph)', 'IVF-PQ (Clustering)', 'DiskANN (Graph-on-SSD)'],
    techStack: ['Qdrant', 'Weaviate', 'Milvus', 'Pinecone']
  },
  redis: {
    title: 'Redis (Memory & Cache)',
    subtitle: 'KV Cache & Conversation Store',
    content: `Serves as the **Short-term Memory**.

**Roles**:
1.  **Conversation History**: Stores the last $N$ turns. Essential for multi-turn reasoning.
2.  **Semantic Cache**: Maps \`Query Vector\` -> \`Cached Response\`.
3.  **Symbolic Memory**: Can store a lightweight Knowledge Graph (KG) for entity relationships (nodes/edges).`,
    algorithms: ['LRU Eviction', 'Semantic Hashing', 'Graph Traversal'],
    techStack: ['Redis Stack', 'Redis Graph']
  },
  retriever: {
    title: 'Retriever',
    subtitle: 'Orchestration (HyDE, Hybrid, GraphRAG)',
    content: `The brain of search logic.

**Advanced Techniques (from PDF)**:
*   **HyDE (Hypothetical Document Embeddings)**: LLM generates a fake answer, we embed *that* to find real docs. Improves retrieval for vague queries.
*   **HybridRAG**: Combines Vector Search (Semantic) + **GraphRAG** (Knowledge Graph relationships). Best when "relationships matter" (legal/medical).
*   **FLARE**: Active retrieval. The model monitors its own uncertainty and triggers retrieval *mid-generation* if confused.`,
    algorithms: ['HyDE', 'GraphRAG', 'Hybrid Search (Dense + Sparse)', 'Self-Querying'],
    techStack: ['LangChain', 'LlamaIndex', 'Haystack']
  },
  reranker: {
    title: 'Reranker',
    subtitle: 'The "Secret Sauce"',
    content: `Refines the top candidates from the Vector DB using Cross-Encoders.

**The Pipeline**:
1.  **Bi-Encoder (Vector DB)**: Fast, independent vectors. Retrieves top 100 candidates based on geometric distance.
2.  **Cross-Encoder (Reranker)**: Slow, accurate. Feeds (Query, Doc) pairs into BERT and outputs a similarity score. Re-orders top 100 to top 5.

**Scoring Visualization**:
The progress bars in the inspector represent the **Relevance Score** (0 to 1) for each document.
*   **Green (>0.8)**: High Confidence (Direct Answer).
*   **Yellow (0.5-0.8)**: Potential Context.
*   **Red (<0.5)**: Irrelevant / Noise.`,
    algorithms: ['Cross-Encoder (BERT)', 'ColBERT (Late Interaction)', 'Reciprocal Rank Fusion (RRF)'],
    techStack: ['HuggingFace Cross-Encoders', 'Cohere Rerank', 'Mixedbread.ai']
  },
  llm: {
    title: 'LLM & Optimization',
    subtitle: 'Inference & Reasoning Agents',
    content: `The generation engine.

**Reasoning Patterns (Agents)**:
*   **CoT (Chain-of-Thought)**: Forces intermediate steps.
*   **ReAct**: "Reasoning and Acting" loop (Thought -> Action -> Observation).
*   **ToT (Tree of Thoughts)**: Explores multiple reasoning paths.

**Optimization (LLMOps)**:
*   **FlashAttention**: IO-aware GPU kernels for faster inference.
*   **KV Cache**: Caches attention keys/values to speed up autoregressive decoding.
*   **Speculative Decoding**: Small model guesses, big model verifies.`,
    algorithms: ['FlashAttention', 'KV Cache', 'CoT / ReAct', 'Speculative Decoding'],
    techStack: ['Google Gemini 2.5 Flash', 'Google Gemini 3 Pro']
  },
  user: {
    title: 'User Interface',
    subtitle: 'Client & Validation',
    content: `The entry point.
    
**Role**:
*   Captures user intent.
*   Renders streamed markdown.
*   Handles feedback loops (Thumbs up/down) which can be used for **API Gateway** rate limiting and validation.`,
    algorithms: ['React Virtual DOM', 'SSE (Server-Sent Events)'],
    techStack: ['React', 'TypeScript', 'Tailwind CSS']
  }
};