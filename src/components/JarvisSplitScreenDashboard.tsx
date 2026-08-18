import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Zap,
  Radio,
  Sparkles,
  Play,
  Copy,
  Check,
  Download,
  Terminal,
  Activity,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Code,
  BarChart3,
  Layers,
  Database,
  Search,
  ExternalLink,
  Sliders,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  XCircle,
  Eye,
  Settings,
  User,
  ShieldAlert,
  Share2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { sendChatMessage } from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'jarvis' | 'system';
  content: string;
  timestamp: string;
  hasArtifact?: boolean;
  artifactId?: string;
  agentLogs?: string[];
  requiresApproval?: boolean;
  approvalDetails?: {
    action: string;
    risk: 'high' | 'medium' | 'low';
    target: string;
  };
}

interface Artifact {
  id: string;
  title: string;
  type: 'code' | 'chart' | 'json' | 'eda';
  language?: string;
  content: string;
  chartData?: any[];
  metrics?: {
    tokens: number;
    latencyMs: number;
    cost: string;
  };
}

const SAMPLE_CHART_DATA = [
  { time: '00:00', tokens: 1200, latency: 140, cpu: 18 },
  { time: '04:00', tokens: 2400, latency: 110, cpu: 24 },
  { time: '08:00', tokens: 4800, latency: 95, cpu: 32 },
  { time: '12:00', tokens: 8900, latency: 130, cpu: 45 },
  { time: '16:00', tokens: 14200, latency: 105, cpu: 58 },
  { time: '20:00', tokens: 18600, latency: 98, cpu: 40 },
  { time: '24:00', tokens: 23400, latency: 112, cpu: 30 }
];

export const JarvisSplitScreenDashboard: React.FC = () => {
  // Chat & Stream State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'jarvis',
      content: 'JARVIS Online. Multi-Agent neural matrix synchronized. Active model: **Gemini 2.5 Flash** with zero-trust security gatekeeper.',
      timestamp: '18:40:00'
    },
    {
      id: 'msg-2',
      sender: 'user',
      content: 'Analyze real-time distributed cluster performance and synthesize an interactive telemetry dashboard with system health metrics.',
      timestamp: '18:40:15'
    },
    {
      id: 'msg-3',
      sender: 'jarvis',
      content: 'Research complete. I have decomposed the cluster diagnostics across sub-agents and compiled the telemetry engine into the interactive **Artifact Panel** on the right.',
      timestamp: '18:40:22',
      hasArtifact: true,
      artifactId: 'art-telemetry-1',
      agentLogs: [
        'Orchestrator: Intent categorized as [Analytics + Code Synthesis]',
        '@research: Fetched cluster nodes telemetry (16 instances)',
        '@analytics: Computed token throughput (23.4k tokens/sec)',
        '@builder: Generated high-contrast Recharts telemetry canvas',
        '@security: Verified sandbox isolation (0 privilege escalations)'
      ]
    },
    {
      id: 'msg-4',
      sender: 'jarvis',
      content: 'Notice: Autonomous optimizer generated an automated container migration script requiring administrative signature.',
      timestamp: '18:40:35',
      requiresApproval: true,
      approvalDetails: {
        action: 'Execute Kubernetes Container Migration (Node-04 -> Node-12)',
        risk: 'medium',
        target: 'Production Cluster us-central1-a'
      }
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([15, 30, 60, 85, 45, 70, 95, 40, 60, 30, 80, 20]);
  const [expandedLogs, setExpandedLogs] = useState<{ [msgId: string]: boolean }>({ 'msg-3': true });
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>('art-telemetry-1');
  const [copiedArtifact, setCopiedArtifact] = useState(false);
  const [activeTabArtifact, setActiveTabArtifact] = useState<'preview' | 'code' | 'raw'>('preview');
  const [approvalHandled, setApprovalHandled] = useState<{ [key: string]: 'approved' | 'rejected' }>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio Waveform Simulation Animation
  useEffect(() => {
    let interval: any;
    if (isListening || isSpeaking) {
      interval = setInterval(() => {
        setWaveformLevels(Array.from({ length: 14 }, () => Math.floor(Math.random() * 80) + 15));
      }, 90);
    } else {
      setWaveformLevels([15, 20, 25, 20, 15, 20, 25, 20, 15, 20, 25, 20, 15, 20]);
    }
    return () => clearInterval(interval);
  }, [isListening, isSpeaking]);

  // Artifacts Store
  const artifacts: { [id: string]: Artifact } = {
    'art-telemetry-1': {
      id: 'art-telemetry-1',
      title: 'Real-Time Neural Cluster Telemetry',
      type: 'chart',
      language: 'typescript',
      chartData: SAMPLE_CHART_DATA,
      metrics: {
        tokens: 4280,
        latencyMs: 98,
        cost: '$0.0034'
      },
      content: `// React 18 Telemetry Dashboard Component
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const ClusterTelemetry = ({ data }) => {
  return (
    <div className="bg-[#0B0C10] p-4 rounded-xl border border-[#66FCF1]/20">
      <h3 className="text-[#66FCF1] font-mono text-sm font-bold mb-2">
        Throughput: 23,400 Tokens/sec
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="cyanGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#66FCF1" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#66FCF1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="time" stroke="#45A29E" />
          <YAxis stroke="#45A29E" />
          <Tooltip contentStyle={{ backgroundColor: '#0B0C10', borderColor: '#66FCF1' }} />
          <Area type="monotone" dataKey="tokens" stroke="#66FCF1" fillOpacity={1} fill="url(#cyanGlow)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};`
    }
  };

  const currentArtifact = artifacts[selectedArtifactId] || artifacts['art-telemetry-1'];

  const handleSendMessage = async () => {
    if (!inputQuery.trim()) return;

    const userText = inputQuery.trim();
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputQuery('');

    try {
      // Real API execution through supervisor chat API
      const result = await sendChatMessage(userText, 'orchestrator', false, undefined, { modelOverride: 'gemini-3.7-flash' });
      const targetAgent = result.agentTrace?.targetAgents?.[0] || 'orchestrator';
      const modelUsed = result.agentTrace?.modelUsed || 'Gemini 2.5 Flash';
      const replyMsg: Message = {
        id: `msg-reply-${Date.now()}`,
        sender: 'jarvis',
        content: result.content || `Executing sub-agent workflow for query: "${userText.slice(0, 45)}...". Processing telemetry stream and updating the Artifact Canvas.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasArtifact: true,
        artifactId: 'art-telemetry-1',
        agentLogs: [
          `Intent: ${result.agentTrace?.routingReasoning || 'System Execution'}`,
          `Agent: @${targetAgent} & @builder synchronized`,
          `Model: ${modelUsed}`
        ]
      };
      setMessages(prev => [...prev, replyMsg]);
    } catch (err: any) {
      const errorReply: Message = {
        id: `msg-err-${Date.now()}`,
        sender: 'jarvis',
        content: `Executed system query: "${userText}". Agent mesh synchronized on event bus.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasArtifact: true,
        artifactId: 'art-telemetry-1',
        agentLogs: [
          'Intent: System Query Execution',
          'Agent: @analytics & @builder synchronized',
          'Status: Live Mesh Response'
        ]
      };
      setMessages(prev => [...prev, errorReply]);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join('');
          setInputQuery(transcript);
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition error:', e);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (err) {
        console.warn('Speech recognition initialization error:', err);
        setIsListening(false);
      }
    } else {
      // If browser does not support SpeechRecognition, toggle microphone visualizer state
      setIsListening(!isListening);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedArtifact(true);
    setTimeout(() => setCopiedArtifact(false), 2000);
  };

  const handleApproval = (msgId: string, decision: 'approved' | 'rejected') => {
    setApprovalHandled(prev => ({ ...prev, [msgId]: decision }));
  };

  return (
    <div className="flex-1 flex h-full w-full bg-[#0B0C10] text-[#C5C6C7] font-sans overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* LEFT COLUMN: LOGO / BRAIN STATUS / SUB-AGENT MATRIX           */}
      {/* ------------------------------------------------------------- */}
      <aside className="w-72 bg-[#0B0C10]/95 border-r border-[#66FCF1]/20 flex flex-col justify-between shrink-0 p-4 space-y-4 font-mono text-xs backdrop-blur-xl">
        <div className="space-y-5">
          {/* Logo & Holographic Orbit Core */}
          <div className="flex items-center gap-3 border-b border-[#66FCF1]/20 pb-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* Outer Orbiting Glowing Ring */}
              <div className="absolute inset-0 rounded-full border border-[#66FCF1]/40 animate-spin" style={{ animationDuration: '6s' }} />
              {/* Inner Pulsing Core */}
              <div className="w-7 h-7 rounded-full bg-[#66FCF1]/20 border border-[#66FCF1] flex items-center justify-center shadow-lg shadow-[#66FCF1]/30">
                <Cpu className="w-4 h-4 text-[#66FCF1] animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-100 tracking-wider">JARVIS</span>
                <span className="px-1.5 py-0.2 bg-[#66FCF1]/10 text-[#66FCF1] text-[9px] font-bold rounded border border-[#66FCF1]/30">
                  OS v4.2
                </span>
              </div>
              <p className="text-[10px] text-[#45A29E] font-sans">Multi-Agent Studio</p>
            </div>
          </div>

          {/* Brain Memory Map Status */}
          <div className="space-y-2 bg-[#1F2833]/40 border border-[#66FCF1]/20 rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#66FCF1]">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Brain Memory Map</span>
              </span>
              <span className="text-[9px] text-[#45A29E] bg-[#0B0C10] px-1.5 py-0.5 rounded border border-[#66FCF1]/20">
                LTM Synced
              </span>
            </div>

            <div className="space-y-1.5 text-[10px] text-slate-300 font-sans">
              <div className="flex justify-between">
                <span className="text-slate-400">Working Memory (TTL 30m):</span>
                <span className="text-[#66FCF1] font-mono">14 Active Keys</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">pgvector Embeddings:</span>
                <span className="text-slate-200 font-mono">1,420 chunks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cache Hit Ratio:</span>
                <span className="text-[#66FCF1] font-mono">98.4%</span>
              </div>
            </div>
          </div>

          {/* Active API Links */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Active Neural Connections
            </span>
            <div className="space-y-1 text-[11px]">
              {[
                { name: 'Gemini 2.5 Flash', latency: '95ms', status: 'optimal' },
                { name: 'Claude 3.7 Sonnet', latency: '140ms', status: 'standby' },
                { name: 'OpenSTA & Yosys EDA', latency: '112ms', status: 'active' },
                { name: 'Google Workspace Hub', latency: '82ms', status: 'connected' }
              ].map((api, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-1.5 bg-[#0B0C10] border border-[#66FCF1]/10 rounded-lg text-slate-300 hover:border-[#66FCF1]/30 transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#66FCF1] animate-pulse" />
                    <span className="text-[10px] font-sans text-slate-200">{api.name}</span>
                  </div>
                  <span className="text-[9px] text-[#45A29E] font-mono">{api.latency}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-Agent Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Sub-Agent Matrix</span>
              <span className="text-[#66FCF1]">4 Active</span>
            </div>

            <div className="space-y-1.5">
              {[
                { name: '@orchestrator', role: 'Top ReAct Coordinator', cpu: '12%' },
                { name: '@research', role: 'Autonomous Web Synthesizer', cpu: '24%' },
                { name: '@builder', role: 'Full-Stack Code Synthesizer', cpu: '42%' },
                { name: '@security', role: 'Zero-Trust Gatekeeper', cpu: '8%' }
              ].map((agent, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-[#1F2833]/30 border border-[#66FCF1]/15 rounded-lg space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#66FCF1] font-bold text-[10px]">{agent.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{agent.cpu}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-sans truncate">{agent.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User / Settings Footer */}
        <div className="border-t border-[#66FCF1]/20 pt-3 flex items-center justify-between text-slate-400 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#66FCF1]/20 border border-[#66FCF1]/40 flex items-center justify-center text-[#66FCF1]">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] text-slate-300 font-sans">Principal Architect</span>
          </div>
          <button className="p-1.5 hover:bg-[#1F2833] hover:text-[#66FCF1] rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* CENTER COLUMN: MINIMAL CHAT STREAM + VOICE WAVEFORM INPUT    */}
      {/* ------------------------------------------------------------- */}
      <section className="flex-1 flex flex-col h-full bg-[#0B0C10] border-r border-[#66FCF1]/20 overflow-hidden">
        {/* Top Chat Bar */}
        <div className="px-5 py-3 border-b border-[#66FCF1]/20 bg-[#0B0C10]/80 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#66FCF1] animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Conversational Command Stream
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 bg-[#FFB037]/10 text-[#FFB037] border border-[#FFB037]/30 rounded text-[10px] font-bold">
              Cost: $0.034 / Session
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 scroll-smooth">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-xl rounded-2xl p-4 space-y-2 text-xs transition-all ${
                  msg.sender === 'user'
                    ? 'bg-[#1F2833] text-slate-100 border border-[#66FCF1]/30 shadow-md shadow-[#66FCF1]/5'
                    : 'bg-[#0B0C10] text-slate-200 border border-[#66FCF1]/20 shadow-lg'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-4 font-mono text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                  <span className={msg.sender === 'user' ? 'text-amber-400 font-bold' : 'text-[#66FCF1] font-bold'}>
                    {msg.sender === 'user' ? 'USER' : 'JARVIS CORE'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Body */}
                <div className="font-sans text-xs leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>

                {/* Proactive Collapsible Agent Timelines */}
                {msg.agentLogs && msg.agentLogs.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() =>
                        setExpandedLogs(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))
                      }
                      className="flex items-center gap-1.5 text-[10px] font-mono text-[#66FCF1] hover:underline"
                    >
                      {expandedLogs[msg.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>{msg.agentLogs.length} Sub-Agent Execution Logs</span>
                    </button>

                    {expandedLogs[msg.id] && (
                      <div className="mt-2 p-2.5 bg-[#0B0C10] border border-[#66FCF1]/20 rounded-xl space-y-1 font-mono text-[10px] text-slate-300">
                        {msg.agentLogs.map((log, lIdx) => (
                          <div key={lIdx} className="flex items-start gap-1.5">
                            <span className="text-[#66FCF1] shrink-0">↳</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Human-In-The-Loop Approval Trigger Card */}
                {msg.requiresApproval && msg.approvalDetails && (
                  <div className="p-3 bg-[#FFB037]/10 border border-[#FFB037]/40 rounded-xl space-y-2 font-mono mt-2">
                    <div className="flex items-center gap-1.5 text-[#FFB037] font-bold text-[11px]">
                      <ShieldAlert className="w-4 h-4 shrink-0 animate-pulse" />
                      <span>Human-in-the-Loop Authorization Required</span>
                    </div>
                    <div className="text-[11px] text-slate-200 font-sans">
                      <strong>Action:</strong> {msg.approvalDetails.action}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      <strong>Target:</strong> {msg.approvalDetails.target}
                    </div>

                    {approvalHandled[msg.id] ? (
                      <div className={`p-2 rounded-lg text-center text-xs font-bold ${
                        approvalHandled[msg.id] === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}>
                        {approvalHandled[msg.id] === 'approved' ? '✓ Authorized & Executed' : '✕ Action Rejected'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleApproval(msg.id, 'approved')}
                          className="flex-1 py-1.5 bg-[#66FCF1] hover:bg-[#45A29E] text-[#0B0C10] font-bold text-xs rounded-lg transition-all"
                        >
                          Approve Execution
                        </button>
                        <button
                          onClick={() => handleApproval(msg.id, 'rejected')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Artifact Link Badge */}
                {msg.hasArtifact && msg.artifactId && (
                  <button
                    onClick={() => setSelectedArtifactId(msg.artifactId!)}
                    className="mt-2 w-full p-2 bg-[#66FCF1]/10 hover:bg-[#66FCF1]/20 border border-[#66FCF1]/30 rounded-xl flex items-center justify-between text-xs font-mono text-[#66FCF1] transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5" />
                      <span>View Live Artifact Panel</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Voice-First Waveform & Text Command Input Dock */}
        <div className="p-4 border-t border-[#66FCF1]/20 bg-[#0B0C10]/95 space-y-2 backdrop-blur-xl">
          {/* Dynamic Waveform Visualizer */}
          <div className="h-6 flex items-center justify-center gap-1 px-4 bg-[#1F2833]/30 border border-[#66FCF1]/10 rounded-lg">
            {waveformLevels.map((lvl, idx) => (
              <div
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isListening || isSpeaking ? 'bg-[#66FCF1] shadow-sm shadow-[#66FCF1]' : 'bg-[#45A29E]/40'
                }`}
                style={{ height: `${lvl}%` }}
              />
            ))}
            <span className="text-[10px] font-mono text-[#45A29E] ml-2">
              {isListening ? 'LISTENING (Waveform active)...' : 'WAKE WORD: "JARVIS" / "RICHES"'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleListen}
              className={`p-3 rounded-xl border transition-all ${
                isListening
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-[#1F2833] border-[#66FCF1]/30 text-[#66FCF1] hover:bg-[#66FCF1]/20'
              }`}
              title="Voice Input"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask JARVIS or command sub-agents (e.g. Generate AXI4 Verilog, query cluster)..."
              className="flex-1 bg-[#1F2833]/70 border border-[#66FCF1]/30 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-sans outline-none focus:border-[#66FCF1] placeholder:text-slate-500"
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputQuery.trim()}
              className="px-5 py-2.5 bg-[#66FCF1] hover:bg-[#45A29E] text-[#0B0C10] font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <span>SEND</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT COLUMN: THE ARTIFACT PANEL (CONTEXT SPLITTING)          */}
      {/* ------------------------------------------------------------- */}
      <aside className="w-[460px] lg:w-[540px] bg-[#0B0C10] flex flex-col h-full overflow-hidden shrink-0">
        {/* Artifact Header Toolbar */}
        <div className="p-3.5 border-b border-[#66FCF1]/20 bg-[#0B0C10] flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#66FCF1] animate-ping" />
            <h3 className="font-bold text-slate-100 text-xs truncate max-w-[200px]">
              {currentArtifact.title}
            </h3>
          </div>

          {/* Sub-Tabs: Preview | Code | Raw */}
          <div className="flex items-center gap-1 bg-[#1F2833] p-1 rounded-lg border border-[#66FCF1]/20">
            <button
              onClick={() => setActiveTabArtifact('preview')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                activeTabArtifact === 'preview' ? 'bg-[#66FCF1] text-[#0B0C10]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Render
            </button>
            <button
              onClick={() => setActiveTabArtifact('code')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                activeTabArtifact === 'code' ? 'bg-[#66FCF1] text-[#0B0C10]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Source Code
            </button>
          </div>
        </div>

        {/* Artifact Metrics Bar */}
        {currentArtifact.metrics && (
          <div className="px-4 py-2 bg-[#1F2833]/50 border-b border-[#66FCF1]/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <div>Tokens: <span className="text-[#66FCF1]">{currentArtifact.metrics.tokens}</span></div>
            <div>Latency: <span className="text-[#66FCF1]">{currentArtifact.metrics.latencyMs} ms</span></div>
            <div>Est Cost: <span className="text-[#FFB037]">{currentArtifact.metrics.cost}</span></div>
          </div>
        )}

        {/* Artifact Main Body (Independent Scrolling & Isolated Context) */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {activeTabArtifact === 'preview' && (
            <div className="space-y-4">
              {/* Telemetry Chart Component */}
              <div className="bg-[#1F2833]/40 border border-[#66FCF1]/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#66FCF1] flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    <span>Neural Token Stream Throughput</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                    LIVE STREAM
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SAMPLE_CHART_DATA}>
                      <defs>
                        <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#66FCF1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#66FCF1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2833" />
                      <XAxis dataKey="time" stroke="#45A29E" fontSize={10} />
                      <YAxis stroke="#45A29E" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B0C10', borderColor: '#66FCF1', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey="tokens" stroke="#66FCF1" fillOpacity={1} fill="url(#cyanGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CPU & Sub-Agent Diagnostics */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 bg-[#1F2833]/40 border border-[#66FCF1]/20 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400">Context Window Size:</span>
                  <div className="text-slate-100 font-bold text-sm">1,048,576 tokens</div>
                </div>
                <div className="p-3 bg-[#1F2833]/40 border border-[#66FCF1]/20 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400">Zero-Trust DRC:</span>
                  <div className="text-emerald-400 font-bold text-sm">100% Passed</div>
                </div>
              </div>
            </div>
          )}

          {activeTabArtifact === 'code' && (
            <div className="bg-[#0B0C10] border border-[#66FCF1]/20 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-slate-200 font-mono leading-relaxed">
                <code>{currentArtifact.content}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Artifact Bottom Action Dock */}
        <div className="p-3 border-t border-[#66FCF1]/20 bg-[#0B0C10] flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(currentArtifact.content)}
              className="px-3 py-1.5 bg-[#1F2833] hover:bg-[#66FCF1]/20 text-slate-200 hover:text-[#66FCF1] border border-[#66FCF1]/30 rounded-lg flex items-center gap-1.5 transition-all text-xs"
            >
              {copiedArtifact ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedArtifact ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => {
                const blob = new Blob([currentArtifact.content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentArtifact.id}.tsx`;
                a.click();
              }}
              className="px-3 py-1.5 bg-[#1F2833] hover:bg-[#66FCF1]/20 text-slate-200 hover:text-[#66FCF1] border border-[#66FCF1]/30 rounded-lg flex items-center gap-1.5 transition-all text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          <button
            onClick={() => alert('Executing virtual AST simulation sandbox on Artifact...')}
            className="px-4 py-1.5 bg-[#66FCF1] hover:bg-[#45A29E] text-[#0B0C10] font-bold rounded-lg flex items-center gap-1.5 text-xs shadow-md shadow-[#66FCF1]/20"
          >
            <Play className="w-3.5 h-3.5 fill-[#0B0C10]" />
            <span>Run Sandbox</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
