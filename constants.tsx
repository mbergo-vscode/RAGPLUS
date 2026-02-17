import { Database, Server, Cpu, Layers, MessageSquare, User, FileText, Zap, BrainCircuit, Filter, HardDrive, GitFork, Table } from 'lucide-react';
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
  { id: 'redis', label: 'Redis Memory', x: 200, y: 100, icon: Server, description: 'Hot Cache', category: 'storage' },
  { id: 'postgres', label: 'PostgreSQL', x: 200, y: 225, icon: HardDrive, description: 'History / Record', category: 'storage' },
  
  // Routing & Logic
  { id: 'router', label: 'Query Router', x: 350, y: 100, icon: GitFork, description: 'Semantic Routing', category: 'query' },
  { id: 'sql_db', label: 'SQL DB', x: 350, y: 225, icon: Table, description: 'Structured Data', category: 'storage' },

  { id: 'retriever', label: 'Retriever', x: 500, y: 100, icon: Cpu, description: 'Orchestrator', category: 'query' },
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
  { from: 'redis', to: 'postgres', label: '2. History', activeInFlow: 'query', payloadInfo: 'SQL: SELECT * FROM chat_logs' },
  { from: 'postgres', to: 'redis', label: 'Hydrate', activeInFlow: 'query', payloadInfo: 'Sync Recent Context' },
  
  // Routing Steps
  { from: 'redis', to: 'router', label: '3. Classify', activeInFlow: 'query', payloadInfo: 'Input: Query + History' },
  { from: 'router', to: 'retriever', label: 'Semantic Path', activeInFlow: 'query', payloadInfo: 'Decision: Unstructured Search' },
  { from: 'router', to: 'sql_db', label: 'SQL Path', activeInFlow: 'query', payloadInfo: 'Decision: Structured Query' },
  
  // Vector Path
  { from: 'retriever', to: 'embedding', label: '4. Embed', activeInFlow: 'query', payloadInfo: 'HyDE String' },
  { from: 'embedding', to: 'retriever', label: 'Vector', activeInFlow: 'query', payloadInfo: 'Vector[768]' },
  { from: 'retriever', to: 'vector_db', label: '5. Search', activeInFlow: 'query', payloadInfo: 'KNN Query + Filters' },
  { from: 'vector_db', to: 'reranker', label: '6. Candidates', activeInFlow: 'query', payloadInfo: 'List[ScoredPoint] (Top 100)' }, 
  { from: 'reranker', to: 'llm', label: '7. Top K', activeInFlow: 'query', payloadInfo: 'Context Window (Top 5)' },
  
  // SQL Path
  { from: 'sql_db', to: 'llm', label: 'Table Rows', activeInFlow: 'query', payloadInfo: 'JSON: Table Result Set' },

  // FLARE Loop (LLM -> Retriever) - Representing Active Retrieval
  { from: 'llm', to: 'retriever', label: 'FLARE Loop', activeInFlow: 'query', payloadInfo: 'Trigger: Low Confidence Token' },

  { from: 'llm', to: 'postgres', label: '8. Persist', activeInFlow: 'query', payloadInfo: 'INSERT INTO chat_logs' },
  { from: 'llm', to: 'user', label: '9. Stream', activeInFlow: 'query', payloadInfo: 'SSE / Markdown Stream' },
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
    subtitle: 'Hot Cache Layer',
    content: `Serves as the **Short-term Memory** and **Semantic Cache**.

**Why Separate from Postgres?**
Speed. Retrieving context from Redis takes <1ms.

**Roles**:
1.  **Session Cache**: Stores the active conversation turns.
2.  **Semantic Cache**: Maps \`Query Vector\` -> \`Cached Response\` to save LLM costs.
3.  **Write-Behind**: Buffers new chat logs before they are bulk-inserted into Postgres.`,
    algorithms: ['LRU Eviction', 'Semantic Hashing', 'Write-Behind Buffer'],
    techStack: ['Redis Stack', 'Memcached']
  },
  postgres: {
    title: 'PostgreSQL',
    subtitle: 'Permanent History & Compliance',
    content: `The **System of Record** for all historical data.

**Why is it needed?**
While Redis is fast, it's volatile (or expensive for massive storage). Postgres provides:
1.  **Long-term Retention**: Storing chat history for years (Audit logs).
2.  **Analytics**: "Which documents are cited most often?"
3.  **Structured Data**: User profiles, Tenant permissions, and Billing usage.

**Integration**: 
We use **pgvector** here as a secondary vector store or simply JSONB columns for flexible chat log storage.`,
    algorithms: ['B-Tree Indexing', 'MVCC (Concurrency)', 'WAL (Write-Ahead Logging)'],
    techStack: ['PostgreSQL', 'Supabase', 'Neon']
  },
  router: {
    title: 'Query Router (Agentic)',
    subtitle: 'Intent Classification & Routing',
    content: `The "Traffic Cop" of the architecture. It decides WHERE to send the query.
    
**The Logic**:
Not all queries need vector search. 
*   "How many employees in NYC?" -> **SQL DB** (Structured)
*   "What is the remote work policy?" -> **Vector DB** (Unstructured)

**How it works**:
We use a small, fast LLM (or a BERT classifier) to classify the query into an intent.
*   **Semantic Routing**: Using embedding similarity to predefined "routes" (e.g., if query vector is close to "analytics" vector, route to SQL).
*   **LLM Classifier**: A simple prompt: "Is this query asking for a specific number/table or a text explanation? Output: SQL or VECTOR".`,
    algorithms: ['Zero-Shot Classification', 'Semantic Routing (Embedding-based)', 'Function Calling (Tool Use)'],
    techStack: ['Gemini Flash (Fast)', 'HuggingFace Zero-Shot', 'LangChain Router']
  },
  sql_db: {
    title: 'SQL Database',
    subtitle: 'Structured Data & Text-to-SQL',
    content: `Handles structured analytics queries that Vector DBs struggle with.

**Text-to-SQL Pipeline**:
1.  **Schema Retrieval**: The LLM gets the table schema (e.g., \`employees(id, location, salary)\`).
2.  **SQL Generation**: The LLM converts "Count employees in NYC" to \`SELECT COUNT(*) FROM employees WHERE location = 'NYC'\`.
3.  **Execution**: The database executes the SQL.
4.  **Response**: The raw rows are sent back to the main LLM to generate a natural language summary.

**Why this is hard**:
Hallucinating column names is a common issue. We use techniques like **Schema Pruning** to only show relevant tables to the LLM.`,
    algorithms: ['Text-to-SQL', 'Query Validation', 'Schema Pruning'],
    techStack: ['PostgreSQL', 'Snowflake', 'BigQuery']
  },
  retriever: {
    title: 'Retriever',
    subtitle: 'Orchestration (FLARE, HyDE, GraphRAG)',
    content: `The brain of search logic.

**Advanced Techniques**:
*   **FLARE (Forward-Looking Active Retrieval)**: Solves hallucinations. The LLM monitors its own confidence (logits) while generating. If confidence drops below a threshold for a specific term/sentence, it pauses, generates a search query for that specific missing info, retrieves it, and then resumes generation.
*   **HyDE (Hypothetical Document Embeddings)**: LLM generates a fake answer, we embed *that* to find real docs. Improves retrieval for vague queries.
*   **HybridRAG**: Combines Vector Search (Semantic) + **GraphRAG** (Knowledge Graph relationships). Best when "relationships matter" (legal/medical).
*   **Self-Querying**: The Retriever uses an LLM to extract filters (e.g., "date > 2023") from the natural language query before searching.`,
    algorithms: ['FLARE (Active Retrieval)', 'HyDE', 'GraphRAG', 'Hybrid Search', 'Self-Querying'],
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