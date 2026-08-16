import { AgentId } from '../types';
import { eventBus, TaskStatePayload } from './eventBus';

export type TaskStage = 'Planning' | 'Executing' | 'Completed';

export interface ManagedTask {
  id: string;
  title: string;
  description: string;
  assignedAgent: AgentId;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  stage: TaskStage;
  progressPercent: number; // 0 to 100
  createdAt: string;
  dueDate?: string;
  tags: string[];
  output?: string;
}

export const INITIAL_TASKS: ManagedTask[] = [
  {
    id: 'task-1',
    title: 'Decompose Google Workspace OAuth token refresh flow',
    description: 'Structure automated refresh token lifecycle for Gmail and Calendar background sync.',
    assignedAgent: 'communications',
    priority: 'High',
    stage: 'Executing',
    progressPercent: 65,
    createdAt: '10:14 AM',
    dueDate: 'Today, 5:00 PM',
    tags: ['OAuth', 'Security', 'Workspace'],
    output: 'Refreshed client tokens via server proxy and configured PKCE authorization flow.'
  },
  {
    id: 'task-2',
    title: 'Generate AST validation sandbox for React components',
    description: 'Ensure runtime JSX evaluation catches undefined Lucide icons and missing imports.',
    assignedAgent: 'builder',
    priority: 'Urgent',
    stage: 'Executing',
    progressPercent: 80,
    createdAt: '10:20 AM',
    dueDate: 'Today, 3:30 PM',
    tags: ['Sandbox', 'Babel', 'React'],
    output: 'Configured Babel standalone compiler with dynamic icon factory shim.'
  },
  {
    id: 'task-3',
    title: 'Index Postgres pgvector chunks for multi-document RAG',
    description: 'Create hierarchical embedding tree for ingested PDF and markdown architecture files.',
    assignedAgent: 'knowledge',
    priority: 'Medium',
    stage: 'Planning',
    progressPercent: 20,
    createdAt: '10:35 AM',
    dueDate: 'Tomorrow, 12:00 PM',
    tags: ['RAG', 'VectorDB', 'Embeddings']
  },
  {
    id: 'task-4',
    title: 'Schedule 24-hour Autonomous Multi-Agent Digest cron',
    description: 'Trigger nightly system performance summary and security audit report dispatch.',
    assignedAgent: 'task',
    priority: 'Low',
    stage: 'Planning',
    progressPercent: 15,
    createdAt: '10:45 AM',
    dueDate: 'Tomorrow, 9:00 AM',
    tags: ['Cron', 'Digest', 'Observability']
  },
  {
    id: 'task-5',
    title: 'Establish Event Bus schema & Inter-Agent protocol',
    description: 'Implemented standardized JSON-RPC envelope with priority queue routing.',
    assignedAgent: 'orchestrator',
    priority: 'Urgent',
    stage: 'Completed',
    progressPercent: 100,
    createdAt: '09:00 AM',
    dueDate: 'Completed',
    tags: ['EventBus', 'Core', 'Architecture'],
    output: 'Published event bus protocol with real-time reactive sync across DAG planner & agents.'
  },
  {
    id: 'task-6',
    title: 'Compile D3.js sub-agent distribution chart matrix',
    description: 'Render interactive SVG distribution matrix across 15 specialist agents.',
    assignedAgent: 'analytics',
    priority: 'High',
    stage: 'Completed',
    progressPercent: 100,
    createdAt: '09:30 AM',
    dueDate: 'Completed',
    tags: ['D3', 'Telemetry', 'Metrics'],
    output: 'Constructed responsive matrix visualization showing agent task throughput.'
  }
];

class TaskSyncService {
  private tasks: ManagedTask[] = [...INITIAL_TASKS];

  getTasks(): ManagedTask[] {
    return [...this.tasks];
  }

  getTask(id: string): ManagedTask | undefined {
    return this.tasks.find(t => t.id === id);
  }

  updateTaskStage(taskId: string, newStage: TaskStage, customProgress?: number, output?: string): ManagedTask | null {
    const idx = this.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;

    const previousTask = this.tasks[idx];
    let progress = customProgress !== undefined ? customProgress : previousTask.progressPercent;
    
    if (newStage === 'Planning' && customProgress === undefined) progress = 20;
    if (newStage === 'Executing' && customProgress === undefined) progress = 65;
    if (newStage === 'Completed' && customProgress === undefined) progress = 100;

    const updated: ManagedTask = {
      ...previousTask,
      stage: newStage,
      progressPercent: progress,
      output: output || previousTask.output || (newStage === 'Completed' ? 'Task execution completed successfully.' : undefined)
    };

    this.tasks[idx] = updated;

    const payload: TaskStatePayload = {
      taskId: updated.id,
      title: updated.title,
      description: updated.description,
      assignedAgent: updated.assignedAgent,
      priority: updated.priority,
      stage: updated.stage,
      progressPercent: updated.progressPercent,
      output: updated.output,
      timestamp: new Date().toLocaleTimeString()
    };

    eventBus.emit('task:updated', payload);

    if (newStage === 'Completed' && previousTask.stage !== 'Completed') {
      eventBus.emit('task:completed', payload);
    }

    return updated;
  }

  updateTaskProgress(taskId: string, progressPercent: number): ManagedTask | null {
    const idx = this.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;

    const previousTask = this.tasks[idx];
    const newStage: TaskStage = progressPercent >= 100 ? 'Completed' : progressPercent > 20 ? 'Executing' : 'Planning';

    const updated: ManagedTask = {
      ...previousTask,
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
      stage: newStage
    };

    this.tasks[idx] = updated;

    const payload: TaskStatePayload = {
      taskId: updated.id,
      title: updated.title,
      description: updated.description,
      assignedAgent: updated.assignedAgent,
      priority: updated.priority,
      stage: updated.stage,
      progressPercent: updated.progressPercent,
      output: updated.output,
      timestamp: new Date().toLocaleTimeString()
    };

    eventBus.emit('task:updated', payload);

    if (newStage === 'Completed' && previousTask.stage !== 'Completed') {
      eventBus.emit('task:completed', payload);
    }

    return updated;
  }

  addTask(task: Omit<ManagedTask, 'id' | 'createdAt'>): ManagedTask {
    const created: ManagedTask = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.tasks.unshift(created);

    const payload: TaskStatePayload = {
      taskId: created.id,
      title: created.title,
      description: created.description,
      assignedAgent: created.assignedAgent,
      priority: created.priority,
      stage: created.stage,
      progressPercent: created.progressPercent,
      output: created.output,
      timestamp: created.createdAt
    };

    eventBus.emit('task:created', payload);
    return created;
  }

  deleteTask(taskId: string): boolean {
    const initialLen = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    const deleted = this.tasks.length < initialLen;
    if (deleted) {
      eventBus.emit('task:deleted', { taskId });
    }
    return deleted;
  }
}

export const taskSyncService = new TaskSyncService();
