import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Plus,
  Zap,
  Activity,
  Layers,
  Sparkles,
  GitBranch,
  Sliders,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Trash2,
  ShieldCheck,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface AgentNode {
  id: string;
  title: string;
  role: string;
  status: 'idle' | 'running' | 'success' | 'warning' | 'failed';
  progress: number;
  tokens: number;
  latencyMs: number;
  cost: string;
  position: { x: number; y: number };
  subDetails: string;
  outputs: string[];
  logs: string[];
}

export const JarvisNodeStudio: React.FC = () => {
  const [isRunning, setIsRunning] = useState(true);
  const [costAccumulated, setCostAccumulated] = useState(0.042);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-2');
  const [flowSpeed, setFlowSpeed] = useState<number>(1);

  const [nodes, setNodes] = useState<AgentNode[]>([
    {
      id: 'node-1',
      title: 'PLANNING NODE',
      role: 'Top ReAct Supervisor & DAG Planner',
      status: 'success',
      progress: 100,
      tokens: 1420,
      latencyMs: 95,
      cost: '$0.0011',
      position: { x: 40, y: 80 },
      subDetails: 'Task Breakdown: 4 Sub-goals formulated with zero cyclic dependencies',
      outputs: ['dag_graph.json', 'agent_assignments.json'],
      logs: [
        '[18:40:02] Received user intent: Full-Stack cluster telemetry & verification',
        '[18:40:03] Generated 4-stage execution graph with fallback branches',
        '[18:40:04] DAG verified: 0 topological cycles'
      ]
    },
    {
      id: 'node-2',
      title: 'WEB SCRAPER NODE',
      role: 'Live Research & API Ingestion Agent',
      status: 'running',
      progress: 65,
      tokens: 4890,
      latencyMs: 130,
      cost: '$0.0039',
      position: { x: 380, y: 80 },
      subDetails: 'Scanning URLs... Extracted 14 research chunks and telemetry endpoints',
      outputs: ['extracted_context.txt', 'benchmark_matrix.csv'],
      logs: [
        '[18:40:05] Initialized Headless Chromium sandbox',
        '[18:40:08] Queried 12 server endpoints across Kubernetes cluster',
        '[18:40:11] Ingested 14 semantic chunks into working vector buffer (Progress 65%)'
      ]
    },
    {
      id: 'node-3',
      title: 'SYNTHESIZER NODE',
      role: 'Multi-Model Synthesis & Fusion Agent',
      status: 'running',
      progress: 40,
      tokens: 8200,
      latencyMs: 115,
      cost: '$0.0065',
      position: { x: 720, y: 80 },
      subDetails: 'Merging Text & Metrics into Recharts Telemetry Canvas',
      outputs: ['synthesized_report.md', 'telemetry_state.json'],
      logs: [
        '[18:40:12] Model Router: Dispatched to Gemini 2.5 Flash',
        '[18:40:14] Streaming tokens at 142 tokens/second',
        '[18:40:16] Merging stream output with AST schema'
      ]
    },
    {
      id: 'node-4',
      title: 'AST COMPILER NODE',
      role: 'Code AST Validator & DRC Gatekeeper',
      status: 'idle',
      progress: 0,
      tokens: 0,
      latencyMs: 0,
      cost: '$0.0000',
      position: { x: 1060, y: 80 },
      subDetails: 'Awaiting upstream synthesis completion before triggering virtual sandbox',
      outputs: ['compiler_report.json'],
      logs: [
        '[18:40:00] Standing by for upstream token stream...'
      ]
    }
  ]);

  // Simulate active progress & cost accumulation
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        setCostAccumulated(prev => Number((prev + 0.0002).toFixed(4)));
        setNodes(prevNodes =>
          prevNodes.map(n => {
            if (n.status === 'running') {
              const nextProg = Math.min(100, n.progress + 3);
              return {
                ...n,
                progress: nextProg,
                status: nextProg >= 100 ? 'success' : 'running'
              };
            }
            return n;
          })
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const selectedNode = (nodes || []).find(n => n.id === selectedNodeId) || nodes?.[0];

  const handleToggleRun = () => {
    setIsRunning(prev => !prev);
  };

  const handleResetFlow = () => {
    setNodes(prev => [
      { ...prev[0], status: 'running', progress: 10 },
      { ...prev[1], status: 'idle', progress: 0 },
      { ...prev[2], status: 'idle', progress: 0 },
      { ...prev[3], status: 'idle', progress: 0 }
    ]);
    setCostAccumulated(0.012);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0C10] text-[#C5C6C7] font-sans overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER CONTROLS & COST TRACKER                            */}
      {/* ------------------------------------------------------------- */}
      <div className="px-5 py-3 border-b border-[#66FCF1]/20 bg-[#0B0C10]/95 flex flex-wrap items-center justify-between gap-3 font-mono text-xs backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#66FCF1]/10 border border-[#66FCF1]/30 rounded-lg text-[#66FCF1]">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Agent Orchestration Node Canvas</span>
              <span className="px-2 py-0.5 bg-[#66FCF1]/10 text-[#66FCF1] text-[9px] font-bold rounded border border-[#66FCF1]/30">
                LAYOUT B
              </span>
            </h2>
            <p className="text-[10px] text-[#45A29E] font-sans">
              Autonomous DAG Workflow Execution & Inter-Agent Event Bus
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-[#1F2833]/80 border border-[#66FCF1]/30 rounded-xl flex items-center gap-2 text-xs">
            <Activity className="w-3.5 h-3.5 text-[#66FCF1] animate-pulse" />
            <span className="text-slate-400">Total Run Cost:</span>
            <span className="text-[#FFB037] font-bold">${costAccumulated.toFixed(4)}</span>
          </div>

          <button
            onClick={handleToggleRun}
            className={`px-4 py-1.5 font-bold rounded-xl flex items-center gap-1.5 transition-all text-xs shadow-lg ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-[#66FCF1] hover:bg-[#45A29E] text-[#0B0C10] shadow-[#66FCF1]/20'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-slate-950" />
                <span>PAUSE SYSTEM</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-[#0B0C10]" />
                <span>RUN SYSTEM</span>
              </>
            )}
          </button>

          <button
            onClick={handleResetFlow}
            className="p-1.5 bg-[#1F2833] hover:bg-[#1F2833]/80 text-slate-300 hover:text-white rounded-xl border border-[#66FCF1]/20"
            title="Reset Workflow"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CANVAS BODY: NODES + GLOWING BEZIER CONNECTIONS          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Interactive Grid & Node Canvas */}
        <div className="flex-1 relative overflow-auto p-8 bg-[radial-gradient(#1F2833_1px,transparent_1px)] [background-size:24px_24px]">
          {/* SVG Animated Connector Curves */}
          <svg className="absolute inset-0 w-[1400px] h-[600px] pointer-events-none z-0">
            <defs>
              <linearGradient id="neonCyanFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#66FCF1" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FFB037" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#66FCF1" stopOpacity="0.8" />
              </linearGradient>

              {/* Glowing Filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connection 1: Node 1 -> Node 2 */}
            <path
              d="M 320 140 C 350 140, 350 140, 380 140"
              stroke="#66FCF1"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="6,6"
              className={isRunning ? 'animate-pulse' : ''}
              filter="url(#glow)"
            />

            {/* Connection 2: Node 2 -> Node 3 */}
            <path
              d="M 660 140 C 690 140, 690 140, 720 140"
              stroke="url(#neonCyanFlow)"
              strokeWidth="3"
              fill="none"
              strokeDasharray="8,4"
              className={isRunning ? 'animate-pulse' : ''}
              filter="url(#glow)"
            />

            {/* Connection 3: Node 3 -> Node 4 */}
            <path
              d="M 1000 140 C 1030 140, 1030 140, 1060 140"
              stroke="#45A29E"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4,4"
              opacity="0.6"
            />
          </svg>

          {/* Node Cards Container */}
          <div className="flex gap-14 relative z-10 min-w-[1300px] items-start pt-4">
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-72 bg-[#0B0C10]/90 backdrop-blur-xl rounded-2xl border transition-all cursor-pointer shadow-2xl p-4 space-y-3 relative group ${
                    isSelected
                      ? 'border-[#66FCF1] ring-2 ring-[#66FCF1]/30 shadow-[#66FCF1]/20 scale-[1.02]'
                      : 'border-[#66FCF1]/30 hover:border-[#66FCF1]/70'
                  }`}
                >
                  {/* Status Indicator Top Pill */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-[#66FCF1] uppercase">
                      {node.title}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        node.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : node.status === 'running'
                          ? 'bg-[#FFB037]/20 text-[#FFB037] border border-[#FFB037]/40 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {node.status === 'running' ? `Progress ${node.progress}%` : node.status}
                    </span>
                  </div>

                  {/* Node Role & Description */}
                  <p className="text-xs font-sans text-slate-200 font-semibold leading-snug">
                    {node.role}
                  </p>

                  {/* Sub Details Callout */}
                  <div className="p-2.5 bg-[#1F2833]/50 border border-[#66FCF1]/15 rounded-xl font-mono text-[10px] text-slate-300">
                    {node.subDetails}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Execution Status:</span>
                      <span className="text-[#66FCF1] font-bold">{node.progress}%</span>
                    </div>
                    <div className="w-full bg-[#1F2833] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          node.status === 'success'
                            ? 'bg-emerald-400'
                            : 'bg-gradient-to-r from-[#66FCF1] to-[#FFB037]'
                        }`}
                        style={{ width: `${node.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Telemetry Metrics Footer */}
                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/80 font-mono text-[9px] text-slate-400">
                    <div>Tokens: <span className="text-slate-200">{node.tokens}</span></div>
                    <div>Lat: <span className="text-slate-200">{node.latencyMs}ms</span></div>
                    <div>Cost: <span className="text-[#FFB037]">{node.cost}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* RIGHT DRAWER: INSPECT SELECTED NODE DETAILS                   */}
        {/* ------------------------------------------------------------- */}
        <aside className="w-96 bg-[#0B0C10] border-l border-[#66FCF1]/20 flex flex-col h-full shrink-0 font-mono text-xs">
          {/* Header */}
          <div className="p-4 border-b border-[#66FCF1]/20 bg-[#0B0C10] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#66FCF1]" />
              <span className="font-bold text-slate-100 text-xs uppercase tracking-wider">
                Node Inspector
              </span>
            </div>
            <span className="text-[10px] text-[#45A29E] bg-[#1F2833] px-2 py-0.5 rounded border border-[#66FCF1]/20">
              {selectedNode.id}
            </span>
          </div>

          {/* Node Metadata & Logs */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* Title & Status */}
            <div className="p-3 bg-[#1F2833]/40 border border-[#66FCF1]/20 rounded-xl space-y-1.5">
              <div className="text-[#66FCF1] font-bold text-sm">{selectedNode.title}</div>
              <div className="text-slate-300 font-sans text-xs">{selectedNode.role}</div>
              <div className="text-[10px] text-slate-400">
                State: <strong className="text-emerald-400 uppercase">{selectedNode.status}</strong>
              </div>
            </div>

            {/* Generated Artifact Outputs */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Generated Artifact Outputs
              </span>
              <div className="space-y-1">
                {selectedNode.outputs.map((out, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#0B0C10] border border-[#66FCF1]/20 rounded-lg text-slate-200 text-xs flex items-center justify-between"
                  >
                    <span>{out}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#66FCF1]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Real-Time Execution Logs */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#66FCF1]" />
                <span>Real-Time Node Telemetry Logs</span>
              </span>
              <div className="p-3 bg-[#0B0C10] border border-[#66FCF1]/20 rounded-xl space-y-1.5 font-mono text-[10px] text-slate-300 max-h-56 overflow-y-auto">
                {selectedNode.logs.map((log, lIdx) => (
                  <div key={lIdx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="p-4 border-t border-[#66FCF1]/20 bg-[#0B0C10]">
            <button
              onClick={() => alert(`Triggering manual diagnostic re-evaluation for ${selectedNode.title}...`)}
              className="w-full py-2 bg-[#1F2833] hover:bg-[#66FCF1]/20 text-[#66FCF1] border border-[#66FCF1]/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Force Node Re-Execution</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
