import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Cpu, 
  Zap, 
  ShieldAlert, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Layers, 
  Activity, 
  Sparkles, 
  Radio, 
  Sliders, 
  Terminal, 
  Gauge, 
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Mic,
  FileCode,
  GitBranch
} from 'lucide-react';
import { AgentInfo, AgentState } from '../types';
import { publishEventBus, executeOSTool } from '../services/api';
import { JarvisEDAScriptStudio } from './JarvisEDAScriptStudio';
import { JarvisVoiceDeck } from './JarvisVoiceDeck';
import { JarvisSplitScreenDashboard } from './JarvisSplitScreenDashboard';
import { JarvisNodeStudio } from './JarvisNodeStudio';
import { JarvisConceptShowcase } from './JarvisConceptShowcase';

interface JarvisSubAgent {
  id: string;
  name: string;
  goal: string;
  authorityRequired: number; // 0 to 10
  status: 'running' | 'paused' | 'completed' | 'terminated';
  progressPercent: number;
  tokensUsed: number;
  loopCount: number;
  lastAction: string;
  startedAt: string;
  modelBackend: string;
}

export const JarvisAutonomousEngine: React.FC = () => {
  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<
    'split_dashboard' | 'node_studio' | 'autonomous_hub' | 'eda_studio' | 'voice_deck' | 'concept_gallery'
  >('split_dashboard');

  // Governed Autonomy Authority Level (0 = Strict Read-Only, 10 = Root Autonomous Execution)
  const [authorityLevel, setAuthorityLevel] = useState<number>(7);
  const [emergencyStopActive, setEmergencyStopActive] = useState<boolean>(false);
  const [selectedBackend, setSelectedBackend] = useState<string>('gemini-3.7-flash');

  // Autonomous Sub-Agents
  const [subAgents, setSubAgents] = useState<JarvisSubAgent[]>([
    {
      id: 'jarvis-sub-1',
      name: 'Code-Security-Scanner',
      goal: 'Continuous static vulnerability check & automated AST dependency auditing',
      authorityRequired: 4,
      status: 'running',
      progressPercent: 68,
      tokensUsed: 14200,
      loopCount: 12,
      lastAction: 'Scanned 14 files, 0 high-risk vulnerabilities detected',
      startedAt: '18:10:12',
      modelBackend: 'gemini-3.7-flash'
    },
    {
      id: 'jarvis-sub-2',
      name: 'Market-Trend-Synthesizer',
      goal: 'Gathering real-time tech news and updating RAG vector knowledge base',
      authorityRequired: 2,
      status: 'running',
      progressPercent: 42,
      tokensUsed: 8900,
      loopCount: 5,
      lastAction: 'Vector indexed 3 research papers on Multi-Agent Systems',
      startedAt: '18:15:00',
      modelBackend: 'deepseek-r1'
    },
    {
      id: 'jarvis-sub-3',
      name: 'Autonomous-DB-Optimizer',
      goal: 'Analyze index usage and optimize slow Firestore query paths',
      authorityRequired: 8,
      status: 'paused',
      progressPercent: 90,
      tokensUsed: 31000,
      loopCount: 28,
      lastAction: 'Awaiting human security approval for index creation',
      startedAt: '17:45:22',
      modelBackend: 'gpt-4o'
    }
  ]);

  // Form state to spawn new sub-agent
  const [newSubName, setNewSubName] = useState('');
  const [newSubGoal, setNewSubGoal] = useState('');
  const [newSubAuthority, setNewSubAuthority] = useState<number>(5);
  const [showSpawnModal, setShowSpawnModal] = useState(false);

  // Live simulation ticker for running sub-agents
  useEffect(() => {
    if (emergencyStopActive) return;

    const timer = setInterval(() => {
      setSubAgents(prev => prev.map(sub => {
        if (sub.status !== 'running') return sub;

        const nextProgress = sub.progressPercent >= 100 ? 100 : sub.progressPercent + Math.floor(Math.random() * 6) + 1;
        const isFinished = nextProgress >= 100;

        return {
          ...sub,
          progressPercent: nextProgress,
          tokensUsed: sub.tokensUsed + Math.floor(Math.random() * 150) + 20,
          loopCount: sub.loopCount + 1,
          status: isFinished ? 'completed' : 'running',
          lastAction: isFinished
            ? 'Goal completed successfully. Output committed to RAG memory.'
            : `Loop #${sub.loopCount + 1}: Executing autonomous sub-task reasoning cycle...`
        };
      }));
    }, 3000);

    return () => clearInterval(timer);
  }, [emergencyStopActive]);

  // Trigger Emergency Stop / System Override Switch
  const handleEmergencyKillSwitch = async () => {
    const nextState = !emergencyStopActive;
    setEmergencyStopActive(nextState);

    if (nextState) {
      // Pause all subagents
      setSubAgents(prev => prev.map(s => ({
        ...s,
        status: s.status === 'running' ? 'terminated' : s.status,
        lastAction: 'EMERGENCY STOP ACTIVATED: Process hard terminated by operator.'
      })));

      await publishEventBus('security.emergency_stop', 'jarvis_engine', {
        action: 'KILL_SWITCH_ENGAGED',
        authorityLevel,
        timestamp: new Date().toISOString()
      });
    } else {
      await publishEventBus('security.emergency_stop_reset', 'jarvis_engine', {
        action: 'KILL_SWITCH_DISENGAGED',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Spawn a new autonomous sub-agent
  const handleSpawnSubAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubGoal.trim()) return;

    const newAgent: JarvisSubAgent = {
      id: `jarvis-sub-${Date.now()}`,
      name: newSubName.trim().replace(/\s+/g, '-'),
      goal: newSubGoal.trim(),
      authorityRequired: newSubAuthority,
      status: emergencyStopActive ? 'paused' : 'running',
      progressPercent: 0,
      tokensUsed: 150,
      loopCount: 1,
      lastAction: 'Sub-agent spawned and initialized in container worker thread.',
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      modelBackend: selectedBackend
    };

    setSubAgents(prev => [newAgent, ...prev]);

    await publishEventBus('agent.spawned', 'jarvis_engine', {
      subAgentId: newAgent.id,
      name: newAgent.name,
      goal: newAgent.goal,
      authorityRequired: newAgent.authorityRequired
    });

    setNewSubName('');
    setNewSubGoal('');
    setShowSpawnModal(false);
  };

  const handleToggleSubAgentStatus = (id: string) => {
    if (emergencyStopActive) return;
    setSubAgents(prev => prev.map(sub => {
      if (sub.id !== id) return sub;
      let nextStatus: 'running' | 'paused' | 'completed' | 'terminated' = 'running';
      if (sub.status === 'running') nextStatus = 'paused';
      else if (sub.status === 'paused') nextStatus = 'running';
      else if (sub.status === 'completed') nextStatus = 'running';

      return {
        ...sub,
        status: nextStatus,
        lastAction: nextStatus === 'running' ? 'Resumed execution loop...' : 'Paused by operator.'
      };
    }));
  };

  const handleTerminateSubAgent = (id: string) => {
    setSubAgents(prev => prev.map(sub => {
      if (sub.id !== id) return sub;
      return {
        ...sub,
        status: 'terminated',
        lastAction: 'Terminated by operator request.'
      };
    }));
  };

  const authorityLabels: Record<number, { title: string; desc: string; color: string }> = {
    0: { title: 'L0: Read-Only Strict', desc: 'No modifications, no file edits, no tool writes.', color: 'text-slate-400' },
    2: { title: 'L2: Informational & Research', desc: 'Web search, read DB, draft notes allowed.', color: 'text-blue-400' },
    5: { title: 'L5: Semi-Autonomous Assister', desc: 'File creation, code evaluation, preset automation.', color: 'text-amber-400' },
    8: { title: 'L8: High Autonomy Co-Founder', desc: 'Code commits, sub-agent spawning, API dispatch.', color: 'text-orange-400' },
    10: { title: 'L10: Unrestricted Root Autonomy', desc: 'Shell execution, DB migrations, automated deploy.', color: 'text-red-400' }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-5 rounded-2xl border border-amber-500/20 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide">JARVIS Autonomous Agent OS</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 uppercase">
                Governed Autonomy
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Open-source autonomous orchestration layer inspired by Stanford OpenJarvis, Cisco JARVIS MAS, & JARVIS OS.
            </p>
          </div>
        </div>

        {/* Emergency Kill Switch / System Override */}
        <button
          onClick={handleEmergencyKillSwitch}
          className={`px-5 py-2.5 rounded-xl font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
            emergencyStopActive
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 animate-pulse'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{emergencyStopActive ? 'DISENGAGE EMERGENCY STOP' : 'EMERGENCY OVERRIDE (KILL SWITCH)'}</span>
        </button>
      </div>

      {emergencyStopActive && (
        <div className="bg-red-950/80 border border-red-500/60 p-4 rounded-xl flex items-center gap-3 text-red-200 text-xs font-mono animate-bounce">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <strong className="font-bold text-red-300">EMERGENCY KILL SWITCH ENGAGED:</strong> All autonomous sub-agents and tool execution loops are hard-frozen. High-risk permissions locked.
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Layout A Desktop Split-Screen Dashboard */}
          <button
            onClick={() => setActiveSubTab('split_dashboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'split_dashboard'
                ? 'bg-[#66FCF1] text-[#0B0C10] shadow-md shadow-[#66FCF1]/20 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-[#0B0C10]" />
            <span>Layout A: Split-Screen Dashboard</span>
            <span className="px-1.5 py-0.2 bg-[#0B0C10]/20 rounded text-[9px] uppercase font-bold">
              Voice + Artifact
            </span>
          </button>

          {/* Tab 2: Layout B Agent Node Canvas Studio */}
          <button
            onClick={() => setActiveSubTab('node_studio')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'node_studio'
                ? 'bg-[#FFB037] text-slate-950 shadow-md shadow-[#FFB037]/20 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <GitBranch className="w-4 h-4 text-slate-950" />
            <span>Layout B: Agent Node Studio</span>
            <span className="px-1.5 py-0.2 bg-slate-950/20 rounded text-[9px] uppercase font-bold">
              DAG Flow
            </span>
          </button>

          {/* Tab 3: Autonomous Hub */}
          <button
            onClick={() => setActiveSubTab('autonomous_hub')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'autonomous_hub'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Co-Founder Hub</span>
            <span className="px-1.5 py-0.2 bg-slate-950/20 rounded text-[10px]">
              {subAgents.filter(s => s.status === 'running').length} Active
            </span>
          </button>

          {/* Tab 4: EDA Script Studio */}
          <button
            onClick={() => setActiveSubTab('eda_studio')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'eda_studio'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>EDA Script Studio</span>
            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[9px] uppercase">
              Paper Implementation
            </span>
          </button>

          {/* Tab 5: Voice Deck */}
          <button
            onClick={() => setActiveSubTab('voice_deck')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'voice_deck'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Mic className="w-4 h-4 text-amber-400" />
            <span>Voice & OS Deck</span>
          </button>

          {/* Tab 6: UI/UX Concept Gallery */}
          <button
            onClick={() => setActiveSubTab('concept_gallery')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'concept_gallery'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>8K UI Concepts</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 px-2">
          <Activity className="w-3.5 h-3.5 text-[#66FCF1] animate-pulse" />
          <span className="text-[11px] text-slate-300">Engine: Real-time Multi-Agent Loop</span>
        </div>
      </div>

      {/* Tab View Switcher */}
      {activeSubTab === 'split_dashboard' && (
        <div className="h-[740px] rounded-2xl overflow-hidden border border-[#66FCF1]/20 shadow-2xl">
          <JarvisSplitScreenDashboard />
        </div>
      )}

      {activeSubTab === 'node_studio' && (
        <div className="h-[740px] rounded-2xl overflow-hidden border border-[#66FCF1]/20 shadow-2xl">
          <JarvisNodeStudio />
        </div>
      )}

      {activeSubTab === 'eda_studio' && (
        <JarvisEDAScriptStudio />
      )}

      {activeSubTab === 'voice_deck' && (
        <JarvisVoiceDeck />
      )}

      {activeSubTab === 'concept_gallery' && (
        <JarvisConceptShowcase />
      )}

      {/* Tab: Autonomous Hub */}
      {activeSubTab === 'autonomous_hub' && (
        <>
          {/* Governed Autonomy Control Panel & Engine Backend Switcher */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Authority Level Slider (0-10 Scale) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-200 font-mono">Governed Autonomy Authority Scale (0 - 10)</h2>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30">
              Level {authorityLevel} / 10
            </span>
          </div>

          <div className="space-y-3">
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={authorityLevel}
              onChange={(e) => setAuthorityLevel(Number(e.target.value))}
              disabled={emergencyStopActive}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
            />

            <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center text-slate-400">
              <span className={authorityLevel <= 1 ? 'text-amber-400 font-bold' : ''}>L0: Read-Only</span>
              <span className={authorityLevel >= 2 && authorityLevel <= 4 ? 'text-amber-400 font-bold' : ''}>L3: Assistive</span>
              <span className={authorityLevel >= 5 && authorityLevel <= 7 ? 'text-amber-400 font-bold' : ''}>L5: Semi-Auto</span>
              <span className={authorityLevel >= 8 && authorityLevel <= 9 ? 'text-amber-400 font-bold' : ''}>L8: Co-Founder</span>
              <span className={authorityLevel === 10 ? 'text-red-400 font-bold' : ''}>L10: Unrestricted</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5 text-xs">
              <Radio className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-mono font-bold text-amber-300">
                  {authorityLabels[authorityLevel]?.title || `Level ${authorityLevel}: Custom Autonomy Tier`}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {authorityLabels[authorityLevel]?.desc || 'Sub-agents requiring authority > current level automatically halt for human operator approval.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Engine Backend Switcher & OpenJarvis Trace Meter */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-200 font-mono">Engine Router Backend</h2>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-mono text-slate-400">Primary Reasoning Model</label>
            <select
              value={selectedBackend}
              onChange={(e) => setSelectedBackend(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 font-mono focus:border-amber-500 outline-none"
            >
              <option value="gemini-3.7-flash">Gemini 3.7 Flash (Google DeepMind)</option>
              <option value="deepseek-r1">DeepSeek R1 Reasoning Model</option>
              <option value="gpt-4o">GPT-4o (OpenAI)</option>
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Anthropic)</option>
              <option value="ollama-local">Local Ollama Llama-3 (On-Device)</option>
            </select>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>FLOPs Throughput:</span>
                <span className="text-amber-300 font-bold">14.8 TFLOPs/s</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Energy/Cost Index:</span>
                <span className="text-emerald-400 font-bold">$0.0001 / 1K Tokens</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Trace Eval Predictability:</span>
                <span className="text-indigo-400 font-bold">98.4% (agentevals)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Autonomous Sub-Agent Thread Manager ("Co-Founder Engine") */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-200 font-mono">Active Autonomous Sub-Agents ({subAgents.length})</h2>
          </div>

          <button
            onClick={() => setShowSpawnModal(true)}
            disabled={emergencyStopActive}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>Spawn Autonomous Sub-Agent</span>
          </button>
        </div>

        {/* Sub-Agent Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subAgents.map((sub) => {
            const isBlocked = sub.authorityRequired > authorityLevel;
            return (
              <div
                key={sub.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                  sub.status === 'running'
                    ? 'bg-slate-950/90 border-amber-500/30 shadow-md shadow-amber-500/5'
                    : sub.status === 'paused'
                    ? 'bg-slate-950/50 border-slate-800 text-slate-400'
                    : sub.status === 'completed'
                    ? 'bg-slate-950/90 border-emerald-500/30 text-slate-300'
                    : 'bg-red-950/20 border-red-500/30 text-red-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className={`w-4 h-4 ${sub.status === 'running' ? 'text-amber-400 animate-spin' : 'text-slate-400'}`} />
                      <span className="font-mono font-bold text-xs text-slate-200">{sub.name}</span>
                    </div>

                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase ${
                      sub.status === 'running'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : sub.status === 'paused'
                        ? 'bg-slate-800 text-slate-400'
                        : sub.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2">
                    {sub.goal}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                    <span>Req. Authority: L{sub.authorityRequired}</span>
                    <span>Started: {sub.startedAt}</span>
                  </div>

                  {isBlocked && sub.status === 'running' && (
                    <div className="px-2.5 py-1 bg-amber-950/60 border border-amber-500/40 rounded text-[10px] font-mono text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Authority Exceeded (L{sub.authorityRequired} &gt; L{authorityLevel}) - Awaiting Approval</span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Loop #{sub.loopCount}</span>
                      <span>{sub.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          sub.status === 'completed'
                            ? 'bg-emerald-400'
                            : sub.status === 'terminated'
                            ? 'bg-red-500'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${sub.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2 bg-slate-900 rounded-lg text-[10px] font-mono text-slate-400 border border-slate-800 line-clamp-2">
                    <span className="text-amber-400/80 font-bold">Action: </span>
                    {sub.lastAction}
                  </div>
                </div>

                {/* Sub-Agent Controls */}
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-[11px] font-mono">
                  <span className="text-slate-500">{sub.tokensUsed.toLocaleString()} Tokens</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleSubAgentStatus(sub.id)}
                      disabled={emergencyStopActive}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                      title={sub.status === 'running' ? 'Pause Sub-Agent' : 'Resume Sub-Agent'}
                    >
                      {sub.status === 'running' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    <button
                      onClick={() => handleTerminateSubAgent(sub.id)}
                      className="p-1.5 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 rounded-lg transition-all"
                      title="Terminate Sub-Agent"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {/* Spawn Sub-Agent Modal */}
      {showSpawnModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">Spawn Autonomous Sub-Agent</h3>
              </div>
              <button
                onClick={() => setShowSpawnModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSpawnSubAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Sub-Agent Identifier / Name</label>
                <input
                  type="text"
                  placeholder="e.g. Refactor-Engine-Optimizer"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Autonomous Goal Objective</label>
                <textarea
                  placeholder="Describe the autonomous task goal and execution instructions..."
                  value={newSubGoal}
                  onChange={(e) => setNewSubGoal(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Required Authority Level: Level {newSubAuthority}
                </label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={newSubAuthority}
                  onChange={(e) => setNewSubAuthority(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSpawnModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl font-mono shadow-md shadow-amber-500/10"
                >
                  Spawn Worker Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
