import { AgentId } from '../types';

export type EventType =
  | 'task:created'
  | 'task:updated'
  | 'task:completed'
  | 'task:deleted'
  | 'task:failed'
  | 'workflow:updated'
  | 'workflow:node_updated'
  | 'workflow:failed'
  | 'sandbox:code_failed'
  | 'sandbox:code_success'
  | 'agent:execution_failed'
  | 'agent:retry_requested'
  | 'orchestrator:retry_with_parameters'
  | 'toast:show'
  | 'agent:state_change'
  | 'security:approval_required';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'warning' | 'emerald';
  icon?: string;
}

export interface ToastEventPayload {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  agent?: AgentId;
  duration?: number; // ms
  action?: ToastAction;
  secondaryAction?: ToastAction;
  metadata?: Record<string, any>;
}

export interface TaskStatePayload {
  taskId: string;
  title: string;
  description: string;
  assignedAgent: AgentId;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  stage: 'Planning' | 'Executing' | 'Completed';
  progressPercent: number;
  output?: string;
  timestamp: string;
}

export interface ExecutionFailurePayload {
  agentId?: AgentId;
  operation?: string;
  prompt?: string;
  error: string;
  attemptCount?: number;
  originalParams?: {
    model?: string;
    temperature?: number;
    timeoutMs?: number;
    maxTokens?: number;
  };
  suggestedParams?: {
    model?: string;
    temperature?: number;
    timeoutMs?: number;
    maxTokens?: number;
    reasoningStrategy?: string;
  };
  onRetry?: (adjustedParams: any) => void;
}

type EventCallback = (payload: any) => void;

class EventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();
  private retryHistory: Map<string, number> = new Map();

  on(event: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return un-subscribe function
    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
      }
    };
  }

  emit(event: EventType, payload: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in event listener for "${event}":`, err);
        }
      });
    }

    // Auto trigger toasts & self-healing retry logic for high-value events
    if (event === 'task:completed') {
      const task = payload as TaskStatePayload;
      this.emit('toast:show', {
        type: 'success',
        title: 'Task Successfully Completed',
        message: `@${task.assignedAgent || 'task'} finished: "${task.title}"`,
        agent: task.assignedAgent
      } as ToastEventPayload);
    } else if (event === 'sandbox:code_failed') {
      const errPayload = payload as { title?: string; error: string; file?: string; onAutoFix?: () => void };
      if (!errPayload.error || errPayload.error === 'Script error.') {
        return;
      }
      this.emit('toast:show', {
        type: 'error',
        title: errPayload.title || 'Sandbox Execution Failed',
        message: errPayload.error || 'Syntax or runtime evaluation failed during code compilation.',
        action: errPayload.onAutoFix ? {
          label: 'Auto-Repair Syntax',
          variant: 'primary',
          onClick: errPayload.onAutoFix
        } : undefined
      } as ToastEventPayload);
    } else if (event === 'sandbox:code_success') {
      const successPayload = payload as { title?: string; message?: string };
      this.emit('toast:show', {
        type: 'info',
        title: successPayload.title || 'Sandbox Compiled',
        message: successPayload.message || 'All preview components compiled and mounted safely.',
      } as ToastEventPayload);
    } else if (event === 'agent:execution_failed' || event === 'workflow:failed' || event === 'task:failed') {
      this.handleExecutionFailure(payload as ExecutionFailurePayload);
    }
  }

  /**
   * Self-healing Auto-Retry Handler for agent execution & workflow faults
   */
  private handleExecutionFailure(payload: ExecutionFailurePayload): void {
    const agentId = payload.agentId || 'orchestrator';
    const key = `${agentId}-${payload.operation || 'execution'}`;
    const attempts = (this.retryHistory.get(key) || 0) + 1;
    this.retryHistory.set(key, attempts);

    // Compute alternative resilient parameters
    const defaultSuggested = {
      model: 'gemini-3.1-pro-preview',
      temperature: 0.2, // Lower temperature for high determinism
      maxTokens: 4096,
      timeoutMs: 30000,
      reasoningStrategy: 'Direct Deterministic Chain-of-Thought'
    };

    const suggestedParams = payload.suggestedParams || defaultSuggested;

    // Dispatch rich Toast with 'Retry with different parameters' action
    this.emit('toast:show', {
      id: `err-retry-${Date.now()}`,
      type: 'error',
      title: `${agentId.toUpperCase()} Execution Interrupted (Attempt ${attempts})`,
      message: `${payload.error || 'Execution encountered an anomaly'}. Auto-retry recommended with adapted parameters.`,
      agent: agentId,
      duration: 10000, // 10 seconds for user action
      action: {
        label: '⚡ Retry with Different Parameters',
        variant: 'primary',
        onClick: () => {
          console.log(`[EventBus] Auto-Retrying @${agentId} with adapted parameters:`, suggestedParams);
          if (payload.onRetry) {
            payload.onRetry(suggestedParams);
          }
          this.emit('orchestrator:retry_with_parameters', {
            agentId,
            prompt: payload.prompt,
            parameters: suggestedParams
          });
          this.emit('toast:show', {
            type: 'info',
            title: 'Auto-Retry Triggered',
            message: `Retrying with ${suggestedParams.model} at temp ${suggestedParams.temperature}...`,
            agent: agentId,
            duration: 3500
          });
        }
      },
      secondaryAction: {
        label: 'Fallback Local Model',
        variant: 'secondary',
        onClick: () => {
          const fallbackParams = { model: 'local-quantized-mistral', temperature: 0.1 };
          if (payload.onRetry) payload.onRetry(fallbackParams);
        }
      }
    } as ToastEventPayload);
  }

  /**
   * Helper to manually trigger an execution failure retry proposal
   */
  triggerAutoRetryWithParameters(failure: ExecutionFailurePayload): void {
    this.emit('agent:execution_failed', failure);
  }

  off(event: EventType, callback: EventCallback): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }
}

export const eventBus = new EventBus();
