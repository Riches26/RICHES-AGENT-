import { AgentInfo, ChatMessage, TaskItem, PendingApproval, PluginItem, SystemMetrics } from '../types';

export interface ChatSendOptions {
  modelOverride?: string;
  temperatureOverride?: number;
  isRetry?: boolean;
  parameters?: Record<string, any>;
}

export async function sendChatMessage(
  message: string, 
  selectedAgent = 'orchestrator', 
  enableVoice = false, 
  image?: string,
  options?: ChatSendOptions
): Promise<ChatMessage> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message, 
      selectedAgent, 
      enableVoice, 
      image,
      modelOverride: options?.modelOverride,
      temperatureOverride: options?.temperatureOverride,
      isRetry: options?.isRetry,
      parameters: options?.parameters
    }),
  });
  if (!res.ok) {
    throw new Error(`Chat API error: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) throw new Error('Failed to fetch chat history');
  return res.json();
}

export async function clearChatHistory(): Promise<{ success: boolean }> {
  const res = await fetch('/api/conversations', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear chat history');
  return res.json();
}

export async function fetchSystemEvents(): Promise<any[]> {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error('Failed to fetch system events');
  return res.json();
}

export async function fetchAgents(): Promise<AgentInfo[]> {
  const res = await fetch('/api/agents');
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function fetchTasks(): Promise<TaskItem[]> {
  const res = await fetch('/api/tasks');
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createNewTask(task: Partial<TaskItem>): Promise<TaskItem> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function updateTask(id: string, updates: Partial<TaskItem>): Promise<TaskItem> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
}

export async function fetchRecentFiles(): Promise<any[]> {
  try {
    const res = await fetch('/api/files');
    if (!res.ok) throw new Error('Failed to fetch recent files');
    return res.json();
  } catch (e) {
    console.warn('Error fetching files from server:', e);
    return [];
  }
}

export async function fetchPendingApprovals(): Promise<PendingApproval[]> {
  const res = await fetch('/api/approvals');
  if (!res.ok) throw new Error('Failed to fetch approvals');
  return res.json();
}

export async function decideApproval(id: string, decision: 'approved' | 'rejected'): Promise<void> {
  await fetch(`/api/approvals/${id}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision }),
  });
}

export async function createProposal(approval: Partial<PendingApproval>): Promise<PendingApproval> {
  const res = await fetch('/api/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(approval),
  });
  if (!res.ok) throw new Error('Failed to create security approval proposal');
  return res.json();
}

export async function fetchPlugins(): Promise<PluginItem[]> {
  const res = await fetch('/api/plugins');
  if (!res.ok) throw new Error('Failed to fetch plugins');
  return res.json();
}

export async function togglePlugin(id: string): Promise<PluginItem> {
  const res = await fetch(`/api/plugins/${id}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle plugin');
  return res.json();
}

export async function fetchAnalytics(): Promise<SystemMetrics> {
  const res = await fetch('/api/analytics');
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function executeSandboxCode(code: string, language = 'tsx', mode = 'eval'): Promise<any> {
  const res = await fetch('/api/sandbox/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, mode }),
  });
  if (!res.ok) throw new Error('Sandbox execution failed');
  return res.json();
}

export async function ingestKnowledgeDoc(title: string, fileType = 'pdf'): Promise<any> {
  const res = await fetch('/api/memory/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, fileType }),
  });
  if (!res.ok) throw new Error('Failed to ingest knowledge doc');
  return res.json();
}

export async function executeWorkflowDAG(workflowId: string, nodes: any[]): Promise<any> {
  const res = await fetch('/api/workflows/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowId, nodes }),
  });
  if (!res.ok) throw new Error('Workflow DAG execution failed');
  return res.json();
}

export async function publishEventBus(eventType: string, source: string, payload: any): Promise<any> {
  const res = await fetch('/api/eventbus/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: eventType, source, payload }),
  });
  if (!res.ok) throw new Error('Event publishing failed');
  return res.json();
}

export async function executeOSTool(toolName: string, params: any): Promise<any> {
  const res = await fetch('/api/tools/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolName, params }),
  });
  if (!res.ok) throw new Error('Tool execution failed');
  return res.json();
}

export async function queryKnowledgeRAG(query: string): Promise<any> {
  const res = await fetch('/api/memory/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('RAG Query failed');
  return res.json();
}

export async function fetchCronStatus(): Promise<any> {
  const res = await fetch('/api/cron/status');
  if (!res.ok) throw new Error('Failed to fetch 24h cron status');
  return res.json();
}

export async function trigger24hCronDigest(recipientEmail?: string): Promise<any> {
  const res = await fetch('/api/cron/24h-digest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientEmail }),
  });
  if (!res.ok) throw new Error('Failed to trigger 24h cron digest');
  return res.json();
}

export async function updateCronConfig(recipientEmail: string, enabled?: boolean): Promise<any> {
  const res = await fetch('/api/cron/update-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientEmail, enabled }),
  });
  if (!res.ok) throw new Error('Failed to update cron config');
  return res.json();
}

// ----------------------------------------------------
// JARVIS Multi-Agent EDA Script & Voice API
// ----------------------------------------------------

export interface JarvisEDAGenerateParams {
  prompt: string;
  scriptType: 'yosys_tcl' | 'openroad_flow' | 'opensta_sdc' | 'verilog_hdl' | 'python_eda' | 'full_eda_pipeline';
  targetPDK: 'sky130' | 'freepdk45' | 'tsmcN7' | 'generic';
  clockFreqMhz: number;
  includeTestbench: boolean;
  enableSelfHealing: boolean;
}

export async function generateJarvisEDAScript(params: JarvisEDAGenerateParams): Promise<any> {
  const res = await fetch('/api/jarvis/eda/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to generate EDA script in JARVIS multi-agent engine');
  return res.json();
}

export async function simulateJarvisEDAScript(files: any[], targetPDK: string, clockFreqMhz: number): Promise<any> {
  const res = await fetch('/api/jarvis/eda/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, targetPDK, clockFreqMhz }),
  });
  if (!res.ok) throw new Error('Failed to simulate EDA flow in JARVIS engine');
  return res.json();
}

export async function processJarvisVoiceCommand(command: string, context: any = {}): Promise<any> {
  const res = await fetch('/api/jarvis/voice/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, context }),
  });
  if (!res.ok) throw new Error('Failed to process JARVIS voice command');
  return res.json();
}

export async function compileASTCode(code: string, userQuery?: string): Promise<any> {
  const res = await fetch('/api/jarvis/eda/compile-ast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, userQuery }),
  });
  if (!res.ok) throw new Error('Failed to compile AST in JARVIS compiler');
  return res.json();
}

export async function applyRuleEnforce(code: string): Promise<any> {
  const res = await fetch('/api/jarvis/eda/rule-enforce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error('Failed to enforce EDA rules in RuleEnforce');
  return res.json();
}

export async function generateSDGSamples(domainTopic: string, targetCount: number = 3): Promise<any> {
  const res = await fetch('/api/jarvis/eda/sdg-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domainTopic, targetCount }),
  });
  if (!res.ok) throw new Error('Failed to generate synthetic data samples');
  return res.json();
}

export async function runMultiEpisodeRefinement(query: string, maxEpisodes: number = 3): Promise<any> {
  const res = await fetch('/api/jarvis/eda/multi-episode-refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, maxEpisodes }),
  });
  if (!res.ok) throw new Error('Failed to run multi-episode refinement flow');
  return res.json();
}

// Memory Uploader & Multi-Tier Store APIs
export interface MemoryUploadPayload {
  fileName: string;
  fileType: string;
  fileSize?: string;
  content: string;
  targetTier: 'working' | 'session' | 'vector';
  metadata?: Record<string, any>;
}

export async function uploadMemoryDocument(payload: MemoryUploadPayload): Promise<any> {
  const res = await fetch('/api/memory/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload document into memory tier');
  }
  return res.json();
}

export async function fetchWorkingMemory(): Promise<{ keys: any[]; totalKeys: number; ttlDefault: string }> {
  const res = await fetch('/api/memory/working');
  if (!res.ok) throw new Error('Failed to fetch working memory');
  return res.json();
}

export async function setWorkingMemoryKey(key: string, value: any, ttlSeconds = 1800, description?: string): Promise<any> {
  const res = await fetch('/api/memory/working/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, ttlSeconds, description }),
  });
  if (!res.ok) throw new Error('Failed to set working memory key');
  return res.json();
}

export async function deleteWorkingMemoryKey(key: string): Promise<any> {
  const res = await fetch(`/api/memory/working/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete working memory key');
  return res.json();
}

export async function flushWorkingMemory(): Promise<any> {
  const res = await fetch('/api/memory/working/flush', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to flush working memory');
  return res.json();
}

export async function deleteKnowledgeDoc(id: string): Promise<any> {
  const res = await fetch(`/api/memory/docs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete knowledge document');
  return res.json();
}

// Conversational Voice & Wake Word APIs
export interface VoiceConversationalTurnPayload {
  transcript: string;
  history?: Array<{ sender: 'user' | 'riches'; text: string }>;
  personality?: 'executive' | 'conversational' | 'concise' | 'engineer';
  voiceSpeed?: number;
}

export interface VoiceConversationalTurnResult {
  success: boolean;
  spokenText: string;
  displayText: string;
  intent?: string;
  actionDirective?: any;
  agent: string;
  latencyMs: number;
  timestamp: string;
}

export async function sendVoiceConversationalTurn(payload: VoiceConversationalTurnPayload): Promise<VoiceConversationalTurnResult> {
  const res = await fetch('/api/voice/conversational-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate voice conversational turn');
  }
  return res.json();
}

export interface GeminiTTSSynthesizeResult {
  success: boolean;
  base64Audio: string;
  mimeType: string;
  sampleRate: number;
  voiceName: string;
  latencyMs: number;
  timestamp: string;
}

export async function synthesizeGeminiVoice(text: string, voiceName = 'Kore'): Promise<GeminiTTSSynthesizeResult> {
  const res = await fetch('/api/voice/synthesize-gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gemini TTS synthesis failed');
  }
  return res.json();
}

export async function getVoiceWakeAck(): Promise<{ wakeDetected: boolean; spokenAck: string; timestamp: string }> {
  const res = await fetch('/api/voice/wake-ack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to get wake word vocal acknowledgment');
  return res.json();
}




