import React, { useState } from 'react';
import { 
  Users, 
  Cpu, 
  Wrench, 
  CheckCircle2, 
  Terminal, 
  Play, 
  Settings, 
  Sparkles, 
  ShieldCheck, 
  Search,
  ChevronRight,
  Activity,
  ListTodo,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AgentInfo } from '../types';
import { AgentHealthWidget } from './AgentHealthWidget';
import { TaskAgentWorkspace } from './TaskAgentWorkspace';

interface AgentCommandCenterProps {
  agents?: AgentInfo[];
  onTriggerAgentTest?: (agentId: string) => void;
}

export const AgentCommandCenter: React.FC<AgentCommandCenterProps> = ({
  agents = [],
  onTriggerAgentTest
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('task');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'task_pipeline'>('task_pipeline');

  const fallbackAgent: AgentInfo = {
    id: 'task',
    name: 'Task Coordinator',
    role: 'Autonomous Task Manager',
    description: 'Manages task queues, prioritizations, reminders, and recurring cron jobs.',
    category: 'core',
    state: 'IDLE',
    icon: 'ListTodo',
    color: 'emerald',
    tools: ['task_create', 'task_edit', 'task_schedule'],
    permissions: ['task:manage'],
    systemPrompt: 'You are the Task Coordinator agent.',
    tasksCompleted: 85,
    lastActive: 'Just now'
  };

  const selectedAgent = (agents || []).find(a => a.id === selectedAgentId) || (agents && agents[0]) || fallbackAgent;

  const filteredAgents = (agents || []).filter(a => {
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (state: string, isCompact: boolean = true) => {
    const isProcessing = state === 'EXECUTING' || state === 'THINKING';
    
    let style = 'bg-slate-800 text-slate-400 border-slate-700';
    let dotColor = 'bg-slate-500';

    if (isProcessing) {
      style = 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10 animate-agent-pulse';
      dotColor = 'bg-amber-400';
    } else if (state === 'COMPLETED' || state === 'IDLE') {
      style = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      dotColor = 'bg-emerald-400';
    } else if (state === 'WAITING') {
      style = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      dotColor = 'bg-blue-400';
    }

    return (
      <span className={`inline-flex items-center ${isCompact ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-xs'} font-mono font-bold uppercase rounded-lg border transition-all ${style}`}>
        {isProcessing ? (
          <span className="relative flex h-2 w-2 mr-1.5 shrink-0">
            <span className="animate-beacon-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1.5 shrink-0`} />
        )}
        <span>{state}</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-950 overflow-hidden font-mono">
      {/* Left List Pane */}
      <div className="w-full md:w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col h-1/3 md:h-full shrink-0">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Specialist Agents ({agents.length})</span>
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 text-amber-400 rounded border border-amber-500/30">
              Live Mesh
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter agents by role/name..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {['all', 'core', 'specialist'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  filterCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Agents List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredAgents.map((agent) => {
            const isSelected = agent.id === selectedAgentId;
            return (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  if (agent.id === 'task') {
                    setActiveTab('task_pipeline');
                  }
                }}
                className={`w-full text-left p-3 rounded-xl transition-all border ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/5'
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                    <span>{agent.name}</span>
                    {agent.id === 'task' && (
                      <span className="px-1.5 py-0.2 text-[8px] bg-amber-500/20 text-amber-300 rounded font-bold">
                        Pipeline
                      </span>
                    )}
                  </span>
                  {getStatusBadge(agent.state, true)}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{agent.role}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Tasks: {agent.tasksCompleted}</span>
                  <span>{agent.lastActive}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Details / Task Pipeline View */}
      <div className="flex-1 flex flex-col h-2/3 md:h-full bg-slate-950 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* View Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('task_pipeline')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                activeTab === 'task_pipeline'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-slate-100'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Task Agent Pipeline & Progress Bars</span>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                activeTab === 'details'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-slate-100'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{selectedAgent?.name} Directives & Tools</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500">
            Supervisor Event Bus Linked
          </span>
        </div>

        {/* Task Pipeline View */}
        {activeTab === 'task_pipeline' && (
          <TaskAgentWorkspace />
        )}

        {/* Individual Agent Details View */}
        {activeTab === 'details' && selectedAgent && (
          <div className="space-y-6">
            {/* Real-time Agent Health Telemetry Widget */}
            <AgentHealthWidget agents={agents} />

            {/* Header Banner */}
            <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl bg-gradient-to-tr ${selectedAgent.color} text-white shadow-lg`}>
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-100">{selectedAgent.name}</h1>
                    <p className="text-xs text-amber-400 font-mono">{selectedAgent.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedAgent.state, false)}
                  {onTriggerAgentTest && (
                    <button
                      onClick={() => onTriggerAgentTest(selectedAgent.id)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute Test Run</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedAgent.description}
              </p>
            </div>

            {/* Database & Execution Permissions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Granted Database & Execution Permissions ({selectedAgent.permissions?.length || 0})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {(selectedAgent.permissions || ['database:read', 'database:write', 'system:execute']).map((perm, idx) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{perm}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Tools Inventory */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Available Tool Call Capabilities ({selectedAgent.tools.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {selectedAgent.tools.map((tool, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-200">{tool}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* System Prompt & Execution Contract */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Agent System Directive & Contract</span>
              </h3>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                <p className="text-amber-400/80 italic">// System Directive</p>
                <p className="leading-relaxed text-slate-200">
                  {selectedAgent.systemPrompt}
                </p>
              </div>
            </div>

            {/* Sub-Agent Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Total Executions</span>
                <p className="text-base font-bold text-amber-400">{selectedAgent.tasksCompleted}</p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Success Reliability</span>
                <p className="text-base font-bold text-emerald-400">99.8%</p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Category</span>
                <p className="text-base font-bold text-slate-200 capitalize">{selectedAgent.category}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
