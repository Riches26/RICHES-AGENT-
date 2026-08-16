import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Mic, 
  ShieldAlert, 
  Cpu, 
  Activity, 
  ArrowLeft, 
  Menu, 
  X,
  MessageSquare, 
  Users, 
  GitGraph, 
  BarChart3, 
  Package, 
  Database, 
  Code, 
  Sparkles, 
  Zap,
  ChevronDown,
  Layers,
  Terminal,
  Volume2,
  VolumeX,
  Info,
  CheckCircle2,
  Radio,
  Search,
  Command,
  FileCode,
  ListTodo
} from 'lucide-react';
import { AgentInfo, TaskItem, RecentFile } from '../types';
import { GlobalSearchModal } from './GlobalSearchModal';
import { fetchRecentFiles, fetchTasks } from '../services/api';
import { taskSyncService } from '../services/taskSyncService';

interface HeaderProps {
  activeView: string;
  setActiveView?: (view: string) => void;
  onNavigate?: (view: string) => void;
  pendingApprovalsCount?: number;
  isListeningWakeWord?: boolean;
  setIsListeningWakeWord?: (listening: boolean) => void;
  activeAgentsCount?: number;
  apiLatencyMs?: number;
  onBack?: () => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  agents?: AgentInfo[];
  tasks?: any[];
  files?: RecentFile[];
  onSelectSandboxCode?: (code: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onNavigate,
  pendingApprovalsCount = 0,
  isListeningWakeWord = false,
  setIsListeningWakeWord = (_val: boolean) => {},
  activeAgentsCount = 15,
  apiLatencyMs = 42,
  onBack,
  onGoBack,
  canGoBack = false,
  agents = [],
  tasks: propTasks,
  files: propFiles,
  onSelectSandboxCode
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStatsOpen, setSystemStatsOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(propFiles || []);
  const [syncedTasks, setSyncedTasks] = useState<any[]>(propTasks || taskSyncService.getTasks());

  const handleNav = onNavigate || setActiveView || (() => {});
  const handleBack = onGoBack || onBack;

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch recent files and tasks for search indexing
  useEffect(() => {
    if (!propFiles || propFiles.length === 0) {
      fetchRecentFiles().then(files => {
        if (files && files.length > 0) setRecentFiles(files);
      }).catch(console.warn);
    }
  }, [propFiles]);

  useEffect(() => {
    if (!propTasks || propTasks.length === 0) {
      fetchTasks().then(dbTasks => {
        if (dbTasks && dbTasks.length > 0) {
          setSyncedTasks(dbTasks);
        } else {
          setSyncedTasks(taskSyncService.getTasks());
        }
      }).catch(() => {
        setSyncedTasks(taskSyncService.getTasks());
      });
    }
  }, [propTasks]);

  const navCategories = [
    {
      group: 'Core Orchestration',
      items: [
        { id: 'workspace', label: 'Orchestrator Workspace', icon: MessageSquare, badge: 'Main', desc: 'Chat & multi-agent intent routing' },
        { id: 'jarvis', label: 'JARVIS Autonomous OS', icon: Zap, badge: 'Auto', desc: 'Continuous governed self-executing agent' },
        { id: 'google_workspace', label: 'Google Workspace Hub', icon: Sparkles, badge: 'OAuth', desc: 'Gmail, Calendar, Drive, Tasks & Chat' }
      ]
    },
    {
      group: 'Autonomous Development',
      items: [
        { id: 'agents', label: 'Specialist Agents (15)', icon: Users, desc: '15 specialist agents on event bus' },
        { id: 'planner', label: 'Planner & DAG Graph', icon: GitGraph, desc: 'Dynamic task decomposition graph' },
        { id: 'builder', label: 'Builder Sandbox', icon: Code, badge: 'Live', desc: 'Autonomous full-stack app generation' }
      ]
    },
    {
      group: 'Intelligence & Management',
      items: [
        { id: 'analytics', label: 'Observability & Analytics', icon: BarChart3, desc: 'Telemetry, latency & token meters' },
        { id: 'plugins', label: 'Plugin & Tool Store', icon: Package, desc: 'Dynamic tool registry & integrations' },
        { id: 'memory', label: 'Memory & Knowledge RAG', icon: Database, desc: 'Working, session & vector memory' },
        { id: 'voice', label: 'Voice & Wake Word Studio', icon: Mic, desc: 'Speech-to-text & voice synthesis' },
        { id: 'security', label: 'Security & Approvals', icon: ShieldAlert, alertCount: pendingApprovalsCount, desc: 'Human-in-the-loop governance' }
      ]
    }
  ];

  // Flat nav list for quick lookup
  const allNavItems = navCategories.flatMap(c => c.items);
  const activeNavItem = allNavItems.find(item => item.id === activeView) || allNavItems[0];

  const handleSelectNav = (id: string) => {
    handleNav(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Global Search & Inspector Overlay */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        agents={agents}
        tasks={syncedTasks}
        files={recentFiles}
        onNavigate={handleNav}
        onSelectSandboxCode={onSelectSandboxCode}
      />

      <header className="h-16 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-xl px-3 sm:px-5 md:px-6 flex items-center justify-between sticky top-0 z-40 text-slate-100 select-none shadow-sm gap-3">
        {/* Left Section: Brand & Navigation Context */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 shrink-0">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-xl border transition-all flex items-center justify-center min-w-[40px] min-h-[40px] ${
              mobileMenuOpen 
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20' 
                : 'bg-slate-900 text-slate-300 hover:text-amber-400 border-slate-800 hover:border-slate-700'
            }`}
            title="Toggle OS Navigation Menu"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Back Button if in subview */}
          {canGoBack && handleBack && (
            <button
              onClick={handleBack}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5 text-xs font-mono font-bold shadow-sm shrink-0 min-h-[40px]"
              title="Navigate back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          {/* Logo Badge & Title */}
          <div 
            onClick={() => handleSelectNav('workspace')} 
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-[1.5px] shadow-md shadow-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-base font-mono tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  RICHES
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded uppercase tracking-wider hidden xs:inline-block">
                  OS v3.7
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-sans truncate max-w-[110px] sm:max-w-[160px] md:max-w-none">
                {activeNavItem.label}
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Global Search Input & Quick Trigger */}
        <div className="flex-1 max-w-md mx-1 sm:mx-3 min-w-0">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 sm:py-2 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-mono transition-all shadow-inner group"
            title="Search active agents, tasks, and recent files (⌘K / Ctrl+K)"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">
                Search agents, tasks, files...
              </span>
            </div>
            
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-950 border border-slate-800 text-slate-400 rounded">
                ⌘K
              </kbd>
            </div>
          </button>
        </div>

        {/* Right Section: Telemetry & Interactive Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Live System Status Bar (Desktop Large) */}
          <div className="hidden xl:flex items-center gap-2.5 bg-slate-900/90 border border-slate-800/90 px-3 py-1.5 rounded-full text-xs font-mono shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium text-[11px]">Online</span>
            </div>

            <div className="h-3 w-px bg-slate-800" />

            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <Cpu className="w-3 h-3 text-amber-400" />
              <span>{activeAgentsCount} Agents</span>
            </div>

            <div className="h-3 w-px bg-slate-800" />

            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>{apiLatencyMs}ms</span>
            </div>
          </div>

          {/* Wake Word Detection Button */}
          <button
            onClick={() => setIsListeningWakeWord(!isListeningWakeWord)}
            className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-all border min-h-[40px] ${
              isListeningWakeWord
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10 animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="Voice Wake Word Detection: say 'Riches'"
            aria-label="Wake Word toggle"
          >
            {isListeningWakeWord ? (
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">Wake Word</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
              isListeningWakeWord ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {isListeningWakeWord ? 'Active' : 'Off'}
            </span>
          </button>

          {/* Security & Human-in-the-Loop Approvals Button */}
          <button
            onClick={() => handleSelectNav('security')}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl relative transition-all border flex items-center gap-1.5 text-xs font-mono min-h-[40px] ${
              pendingApprovalsCount > 0
                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse shadow-md shadow-red-500/10'
                : activeView === 'security'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Security Approvals Queue (Human-in-the-loop)"
            aria-label="Security Approvals"
          >
            <ShieldAlert className={`w-4 h-4 ${pendingApprovalsCount > 0 ? 'text-red-400' : 'text-slate-400'}`} />
            <span className="hidden md:inline">Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center font-mono shadow-sm">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Telemetry Quick Popover */}
      {systemStatsOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-300 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>System: <strong className="text-emerald-400">Online</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Agents: <strong className="text-slate-100">{activeAgentsCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Latency: <strong className="text-slate-100">{apiLatencyMs}ms</strong></span>
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between overflow-y-auto animate-in fade-in duration-150">
          <div className="p-4 sm:p-5 space-y-5">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  RICHES OS Modules
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                11 Integrated Modules
              </span>
            </div>

            {/* Categorized Nav Grid */}
            <div className="space-y-4">
              {navCategories.map((category, catIdx) => (
                <div key={catIdx} className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400/80 px-1">
                    {category.group}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectNav(item.id)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all border text-left ${
                            isActive
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold shadow-md shadow-amber-500/5'
                              : 'bg-slate-900/80 text-slate-200 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-xl border shrink-0 ${
                              isActive 
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium truncate block">{item.label}</span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.desc && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                              )}
                            </div>
                          </div>

                          {item.alertCount !== undefined && item.alertCount > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-500 text-white rounded-full shrink-0 ml-2 animate-pulse">
                              {item.alertCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Telemetry & Quick Action Bar inside Drawer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Supervisor Event Bus Active</span>
            </div>
            <span className="text-[11px] text-slate-500">Gemini 3.7 Flash</span>
          </div>
        </div>
      )}
    </>
  );
};
