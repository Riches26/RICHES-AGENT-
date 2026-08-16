export type AgentId = 
  | 'orchestrator'
  | 'planner'
  | 'task'
  | 'builder'
  | 'research'
  | 'analytics'
  | 'communications'
  | 'knowledge'
  | 'github'
  | 'file'
  | 'database'
  | 'media'
  | 'social'
  | 'security'
  | 'notification';

export type AgentState = 
  | 'IDLE'
  | 'THINKING'
  | 'EXECUTING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TERMINATED';

export type ModelProvider = 'gemini' | 'gpt' | 'claude' | 'deepseek' | 'openrouter' | 'local';

export interface AgentInfo {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  state: AgentState;
  icon: string;
  color: string;
  category: 'core' | 'specialist' | 'system';
  tools: string[];
  permissions: string[];
  systemPrompt: string;
  tasksCompleted: number;
  lastActive: string;
}

export interface InterAgentMessage {
  id: string;
  timestamp: string;
  sender: AgentId;
  recipient: AgentId;
  task: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  payload: any;
  status: 'sent' | 'processing' | 'delivered';
}

export interface AgentEvent {
  id: string;
  type: 
    | 'task.created' 
    | 'task.completed' 
    | 'email.sent' 
    | 'workflow.started' 
    | 'workflow.failed'
    | 'agent.thought'
    | 'tool.executed'
    | 'approval.required'
    | 'memory.retrieved'
    | 'model.routed';
  source: AgentId;
  payload: any;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignedAgent: AgentId;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'waiting_approval' | 'completed' | 'failed';
  createdAt: string;
  dueDate?: string;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  requiresApproval?: boolean;
}

export interface DAGNode {
  id: string;
  label: string;
  agent: AgentId;
  status: 'pending' | 'running' | 'completed' | 'failed';
  dependencies: string[];
  output?: string;
}

export interface DAGWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: DAGNode[];
  status: 'idle' | 'running' | 'completed' | 'failed';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'orchestrator' | AgentId;
  content: string;
  timestamp: string;
  agentTrace?: {
    routingReasoning?: string;
    modelUsed?: string;
    targetAgents?: AgentId[];
    toolCalls?: { name: string; args: any; result: any }[];
    events?: AgentEvent[];
  };
  artifacts?: {
    type: 'code' | 'report' | 'image' | 'video' | 'data';
    title: string;
    content: string;
    language?: string;
  }[];
  requiresApproval?: PendingApproval;
}

export interface PendingApproval {
  id: string;
  agentId: AgentId;
  action: string;
  details: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  payload: any;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PluginItem {
  id: string;
  name: string;
  category: 'productivity' | 'development' | 'social' | 'workspace' | 'data';
  description: string;
  installed: boolean;
  enabled: boolean;
  icon: string;
  version: string;
  authType: 'oauth' | 'api_key' | 'none';
  configured: boolean;
  toolsProvided: string[];
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md' | 'json';
  size: string;
  uploadedAt: string;
  chunksCount: number;
  status: 'indexing' | 'indexed' | 'failed';
  chunks?: { id: string; text: string; vectorScore?: number }[];
}

export interface SystemMetrics {
  apiLatencyMs: number;
  tokenUsageToday: number;
  activeAgentsCount: number;
  memoryLookupsCount: number;
  toolExecutionsCount: number;
  successRatePercent: number;
  modelsUsedDistribution: Record<string, number>;
  toolCallsDistribution: Record<string, number>;
  hourlyLatency: { hour: string; latencyMs: number; tokens: number }[];
  recentEvents?: any[];
}

export interface RecentFile {
  id: string;
  name: string;
  path: string;
  folder: string;
  language: string;
  size: string;
  lineCount?: number;
  lastModified?: string;
  contentSnippet?: string;
  content?: string;
}

export type GlobalSearchCategory = 'all' | 'agents' | 'tasks' | 'files';

export interface GlobalSearchResult {
  id: string;
  type: 'agent' | 'task' | 'file';
  title: string;
  subtitle: string;
  category: string;
  badge?: string;
  badgeColor?: string;
  details?: string;
  icon?: string;
  agentData?: AgentInfo;
  taskData?: TaskItem | any;
  fileData?: RecentFile;
}
