import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  Users, 
  ListTodo, 
  FileCode, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  Play, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  Filter,
  FileText,
  Code
} from 'lucide-react';
import { AgentInfo, TaskItem, RecentFile, GlobalSearchCategory, GlobalSearchResult } from '../types';
import { eventBus } from '../services/eventBus';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentInfo[];
  tasks: any[];
  files: RecentFile[];
  onNavigate?: (view: string) => void;
  onSelectSandboxCode?: (code: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  agents = [],
  tasks = [],
  files = [],
  onNavigate,
  onSelectSandboxCode
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GlobalSearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<GlobalSearchResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTaskProgress, setActiveTaskProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setCopiedCode(false);
    } else {
      setQuery('');
      setSelectedItem(null);
    }
  }, [isOpen]);

  // Combine and format all items into searchable structures
  const allResults: GlobalSearchResult[] = useMemo(() => {
    const results: GlobalSearchResult[] = [];

    // 1. Agents
    agents.forEach(agent => {
      const isExecuting = agent.state === 'EXECUTING' || agent.state === 'THINKING';
      results.push({
        id: `agent-${agent.id}`,
        type: 'agent',
        title: agent.name,
        subtitle: agent.role,
        category: agent.category,
        badge: agent.state,
        badgeColor: isExecuting 
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-agent-pulse' 
          : agent.state === 'COMPLETED' || agent.state === 'IDLE'
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        details: agent.description,
        icon: 'Cpu',
        agentData: agent
      });
    });

    // 2. Tasks
    tasks.forEach((task: any) => {
      const stage = task.stage || (task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'Executing' : 'Planning');
      const priority = task.priority || 'Medium';
      results.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        subtitle: task.description || `Assigned to @${task.assignedAgent || 'task'}`,
        category: task.assignedAgent || 'general',
        badge: stage,
        badgeColor: stage === 'Completed' 
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
          : stage === 'Executing'
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        details: task.description,
        icon: 'ListTodo',
        taskData: task
      });
    });

    // 3. Files
    files.forEach(file => {
      results.push({
        id: `file-${file.id || file.path}`,
        type: 'file',
        title: file.name,
        subtitle: file.path,
        category: file.language,
        badge: file.language.toUpperCase(),
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        details: file.contentSnippet || `${file.size} • ${file.lineCount || 0} lines`,
        icon: 'FileCode',
        fileData: file
      });
    });

    return results;
  }, [agents, tasks, files]);

  // Filter based on active query & category
  const filteredResults = useMemo(() => {
    let list = allResults;
    if (category !== 'all') {
      const typeMap: Record<string, string> = {
        agents: 'agent',
        tasks: 'task',
        files: 'file'
      };
      list = list.filter(item => item.type === typeMap[category]);
    }

    if (!query.trim()) return list;

    const q = query.toLowerCase();
    return list.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = item.subtitle.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchDet = item.details?.toLowerCase().includes(q);
      const matchTools = item.agentData?.tools?.some(t => t.toLowerCase().includes(q));
      const matchTags = (item.taskData?.tags as string[])?.some(t => t.toLowerCase().includes(q));

      return matchTitle || matchSub || matchCat || matchDet || matchTools || matchTags;
    });
  }, [allResults, category, query]);

  // Set default selected item
  useEffect(() => {
    if (filteredResults.length > 0) {
      setSelectedItem(filteredResults[0]);
      setSelectedIndex(0);
    } else {
      setSelectedItem(null);
    }
  }, [filteredResults]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        const next = (selectedIndex + 1) % filteredResults.length;
        setSelectedIndex(next);
        setSelectedItem(filteredResults[next]);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredResults.length > 0) {
        const prev = (selectedIndex - 1 + filteredResults.length) % filteredResults.length;
        setSelectedIndex(prev);
        setSelectedItem(filteredResults[prev]);
      }
    }
  };

  const handleCopyFileContent = (content?: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTaskStatusToggle = (task: any, newStage: string) => {
    const progress = newStage === 'Completed' ? 100 : newStage === 'Executing' ? 65 : 20;
    setActiveTaskProgress(progress);
    eventBus.emit('task:updated', {
      taskId: task.id,
      title: task.title,
      description: task.description,
      assignedAgent: task.assignedAgent,
      priority: task.priority,
      stage: newStage,
      progressPercent: progress,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  if (!isOpen) return null;

  const agentCount = allResults.filter(r => r.type === 'agent').length;
  const taskCount = allResults.filter(r => r.type === 'task').length;
  const fileCount = allResults.filter(r => r.type === 'file').length;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 md:p-10 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-100 font-sans"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Input Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
            <Search className="w-5 h-5" />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search active agents, tasks, recent files..."
              className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
            />
          </div>

          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 shrink-0 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Category Filters Bar */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between gap-2 overflow-x-auto text-xs font-mono">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setCategory('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                category === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All ({allResults.length})
            </button>

            <button
              onClick={() => setCategory('agents')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                category === 'agents'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Agents ({agentCount})</span>
            </button>

            <button
              onClick={() => setCategory('tasks')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                category === 'tasks'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Tasks ({taskCount})</span>
            </button>

            <button
              onClick={() => setCategory('files')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                category === 'files'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Files ({fileCount})</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            {filteredResults.length} matches found
          </span>
        </div>

        {/* Split Results & Non-Disruptive Inline Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[380px]">
          {/* Left Results List */}
          <div className="w-full md:w-1/2 border-r border-slate-800 overflow-y-auto p-2.5 space-y-1.5">
            {filteredResults.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Search className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
                <p className="text-sm font-medium">No results found for "{query}"</p>
                <p className="text-xs">Try searching for an agent role, task topic, or file name.</p>
              </div>
            ) : (
              filteredResults.map((item, idx) => {
                const isSelected = selectedItem?.id === item.id;
                const isExecuting = item.agentData?.state === 'EXECUTING' || item.agentData?.state === 'THINKING';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedIndex(idx);
                      setSelectedItem(item);
                    }}
                    className={`p-3 rounded-xl cursor-pointer border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/5'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg border shrink-0 ${
                        item.type === 'agent' 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                          : item.type === 'task'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                      }`}>
                        {item.type === 'agent' && <Cpu className="w-4 h-4" />}
                        {item.type === 'task' && <ListTodo className="w-4 h-4" />}
                        {item.type === 'file' && <FileCode className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100 truncate block">
                            {item.title}
                          </span>
                          {isExecuting && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-beacon-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border shrink-0 ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Non-Disruptive Inspector Preview Pane */}
          <div className="w-full md:w-1/2 bg-slate-950/60 overflow-y-auto p-4 md:p-5 flex flex-col justify-between">
            {selectedItem ? (
              <div className="space-y-4">
                {/* Header of Inspector */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {selectedItem.type.toUpperCase()}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 font-mono">
                        {selectedItem.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {selectedItem.subtitle}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border shrink-0 ${selectedItem.badgeColor}`}>
                    {selectedItem.badge}
                  </span>
                </div>

                {/* AGENT INSPECTOR */}
                {selectedItem.type === 'agent' && selectedItem.agentData && (
                  <div className="space-y-3.5 text-xs font-mono">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Agent Role & Scope</span>
                      <p className="text-slate-300 font-sans leading-relaxed">
                        {selectedItem.agentData.description}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Registered Tools ({selectedItem.agentData.tools?.length || 0})</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedItem.agentData.tools || []).map((tool, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-900 text-amber-300 border border-slate-800 rounded text-[10px]">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Database & System Permissions</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedItem.agentData.permissions || []).map((perm, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px]">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedItem.agentData.systemPrompt && (
                      <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono">
                        <span className="text-[10px] text-slate-500 block mb-1 uppercase font-bold">System Directive:</span>
                        <p className="line-clamp-3 text-slate-300">{selectedItem.agentData.systemPrompt}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TASK INSPECTOR */}
                {selectedItem.type === 'task' && selectedItem.taskData && (
                  <div className="space-y-3.5 text-xs font-mono">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Execution Progress:</span>
                        <strong className="text-amber-400">
                          {activeTaskProgress !== null ? activeTaskProgress : (selectedItem.taskData.progressPercent || (selectedItem.taskData.stage === 'Completed' ? 100 : 50))}%
                        </strong>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
                          style={{ width: `${activeTaskProgress !== null ? activeTaskProgress : (selectedItem.taskData.progressPercent || (selectedItem.taskData.stage === 'Completed' ? 100 : 50))}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Task Goal</span>
                      <p className="text-slate-300 font-sans leading-relaxed">
                        {selectedItem.taskData.description || selectedItem.taskData.title}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick Stage Switcher:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['Planning', 'Executing', 'Completed'].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleTaskStatusToggle(selectedItem.taskData, st)}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                              (selectedItem.taskData.stage || 'Executing') === st
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedItem.taskData.output && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px]">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Execution Output:</span>
                        {selectedItem.taskData.output}
                      </div>
                    )}
                  </div>
                )}

                {/* FILE INSPECTOR */}
                {selectedItem.type === 'file' && selectedItem.fileData && (
                  <div className="space-y-3 text-xs font-mono">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Path: <strong className="text-slate-200">{selectedItem.fileData.path}</strong></span>
                      <span>{selectedItem.fileData.lineCount || 0} lines ({selectedItem.fileData.size})</span>
                    </div>

                    <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-52 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed">
                      <pre className="whitespace-pre-wrap break-words">
                        {selectedItem.fileData.content || selectedItem.fileData.contentSnippet}
                      </pre>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyFileContent(selectedItem.fileData?.content)}
                        className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center gap-1.5 text-xs text-slate-200 transition-colors"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedCode ? 'Copied to Clipboard' : 'Copy File Content'}</span>
                      </button>

                      {onSelectSandboxCode && (
                        <button
                          onClick={() => {
                            if (selectedItem.fileData?.content) {
                              onSelectSandboxCode(selectedItem.fileData.content);
                              onClose();
                            }
                          }}
                          className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1 text-xs transition-colors"
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>Load in Sandbox</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Optional Jump Button */}
                {onNavigate && (
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 text-[11px]">Filtered in current view</span>
                    <button
                      onClick={() => {
                        if (selectedItem.type === 'agent') onNavigate('agents');
                        else if (selectedItem.type === 'task') onNavigate('agents');
                        else if (selectedItem.type === 'file') onNavigate('builder');
                        onClose();
                      }}
                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline"
                    >
                      <span>Open in {selectedItem.type === 'file' ? 'Builder' : selectedItem.type === 'task' ? 'Tasks' : 'Agents'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select an item to view quick details
              </div>
            )}
          </div>
        </div>

        {/* Footer Shortcut Guide */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">ESC</kbd> Close</span>
          </div>
          <span>RICHES OS Search Mesh</span>
        </div>
      </div>
    </div>
  );
};
