import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Play, 
  Plus, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw, 
  Trash2, 
  Filter, 
  Search,
  CheckCircle,
  TrendingUp,
  Cpu,
  Layers,
  Activity,
  Zap,
  Tag,
  Calendar,
  X
} from 'lucide-react';
import { AgentId } from '../types';
import { taskSyncService, ManagedTask, TaskStage } from '../services/taskSyncService';
import { eventBus } from '../services/eventBus';

export const TaskAgentWorkspace: React.FC = () => {
  const [tasks, setTasks] = useState<ManagedTask[]>(taskSyncService.getTasks());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('High');
  const [newTaskAgent, setNewTaskAgent] = useState<AgentId>('task');
  const [newTaskTags, setNewTaskTags] = useState('Core, Workflow');

  // Unified Event-Driven Listener to synchronize tasks across the platform
  useEffect(() => {
    const handleUpdate = () => {
      setTasks(taskSyncService.getTasks());
    };

    const unsubUpdated = eventBus.on('task:updated', handleUpdate);
    const unsubCreated = eventBus.on('task:created', handleUpdate);
    const unsubDeleted = eventBus.on('task:deleted', handleUpdate);

    return () => {
      unsubUpdated();
      unsubCreated();
      unsubDeleted();
    };
  }, []);

  // Stage counts & Progress calculations
  const safeTasks = tasks || [];
  const planningTasks = safeTasks.filter(t => t.stage === 'Planning');
  const executingTasks = safeTasks.filter(t => t.stage === 'Executing');
  const completedTasks = safeTasks.filter(t => t.stage === 'Completed');

  const totalTasks = safeTasks.length;
  const overallProgress = totalTasks > 0
    ? Math.round(
        safeTasks.reduce((sum, t) => sum + (t.progressPercent || 0), 0) / totalTasks
      )
    : 0;

  // Move task between stages through taskSyncService (which triggers eventBus and toast notification on completion)
  const handleMoveTask = (taskId: string, targetStage: TaskStage) => {
    taskSyncService.updateTaskStage(taskId, targetStage);
    setTasks(taskSyncService.getTasks());
  };

  // Simulate real-time agent execution cycle with incremental progress bar animations
  const handleSimulateCycle = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    // Pick first planning task and move to executing
    const currentList = taskSyncService.getTasks() || [];
    const firstPlanning = currentList.find(t => t.stage === 'Planning');
    if (firstPlanning) {
      taskSyncService.updateTaskStage(firstPlanning.id, 'Executing');
      setTasks(taskSyncService.getTasks());
    }

    // Progress active executing tasks
    const interval = setInterval(() => {
      const currentTasks = taskSyncService.getTasks();
      let allDone = true;

      currentTasks.forEach(t => {
        if (t.stage === 'Executing') {
          const nextProgress = Math.min(100, t.progressPercent + 20);
          if (nextProgress >= 100) {
            taskSyncService.updateTaskStage(t.id, 'Completed', 100);
          } else {
            allDone = false;
            taskSyncService.updateTaskProgress(t.id, nextProgress);
          }
        }
      });

      setTasks(taskSyncService.getTasks());

      if (allDone) {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 450);

    setTimeout(() => {
      clearInterval(interval);
      setIsSimulating(false);
      setTasks(taskSyncService.getTasks());
    }, 4500);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    taskSyncService.addTask({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'Autonomous sub-agent execution assignment.',
      assignedAgent: newTaskAgent,
      priority: newTaskPriority,
      stage: 'Planning',
      progressPercent: 20,
      dueDate: 'Today',
      tags: newTaskTags.split(',').map(t => t.trim()).filter(Boolean)
    });

    setTasks(taskSyncService.getTasks());
    setNewTaskTitle('');
    setNewTaskDesc('');
    setShowNewTaskModal(false);
  };

  const handleDeleteTask = (id: string) => {
    taskSyncService.deleteTask(id);
    setTasks(taskSyncService.getTasks());
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.assignedAgent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Urgent':
        return 'bg-red-500/20 text-red-300 border-red-500/40 font-bold';
      case 'High':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      case 'Medium':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Master Pipeline Header & Overall Animated Progress Bar */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-100">
                Task Agent Autonomous Pipeline
              </h2>
              <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold rounded-full">
                Live State Flow
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Synchronized real-time orchestration across Planning, Executing, and Completed pipelines.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateCycle}
              disabled={isSimulating}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shadow-md ${
                isSimulating
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/10'
              }`}
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Simulating Agent Cycles...' : 'Simulate Execution Cycle'}</span>
            </button>

            <button
              onClick={() => setShowNewTaskModal(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Global Pipeline Progress Bar */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Overall Workflow Completion:</span>
              <strong className="text-amber-400 text-sm font-bold">{overallProgress}%</strong>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Planning: {planningTasks.length}
              </span>
              <span className="flex items-center gap-1 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Executing: {executingTasks.length}
              </span>
              <span className="flex items-center gap-1 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Completed: {completedTasks.length}
              </span>
            </div>
          </div>

          {/* Master Animated Progress Meter */}
          <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
            <div
              style={{ width: `${overallProgress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 transition-all duration-700 ease-out shadow-lg relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title, agent or tags..."
            className="bg-transparent text-slate-200 placeholder-slate-500 outline-none w-full text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Priority:</span>
          {['All', 'Urgent', 'High', 'Medium', 'Low'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
                filterPriority === p
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Pipeline Columns (Planning | Executing | Completed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Planning */}
        <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                  1. Planning
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold">
                {planningTasks.length} Tasks
              </span>
            </div>

            {/* Stage Progress Bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{ width: `${totalTasks > 0 ? (planningTasks.length / totalTasks) * 100 : 0}%` }}
                className="h-full bg-amber-400 transition-all duration-500"
              />
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto min-h-[220px]">
            {filteredTasks.filter(t => t.stage === 'Planning').length === 0 ? (
              <div className="h-32 border-2 border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-slate-600 text-xs text-center p-4">
                No tasks currently in planning stage.
              </div>
            ) : (
              filteredTasks.filter(t => t.stage === 'Planning').map(task => (
                <div
                  key={task.id}
                  className="p-4 bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-xl space-y-3 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-100 leading-snug">
                      {task.title}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] rounded uppercase border shrink-0 ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {task.description}
                  </p>

                  {/* Task Animated Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Assigned: <strong className="text-amber-400">@{task.assignedAgent}</strong></span>
                      <span className="text-amber-400">{task.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${task.progressPercent}%` }}
                        className="h-full bg-amber-400 transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Move Control */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{task.createdAt}</span>
                    <button
                      onClick={() => handleMoveTask(task.id, 'Executing')}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                    >
                      <span>Start Executing</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Executing */}
        <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                  2. Executing
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full text-[10px] font-bold">
                {executingTasks.length} Active Runs
              </span>
            </div>

            {/* Stage Progress Bar with Animated Pulse */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{ width: `${totalTasks > 0 ? (executingTasks.length / totalTasks) * 100 : 0}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500 animate-pulse transition-all duration-500"
              />
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto min-h-[220px]">
            {filteredTasks.filter(t => t.stage === 'Executing').length === 0 ? (
              <div className="h-32 border-2 border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-slate-600 text-xs text-center p-4">
                No tasks actively executing in the queue.
              </div>
            ) : (
              filteredTasks.filter(t => t.stage === 'Executing').map(task => (
                <div
                  key={task.id}
                  className="p-4 bg-slate-950 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl space-y-3 transition-all shadow-md shadow-cyan-500/5 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-cyan-200 leading-snug">
                      {task.title}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] rounded uppercase border shrink-0 ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {task.description}
                  </p>

                  {/* Task Animated Progress Bar with Glowing Pulse */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-cyan-400 animate-spin" />
                        <span>@{task.assignedAgent}</span>
                      </span>
                      <span className="font-bold text-cyan-300">{task.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800 p-0.5">
                      <div
                        style={{ width: `${task.progressPercent}%` }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 rounded-full transition-all duration-300 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Move Controls: Backward to Planning or Forward to Completed */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                    <button
                      onClick={() => handleMoveTask(task.id, 'Planning')}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-[10px] flex items-center gap-1"
                      title="Replan task"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Replan</span>
                    </button>

                    <button
                      onClick={() => handleMoveTask(task.id, 'Completed')}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-md shadow-emerald-500/10"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Complete Task</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                  3. Completed
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                {completedTasks.length} Delivered
              </span>
            </div>

            {/* Stage Progress Bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{ width: `${totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0}%` }}
                className="h-full bg-emerald-500 transition-all duration-500"
              />
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto min-h-[220px]">
            {filteredTasks.filter(t => t.stage === 'Completed').length === 0 ? (
              <div className="h-32 border-2 border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-slate-600 text-xs text-center p-4">
                No completed tasks yet.
              </div>
            ) : (
              filteredTasks.filter(t => t.stage === 'Completed').map(task => (
                <div
                  key={task.id}
                  className="p-4 bg-slate-950/80 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl space-y-3 transition-all group opacity-90 hover:opacity-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-200 line-through text-slate-400 leading-snug">
                      {task.title}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 font-bold rounded uppercase border border-emerald-500/30 shrink-0">
                      Delivered
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                    {task.description}
                  </p>

                  {/* 100% Solid Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-emerald-400">
                      <span>Executed by @{task.assignedAgent}</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-emerald-500" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                    <button
                      onClick={() => handleMoveTask(task.id, 'Executing')}
                      className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Re-open</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-[10px] text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors"
                      title="Delete task record"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Task Creation Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Create New Task Assignment</span>
              </h3>
              <button onClick={() => setShowNewTaskModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement real-time Redis PubSub message bridge"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">Description</label>
                <textarea
                  rows={2}
                  placeholder="Execution details and deliverables expected from sub-agent..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Assigned Specialist Agent</label>
                  <select
                    value={newTaskAgent}
                    onChange={(e) => setNewTaskAgent(e.target.value as AgentId)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none"
                  >
                    <option value="task">@task (Task Agent)</option>
                    <option value="builder">@builder (Builder Agent)</option>
                    <option value="research">@research (Research Agent)</option>
                    <option value="analytics">@analytics (Analytics Agent)</option>
                    <option value="communications">@communications (Comms Agent)</option>
                    <option value="knowledge">@knowledge (Knowledge Agent)</option>
                    <option value="github">@github (GitHub Agent)</option>
                    <option value="database">@database (Database Agent)</option>
                    <option value="security">@security (Security Agent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Core, Pipeline, Database"
                  value={newTaskTags}
                  onChange={(e) => setNewTaskTags(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition-all shadow-md shadow-amber-500/10"
                >
                  Deploy Task to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
