import React, { useState, useEffect } from 'react';
import { 
  GitGraph, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  ArrowRight, 
  Cpu,
  Layers,
  Sparkles,
  Activity,
  RotateCcw,
  RefreshCw,
  Zap,
  Check
} from 'lucide-react';
import { DAGWorkflow, DAGNode, AgentId } from '../types';
import { executeWorkflowDAG } from '../services/api';
import { eventBus } from '../services/eventBus';
import { taskSyncService, ManagedTask } from '../services/taskSyncService';

export const PlannerDAG: React.FC = () => {
  const [tasks, setTasks] = useState<ManagedTask[]>(taskSyncService.getTasks());
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('wf-live-tasks');
  const [isRunning, setIsRunning] = useState(false);

  // Static pre-configured workflows
  const [customWorkflows, setCustomWorkflows] = useState<DAGWorkflow[]>([
    {
      id: 'wf-1',
      name: 'Autonomous YouTube Video Production Workflow',
      description: 'Research topic, write video script, generate thumbnail visual, and schedule YouTube upload.',
      status: 'idle',
      createdAt: new Date().toISOString(),
      nodes: [
        { id: 'node-1', label: '1. Topic Deep Research', agent: 'research', status: 'completed', dependencies: [], output: 'Identified top 5 trending AI OS topics with high CTR.' },
        { id: 'node-2', label: '2. Video Script Writing', agent: 'task', status: 'completed', dependencies: ['node-1'], output: '10-minute structured video script generated.' },
        { id: 'node-3', label: '3. Thumbnail Design Generation', agent: 'media', status: 'completed', dependencies: ['node-2'], output: 'High-contrast 4K thumbnail artifact created.' },
        { id: 'node-4', label: '4. YouTube Video Schedule', agent: 'social', status: 'pending', dependencies: ['node-3'] }
      ]
    },
    {
      id: 'wf-2',
      name: 'Full-Stack Microservice Deployment Pipeline',
      description: 'Generate database schema, build Express API endpoints, compile React frontend, and verify sandbox.',
      status: 'idle',
      createdAt: new Date().toISOString(),
      nodes: [
        { id: 'n-1', label: '1. SQL & Vector Schema Design', agent: 'database', status: 'completed', dependencies: [], output: 'PostgreSQL pgvector schema created.' },
        { id: 'n-2', label: '2. Express API Code Generation', agent: 'builder', status: 'completed', dependencies: ['n-1'], output: 'Express REST routes written.' },
        { id: 'n-3', label: '3. React Frontend Component Build', agent: 'builder', status: 'running', dependencies: ['n-2'] },
        { id: 'n-4', label: '4. Security Audit & Deployment', agent: 'security', status: 'pending', dependencies: ['n-3'] }
      ]
    }
  ]);

  // Unified Event-Driven Listener to sync task state changes automatically
  useEffect(() => {
    const handleTaskChange = () => {
      setTasks(taskSyncService.getTasks());
    };

    const unsubUpdated = eventBus.on('task:updated', handleTaskChange);
    const unsubCreated = eventBus.on('task:created', handleTaskChange);
    const unsubDeleted = eventBus.on('task:deleted', handleTaskChange);

    return () => {
      unsubUpdated();
      unsubCreated();
      unsubDeleted();
    };
  }, []);

  // Dynamically derive the Live Synced DAG Workflow from current task state
  const liveTaskWorkflow: DAGWorkflow = {
    id: 'wf-live-tasks',
    name: 'Live Agent Command Center Task Mesh (Synchronized)',
    description: 'Dynamic directed graph generated automatically from active Task Agent assignments and stage transitions.',
    status: tasks.every(t => t.stage === 'Completed') ? 'completed' : tasks.some(t => t.stage === 'Executing') ? 'running' : 'idle',
    createdAt: new Date().toISOString(),
    nodes: tasks.map((task, idx) => {
      let status: 'pending' | 'running' | 'completed' = 'pending';
      if (task.stage === 'Completed') status = 'completed';
      else if (task.stage === 'Executing') status = 'running';

      return {
        id: task.id,
        label: `${idx + 1}. ${task.title}`,
        agent: task.assignedAgent,
        status,
        dependencies: idx > 0 ? [tasks[idx - 1].id] : [],
        output: task.output || (task.stage === 'Completed' ? 'Task deliverable confirmed by agent supervisor.' : undefined)
      };
    })
  };

  const allWorkflows: DAGWorkflow[] = [liveTaskWorkflow, ...customWorkflows];
  const activeWorkflow = allWorkflows.find(w => w.id === selectedWorkflowId) || liveTaskWorkflow;
  const activeNodes = activeWorkflow?.nodes || [];

  const handleRunWorkflow = async () => {
    if (isRunning) return;
    setIsRunning(true);

    try {
      if (selectedWorkflowId === 'wf-live-tasks') {
        // Sequentially execute pending or running tasks through taskSyncService
        const currentTasks = taskSyncService.getTasks();
        for (const t of currentTasks) {
          if (t.stage !== 'Completed') {
            taskSyncService.updateTaskStage(t.id, 'Executing', 50);
            await new Promise(r => setTimeout(r, 600));
            taskSyncService.updateTaskStage(t.id, 'Completed', 100, `Delivered via Planner DAG Execution Engine for @${t.assignedAgent}`);
            await new Promise(r => setTimeout(r, 400));
          }
        }
      } else {
        const res = await executeWorkflowDAG(selectedWorkflowId, activeWorkflow.nodes);
        setCustomWorkflows(prev => prev.map(w => {
          if (w.id !== selectedWorkflowId) return w;
          return {
            ...w,
            status: 'completed',
            nodes: res.nodes || w.nodes
          };
        }));
      }
    } catch (e: any) {
      console.error('DAG execution error:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAdvanceLiveNode = (taskId: string) => {
    const currentTask = taskSyncService.getTask(taskId);
    if (!currentTask) return;

    if (currentTask.stage === 'Planning') {
      taskSyncService.updateTaskStage(taskId, 'Executing');
    } else if (currentTask.stage === 'Executing') {
      taskSyncService.updateTaskStage(taskId, 'Completed', 100, `Completed directly from Planner DAG inspector.`);
    } else {
      taskSyncService.updateTaskStage(taskId, 'Planning', 20);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'running':
        return (
          <span className="flex items-center gap-1 text-cyan-400 font-bold text-xs animate-pulse">
            <Activity className="w-3.5 h-3.5 animate-spin" />
            <span>Running</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-amber-400 font-medium text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 md:p-6 space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 shrink-0">
            <GitGraph className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>DAG Planner Execution Engine</span>
              <span className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 rounded-full font-bold border border-blue-500/30">
                Live Event Bus Synced
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Orchestrates multi-agent execution graphs with topological dependency resolution and real-time state synchronization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
              isRunning
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Executing DAG Nodes...' : 'Run DAG Workflow Graph'}</span>
          </button>
        </div>
      </div>

      {/* Workflow Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {allWorkflows.map(wf => {
          const isSelected = selectedWorkflowId === wf.id;
          const isLive = wf.id === 'wf-live-tasks';
          return (
            <button
              key={wf.id}
              onClick={() => setSelectedWorkflowId(wf.id)}
              className={`px-3.5 py-2 rounded-xl text-left transition-all border shrink-0 flex items-center gap-2 ${
                isSelected
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold shadow-md shadow-blue-500/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isLive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
              <span>{wf.name}</span>
            </button>
          );
        })}
      </div>

      {/* Visual DAG Summary Banner */}
      <div className="space-y-4">
        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>{activeWorkflow.name}</span>
              {selectedWorkflowId === 'wf-live-tasks' && (
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">
                  Synced with Agent Command Center
                </span>
              )}
            </h2>
            <span className="text-[11px] text-slate-400">
              {activeNodes.filter(n => n.status === 'completed').length} / {activeNodes.length} Nodes Resolved
            </span>
          </div>
          <p className="text-xs text-slate-400">{activeWorkflow?.description || ''}</p>
        </div>

        {/* Dynamic Nodes Grid with Topological Dependency Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeNodes.map((node, index) => {
            const correspondingTask = (tasks || []).find(t => t.id === node.id);

            return (
              <div
                key={node.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
                  node.status === 'completed'
                    ? 'bg-slate-900/90 border-emerald-500/40 shadow-md shadow-emerald-500/5'
                    : node.status === 'running'
                    ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{node.label}</span>
                  {getStatusBadge(node.status)}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    <span>Assigned Agent:</span>
                  </span>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 font-bold rounded border border-amber-500/20">
                    @{node.agent}
                  </span>
                </div>

                {node.dependencies && node.dependencies.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span>Depends on: <strong className="text-slate-400">{node.dependencies.join(', ')}</strong></span>
                  </div>
                )}

                {node.output && (
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <span className="text-slate-500 text-[10px]">// Execution Output</span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{node.output}</p>
                  </div>
                )}

                {/* Direct Action Trigger for Synced Task Nodes */}
                {selectedWorkflowId === 'wf-live-tasks' && correspondingTask && (
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Stage: <strong className="text-slate-300">{correspondingTask.stage}</strong> ({correspondingTask.progressPercent}%)
                    </span>
                    <button
                      onClick={() => handleAdvanceLiveNode(node.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border ${
                        correspondingTask.stage === 'Planning'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                          : correspondingTask.stage === 'Executing'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {correspondingTask.stage === 'Planning' && (
                        <>
                          <span>Start Execution</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                      {correspondingTask.stage === 'Executing' && (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Mark Completed</span>
                        </>
                      )}
                      {correspondingTask.stage === 'Completed' && (
                        <>
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Reopen Task</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
