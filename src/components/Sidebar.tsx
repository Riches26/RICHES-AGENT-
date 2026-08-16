import React from 'react';
import { 
  MessageSquare, 
  Users, 
  GitGraph, 
  BarChart3, 
  Package, 
  Database, 
  Code, 
  Mic, 
  ShieldCheck,
  Terminal,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView?: (view: string) => void;
  onNavigate?: (view: string) => void;
  pendingApprovalsCount?: number;
  approvalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  onNavigate,
  pendingApprovalsCount = 0,
  approvalsCount
}) => {
  const handleNav = onNavigate || setActiveView || (() => {});
  const alertsTotal = pendingApprovalsCount ?? approvalsCount ?? 0;
  const navItems = [
    { id: 'workspace', label: 'Orchestrator Workspace', icon: MessageSquare, badge: 'Main' },
    { id: 'jarvis', label: 'JARVIS Autonomous OS', icon: Zap, badge: 'Auto' },
    { id: 'google_workspace', label: 'Google Workspace', icon: Sparkles, badge: 'OAuth' },
    { id: 'agents', label: 'Specialist Agents (15)', icon: Users },
    { id: 'planner', label: 'Planner & DAG Graph', icon: GitGraph },
    { id: 'builder', label: 'Builder Sandbox', icon: Code, badge: 'Live' },
    { id: 'analytics', label: 'Observability & Analytics', icon: BarChart3 },
    { id: 'plugins', label: 'Plugin & Tool Store', icon: Package },
    { id: 'memory', label: 'Memory & Knowledge RAG', icon: Database },
    { id: 'voice', label: 'Voice & Wake Word Studio', icon: Mic },
    { id: 'security', label: 'Security & Approvals', icon: ShieldCheck, alertCount: alertsTotal }
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-900/60 flex flex-col justify-between p-3 shrink-0 hidden md:flex">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-500" />
          <span>OS Modules</span>
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 shadow-md shadow-amber-500/5'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 rounded">
                  {item.badge}
                </span>
              )}
              {item.alertCount !== undefined && item.alertCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-red-500/80 text-white rounded-full animate-pulse">
                  {item.alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer OS Card */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2">
        <div className="flex items-center gap-2 text-slate-300 font-mono font-semibold">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>Agent Bus Engine</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Event-driven architecture with Supervisor Pattern, Model Router, & RAG context.
        </p>
      </div>
    </aside>
  );
};
