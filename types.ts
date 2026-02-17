import React from 'react';

export type NodeType = 
  | 'source' 
  | 'kafka' 
  | 'flink' 
  | 'embedding' 
  | 'vector_db' 
  | 'redis' 
  | 'retriever' 
  | 'reranker'
  | 'llm' 
  | 'user';

export interface PipelineNodeDef {
  id: NodeType;
  label: string;
  x: number;
  y: number;
  icon: React.ComponentType<any>;
  description: string;
  category: 'ingestion' | 'query' | 'storage';
}

export interface PipelineEdgeDef {
  from: NodeType;
  to: NodeType;
  label?: string;
  activeInFlow: 'ingestion' | 'query' | 'both';
  payloadInfo?: string; // e.g. "JSON: { query: string }" or "Binary: PDF"
}

export interface NodeDetail {
  title: string;
  subtitle: string;
  content: string; // Markdown supported
  algorithms: string[];
  techStack: string[];
}

export interface SimulationStepData {
  title: string;
  data: Record<string, any> | string;
  description: string;
  visualType?: 'json' | 'ranking';
}

export interface SimulationStepDef {
  stepId: number;
  node: NodeType;
  edge?: { from: string; to: string };
  log: string;
  inspectorData?: SimulationStepData;
}