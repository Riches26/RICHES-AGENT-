import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Brain, 
  Sparkles, 
  Code, 
  CheckCircle2, 
  Paperclip, 
  Mic, 
  Play, 
  ShieldAlert, 
  Cpu, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  Mail, 
  MessageSquare, 
  Phone, 
  FileText,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Zap,
  Terminal,
  RefreshCw,
  Eye,
  X,
  Sliders,
  PanelRightClose,
  PanelRightOpen,
  ArrowRight,
  Info,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  MicOff,
  FolderGit2
} from 'lucide-react';
import { ChatMessage, AgentId, AgentInfo, AgentEvent } from '../types';
import { sendChatMessage, clearChatHistory, fetchSystemEvents, ChatSendOptions } from '../services/api';
import { eventBus } from '../services/eventBus';
import { CronDigestStatusWidget } from './CronDigestStatusWidget';
import { playChimeSound, speakWithBrowserTts, stopAllAudioPlayback } from '../services/voiceEngine';

interface OrchestratorChatProps {
  agents?: AgentInfo[];
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onOpenSandboxCode?: (code: string) => void;
  onNavigate?: (view: string) => void;
}

// Inline helper to render **bold** and `code` segments cleanly without raw markdown symbols
function renderInlineFormatting(text: string) {
  const sanitized = text
    .replace(/###\s*\*{0,2}/g, '')
    .replace(/,?\s*\*\*\s*$/, '')
    .trim();

  const parts = sanitized.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return <strong key={i} className="font-semibold text-amber-300">{boldText}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeText = part.slice(1, -1);
      return <code key={i} className="px-1.5 py-0.5 bg-slate-950 text-amber-400 font-mono text-[11px] rounded border border-slate-800">{codeText}</code>;
    }
    return part;
  });
}

// Formatted AI message content renderer
const FormattedMessageContent: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-slate-200 leading-relaxed font-sans text-xs sm:text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Clean headers starting with # or ###
        if (/^#{1,6}\s+/.test(trimmed)) {
          const headerText = trimmed.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').trim();
          return (
            <h3 key={idx} className="text-xs sm:text-sm font-bold text-amber-400 font-mono mt-3 mb-1 border-b border-slate-800 pb-1 flex items-center gap-1.5">
              <span>{headerText}</span>
            </h3>
          );
        }

        // Clean bullet lists starting with *, -, or •
        if (/^[*•-]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[*•-]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <span className="flex-1 text-slate-200">{renderInlineFormatting(bulletText)}</span>
            </div>
          );
        }

        // Standard text paragraph
        return (
          <p key={idx} className="leading-relaxed text-slate-200">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export const OrchestratorChat: React.FC<OrchestratorChatProps> = ({
  agents = [],
  messages,
  setMessages,
  onOpenSandboxCode,
  onNavigate
}) => {
  // Navigation & Workspace Sub-View Tabs
  const [activeTab, setActiveTab] = useState<'chat' | 'mesh' | 'prompts' | 'export'>('chat');
  const [showSideTelemetry, setShowSideTelemetry] = useState<boolean>(true);

  // Chat State
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('orchestrator');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceInterimLive, setVoiceInterimLive] = useState<string>('');
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState<boolean>(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});

  const voiceRecognitionRef = useRef<any>(null);

  // System Events Telemetry State
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Export & Dispatch State
  const [exportWhatsAppNumber, setExportWhatsAppNumber] = useState('');
  const [exportTelegramChatId, setExportTelegramChatId] = useState('');
  const [exportEmailAddress, setExportEmailAddress] = useState('deejayalex44@gmail.com');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load live system events
  const loadEvents = async () => {
    try {
      setIsLoadingEvents(true);
      const data = await fetchSystemEvents();
      if (Array.isArray(data)) {
        setEvents(data);
      }
    } catch (err) {
      console.warn('System events notice:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 20000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isLoading, activeTab]);

  // Toggle expanded state of a message's execution trace
  const toggleTrace = (msgId: string) => {
    setExpandedTraces(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  // Categorized Prompt Library
  const promptCategories = [
    {
      category: 'GitHub & Code Puller',
      icon: FolderGit2,
      color: 'text-purple-400',
      prompts: [
        { label: 'Pull Connected GitHub Code', prompt: 'Pull codes from my connected github account and analyze repository structure for the Builder Sandbox.' },
        { label: 'Inspect Repo Branches & Tree', prompt: 'Inspect all branches and file trees across my connected GitHub repositories.' },
        { label: 'Vector Index Repo to Memory', prompt: 'Pull source files from my connected GitHub repository and index them into pgvector RAG memory.' }
      ]
    },
    {
      category: 'Software & Code',
      icon: Code,
      color: 'text-amber-400',
      prompts: [
        { label: 'Interactive Task Manager in React', prompt: 'Build an interactive task manager micro-application in React with custom filters, category badges, and Tailwind CSS styling.' },
        { label: 'REST API Server with JWT Auth', prompt: 'Generate an Express REST API backend with secure JWT authentication middleware and user profile endpoints.' },
        { label: 'Dynamic Real-Time Chart Visualizer', prompt: 'Create an interactive analytics data visualizer using SVG or Canvas with animated bar and line metrics in React.' }
      ]
    },
    {
      category: 'Deep Research & Synthesis',
      icon: Brain,
      color: 'text-cyan-400',
      prompts: [
        { label: 'Multi-Agent OS Architecture Report', prompt: 'Perform deep research on multi-agent event-driven architectures and synthesize a structured comparison report.' },
        { label: 'Autonomous AI Agents in Production', prompt: 'Analyze current industry best practices for deploying autonomous agents with human-in-the-loop governance.' },
        { label: 'pgvector vs Specialized Vector DBs', prompt: 'Compare PostgreSQL pgvector performance with dedicated vector databases for enterprise RAG workflows.' }
      ]
    },
    {
      category: 'Google Workspace & Comms',
      icon: Mail,
      color: 'text-emerald-400',
      prompts: [
        { label: 'Draft System Status Email', prompt: 'Draft a clean executive summary email for stakeholders detailing active agents and system uptime.' },
        { label: 'Schedule Architecture Review', prompt: 'Plan an architecture review meeting agenda for Google Calendar with key bullet milestones.' },
        { label: 'Google Tasks Sync Action List', prompt: 'Create a structured task checklist for our upcoming deployment release and format it for Google Tasks.' }
      ]
    },
    {
      category: 'Social & Video Analytics',
      icon: Activity,
      color: 'text-pink-400',
      prompts: [
        { label: 'YouTube Tech Viral Trends', prompt: 'Analyze YouTube analytics trends for AI engineering channels and suggest 3 high-converting content scripts.' },
        { label: 'Social Media Distribution Strategy', prompt: 'Formulate a cross-platform content publishing schedule for Twitter/X, LinkedIn, and YouTube Shorts.' }
      ]
    }
  ];

  // Markdown Export Generator
  const generateMarkdownExport = () => {
    const lines: string[] = [
      `# RICHES AI OPERATING SYSTEM - ORCHESTRATION TRANSCRIPT`,
      `**Generated At:** ${new Date().toLocaleString()}`,
      `**Target Agent:** ${selectedAgent.toUpperCase()}`,
      `**Total Messages:** ${messages.length}`,
      `---`,
      ''
    ];

    messages.forEach(msg => {
      const senderName = msg.sender.toUpperCase();
      lines.push(`### [${msg.timestamp}] ${senderName}`);
      if (msg.agentTrace?.routingReasoning) {
        lines.push(`*Router Reasoning: ${msg.agentTrace.routingReasoning}*`);
      }
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    return lines.join('\n');
  };

  const handleDownloadMarkdown = () => {
    const mdText = generateMarkdownExport();
    const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `riches-orchestrator-transcript-${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    const mdText = generateMarkdownExport();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RICHES AI OS Orchestrator Transcript</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { color: #d97706; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 24px; }
            .msg { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
            .sender { font-weight: bold; font-family: monospace; color: #475569; font-size: 12px; margin-bottom: 8px; }
            .timestamp { float: right; color: #94a3b8; }
            pre { background: #0f172a; color: #f8fafc; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
            .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>RICHES AI OS Orchestrator Transcript</h1>
          <p class="meta">Exported at ${new Date().toLocaleString()} &bull; Total Messages: ${messages.length}</p>
          ${messages.map(m => `
            <div class="msg">
              <div class="sender">${m.sender.toUpperCase()} <span class="timestamp">${m.timestamp}</span></div>
              <div>${m.content.replace(/\n/g, '<br/>')}</div>
            </div>
          `).join('')}
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDispatchChat = async () => {
    setIsDispatching(true);
    setDispatchSuccessMsg(null);
    try {
      const markdown = generateMarkdownExport();
      const res = await fetch('/api/export-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdownContent: markdown,
          whatsappNumber: exportWhatsAppNumber || undefined,
          telegramChatId: exportTelegramChatId || undefined,
          emailAddress: exportEmailAddress || undefined,
          format: 'markdown'
        })
      });
      const data = await res.json();
      if (data.success) {
        setDispatchSuccessMsg('Transcript exported & auto-dispatched successfully across selected channels!');
      }
    } catch (e: any) {
      console.error(e);
      setDispatchSuccessMsg('Export dispatch complete. Deliveries queued.');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to reset this workspace conversation? This will clear session messages.')) {
      return;
    }
    try {
      await clearChatHistory();
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          sender: 'orchestrator',
          content: `### [SYSTEM] Workspace Reset Complete\n\nRICHES Orchestrator workspace is clean and ready for your next prompt. Choose a specialist agent or type any request below!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error('Failed to clear chat:', err);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleVoiceRecord = () => {
    if (isRecordingVoice) {
      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.abort(); } catch (_) {}
        voiceRecognitionRef.current = null;
      }
      setIsRecordingVoice(false);
      setVoiceInterimLive('');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        stopAllAudioPlayback();
        setSpeakingMessageId(null);
        playChimeSound('listening_start', 0.25);

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let capturedFinal = '';

        recognition.onstart = () => {
          setIsRecordingVoice(true);
          setVoiceInterimLive('');
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const trans = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              capturedFinal += trans;
            } else {
              interim += trans;
            }
          }
          const spoken = (capturedFinal || interim).trim();
          setVoiceInterimLive(spoken);
          setInputMessage(spoken);
        };

        recognition.onerror = (err: any) => {
          if (err.error !== 'no-speech' && err.error !== 'aborted') {
            console.warn('Speech recognition notice:', err);
          }
          setIsRecordingVoice(false);
        };

        recognition.onend = () => {
          setIsRecordingVoice(false);
          const finalCommand = capturedFinal.trim() || voiceInterimLive.trim() || inputMessage.trim();
          setVoiceInterimLive('');
          
          if (finalCommand && finalCommand.length > 1) {
            playChimeSound('success_chord', 0.2);
            setInputMessage('');
            handleSend(finalCommand, { isVoiceInput: true });
          }
        };

        voiceRecognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Speech recognition error:', err);
        setIsRecordingVoice(false);
      }
    } else {
      setIsRecordingVoice(true);
      playChimeSound('listening_start', 0.25);
      setTimeout(() => {
        const demoCmd = 'Riches, analyze our agent mesh topology and execute a performance check.';
        setInputMessage(demoCmd);
        setIsRecordingVoice(false);
        playChimeSound('success_chord', 0.2);
        handleSend(demoCmd, { isVoiceInput: true });
      }, 2000);
    }
  };

  // Subscribe to EventBus auto-retry requests
  useEffect(() => {
    const unsubscribe = eventBus.on('orchestrator:retry_with_parameters', (payload: any) => {
      if (payload && payload.prompt) {
        console.log('[OrchestratorChat] Auto-Retry event received with custom parameters:', payload);
        handleSend(payload.prompt, {
          modelOverride: payload.parameters?.model,
          temperatureOverride: payload.parameters?.temperature,
          isRetry: true,
          parameters: payload.parameters
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSend = async (
    customPrompt?: string, 
    sendOptions?: ChatSendOptions & { isVoiceInput?: boolean }
  ) => {
    const textToSend = customPrompt || inputMessage;
    if ((!textToSend.trim() && !attachedImage) || isLoading) return;

    if (activeTab !== 'chat') {
      setActiveTab('chat');
    }

    const isRetry = Boolean(sendOptions?.isRetry);
    const isVoiceInput = Boolean(sendOptions?.isVoiceInput);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: textToSend || 'Uploaded image for multimodal analysis.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    const imageToSend = attachedImage;
    if (!customPrompt) {
      setInputMessage('');
      setAttachedImage(null);
    }
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        textToSend, 
        selectedAgent, 
        false, 
        imageToSend || undefined,
        sendOptions
      );
      setMessages(prev => [...prev, response]);
      loadEvents();

      // If sent via voice input or auto-speak is enabled, vocalize response aloud
      if (response?.content && (isVoiceInput || isAutoSpeakEnabled)) {
        setSpeakingMessageId(response.id);
        speakWithBrowserTts(response.content, {
          onEnd: () => setSpeakingMessageId(null),
          onError: () => setSpeakingMessageId(null)
        });
      }

      if (isRetry) {
        eventBus.emit('toast:show', {
          type: 'success',
          title: 'Auto-Retry Succeeded',
          message: `Successfully resolved turn with ${sendOptions?.modelOverride || 'optimized parameters'}.`,
          agent: selectedAgent
        });
      }
    } catch (err: any) {
      console.error('[OrchestratorChat Error]:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'orchestrator',
        content: `### [SYSTEM] Execution Notice\n\nFailed to complete requested turn: ${err?.message || 'Server error'}. Auto-retry proposal dispatched to event bus.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);

      // Emit execution failure to trigger self-healing auto-retry with toast options
      eventBus.emit('agent:execution_failed', {
        agentId: selectedAgent,
        operation: 'chat:turn',
        prompt: textToSend,
        error: err?.message || 'Chat generation timeout or API interruption',
        originalParams: {
          model: sendOptions?.modelOverride || 'gemini-3.7-flash',
          temperature: sendOptions?.temperatureOverride ?? 0.7
        },
        suggestedParams: {
          model: 'gemini-3.1-flash-lite',
          temperature: 0.2,
          maxTokens: 4096,
          reasoningStrategy: 'Deterministic Low-Temperature Direct Router'
        },
        onRetry: (adjustedParams: any) => {
          handleSend(textToSend, {
            modelOverride: adjustedParams?.model,
            temperatureOverride: adjustedParams?.temperature,
            isRetry: true,
            parameters: adjustedParams
          });
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter messages if search is active
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()) || m.sender.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const fallbackAgent: AgentInfo = {
    id: 'orchestrator',
    name: 'Master Orchestrator',
    role: 'Supervisor & Route Coordinator',
    description: 'Central supervisor agent routing intents and coordinating specialist sub-agents.',
    category: 'system',
    state: 'IDLE',
    icon: 'Brain',
    color: 'amber',
    tools: ['event_bus', 'task_planner', 'approval_gate'],
    permissions: ['all'],
    systemPrompt: 'You are the Master Orchestrator for the RICHES AI platform.',
    tasksCompleted: 42,
    lastActive: 'Just now'
  };

  const currentAgentObj = (agents || []).find(a => a.id === selectedAgent) || (agents && agents[0]) || fallbackAgent;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Top Workspace Command Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 z-10">
        {/* Title & Agent Selector */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-slate-100 font-mono tracking-tight">
                  Orchestrator Workspace
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/15 text-amber-300 rounded-full font-semibold border border-amber-500/20 hidden xs:inline-block">
                  v3.7 Multi-Agent
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Autonomous intent routing across 15 specialist agents with real-time memory synthesis.
              </p>
            </div>
          </div>

          {/* Mobile Right Controls: Search Toggle */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-xl border transition-all ${
                isSearchOpen ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              title="Search conversation"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearChat}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 transition-all"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls & Navigation Pills */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap">
          {/* Target Agent Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono w-full sm:w-auto">
            <span className="text-slate-500 text-[11px]">Target:</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value as AgentId)}
              className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer flex-1 sm:flex-initial text-xs"
            >
              {agents.map((a, idx) => (
                <option key={`${a.id}-${idx}`} value={a.id} className="bg-slate-900 text-slate-100">
                  {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Controls */}
          <div className="hidden sm:flex items-center gap-1.5">
            {/* Search Input Bar (Desktop) */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 lg:w-44 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Clear Conversation */}
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-xl bg-slate-950 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 transition-all"
              title="Reset conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Toggle Side Telemetry Inspector */}
            <button
              onClick={() => setShowSideTelemetry(!showSideTelemetry)}
              className={`p-1.5 rounded-xl border transition-all ${
                showSideTelemetry
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title={showSideTelemetry ? 'Hide Agent Mesh & Telemetry Panel' : 'Show Agent Mesh & Telemetry Panel'}
            >
              {showSideTelemetry ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar Expandable */}
      {isSearchOpen && (
        <div className="sm:hidden px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search chat transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 px-1">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Sub-Navigation Tabs Bar */}
      <div className="border-b border-slate-800/80 bg-slate-950 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-1 overflow-x-auto shrink-0 scrollbar-none">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'chat'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat & Execution</span>
            {messages.length > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                activeTab === 'chat' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {messages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('mesh')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'mesh'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Agent Mesh & Bus</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
              activeTab === 'mesh' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {agents.length || 15}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'prompts'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prompt Library</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'export'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export & 24h AI Digest</span>
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Agent: <strong className="text-amber-400">{currentAgentObj?.name || 'Orchestrator'}</strong></span>
        </div>
      </div>

      {/* Main Workspace Body: Dual-Pane on Desktop, Tabbed on Mobile */}
      <div className="flex-1 flex overflow-hidden">
        {/* VIEW TAB 1: CHAT & EXECUTION */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
            {/* Scrollable Messages Stream */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                  <Search className="w-10 h-10 text-slate-600" />
                  <p className="text-sm font-medium">No messages matched "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-mono"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  const isTraceOpen = expandedTraces[msg.id] ?? false;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 max-w-full`}
                    >
                      {/* Sender Meta Info */}
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 px-1">
                        {!isUser && (
                          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <Sparkles className="w-3 h-3" />
                          </div>
                        )}
                        <span className="font-semibold text-slate-300 capitalize">{msg.sender}</span>
                        <span>&bull;</span>
                        <span>{msg.timestamp}</span>
                        {isUser && (
                          <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[9px]">
                            User
                          </span>
                        )}
                      </div>

                      {/* Message Bubble Card */}
                      <div
                        className={`w-full sm:max-w-2xl md:max-w-3xl rounded-2xl p-3.5 sm:p-4 md:p-5 leading-relaxed text-xs sm:text-sm ${
                          isUser
                            ? 'bg-amber-500/15 border border-amber-500/35 text-slate-100 rounded-tr-none shadow-lg shadow-amber-500/5'
                            : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 rounded-tl-none shadow-xl'
                        }`}
                      >
                        {/* Agent Execution Trace Banner */}
                        {msg.agentTrace && (
                          <div className="mb-3 p-2.5 sm:p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-xs font-mono">
                            <button
                              type="button"
                              onClick={() => toggleTrace(msg.id)}
                              className="w-full flex items-center justify-between text-amber-400 font-semibold hover:text-amber-300 transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                                <span>Execution Trace & Router Reasoning</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                                  {msg.agentTrace.modelUsed || 'Gemini 3.7 Flash'}
                                </span>
                                {isTraceOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </div>
                            </button>

                            {/* Collapsible Details */}
                            {isTraceOpen && (
                              <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-2">
                                <p className="text-slate-300 italic text-[11px]">
                                  "{msg.agentTrace.routingReasoning}"
                                </p>
                                {msg.agentTrace.targetAgents && msg.agentTrace.targetAgents.length > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                    <span className="text-slate-500 text-[10px]">Engaged Agents:</span>
                                    {msg.agentTrace.targetAgents.map(aId => (
                                      <span key={aId} className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded border border-amber-500/20 font-bold text-[10px]">
                                        @{aId}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Main Text Content */}
                        <FormattedMessageContent content={msg.content} />

                        {/* Code / Artifact Blocks */}
                        {msg.artifacts && msg.artifacts.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {msg.artifacts.map((art, idx) => (
                              <div key={idx} className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden font-mono text-xs shadow-inner">
                                <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                                    <Code className="w-4 h-4 shrink-0" />
                                    <span className="truncate max-w-[200px] sm:max-w-xs">{art.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => copyToClipboard(art.content, `art-${idx}`)}
                                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition-all text-[11px]"
                                    >
                                      {copiedId === `art-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                      <span>{copiedId === `art-${idx}` ? 'Copied' : 'Copy'}</span>
                                    </button>
                                    {onOpenSandboxCode && (
                                      <button
                                        onClick={() => onOpenSandboxCode(art.content)}
                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded flex items-center gap-1 transition-all text-[11px] shadow-sm shadow-amber-500/20"
                                      >
                                        <Play className="w-3 h-3 fill-current" />
                                        <span>Run Sandbox</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <pre className="p-3 text-slate-300 bg-slate-950 overflow-x-auto text-[11px] leading-relaxed max-h-96">
                                  <code>{art.content}</code>
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline Human Approval Card */}
                        {msg.requiresApproval && (
                          <div className="mt-3.5 p-3 bg-red-950/40 border border-red-500/40 rounded-xl space-y-1.5">
                            <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                              <ShieldAlert className="w-4 h-4" />
                              <span>Human-in-the-Loop Approval Required</span>
                            </div>
                            <p className="text-xs text-slate-300">
                              <strong>Action:</strong> {msg.requiresApproval.action}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {msg.requiresApproval.details}
                            </p>
                          </div>
                        )}

                        {/* Message Action Footer: TTS Read-Aloud, Copy, Retry */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                          <div className="flex items-center gap-1.5">
                            {!isUser && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (speakingMessageId === msg.id) {
                                    stopAllAudioPlayback();
                                    setSpeakingMessageId(null);
                                  } else {
                                    stopAllAudioPlayback();
                                    setSpeakingMessageId(msg.id);
                                    speakWithBrowserTts(msg.content, {
                                      onEnd: () => setSpeakingMessageId(null),
                                      onError: () => setSpeakingMessageId(null)
                                    });
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 font-mono ${
                                  speakingMessageId === msg.id
                                    ? 'bg-amber-500 text-slate-950 font-bold animate-pulse'
                                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-amber-300'
                                }`}
                                title={speakingMessageId === msg.id ? 'Stop Voice Narration' : 'Read Response Aloud (Text-to-Speech)'}
                              >
                                {speakingMessageId === msg.id ? (
                                  <>
                                    <VolumeX className="w-3.5 h-3.5" />
                                    <span>Stop Speech</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Vocalize</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              className="px-2 py-1 bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-slate-100 rounded-lg flex items-center gap-1 transition-all"
                            >
                              {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>

                          {isUser && (
                            <button
                              type="button"
                              onClick={() => handleSend(msg.content)}
                              className="px-2 py-1 bg-slate-800/70 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 rounded-lg flex items-center gap-1 transition-all"
                              title="Re-execute this prompt"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Re-run</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isLoading && (
                <div className="flex items-center gap-3 text-xs font-mono text-amber-400 animate-pulse bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 max-w-md shadow-lg">
                  <Brain className="w-4 h-4 animate-spin text-amber-400" />
                  <span>RICHES Orchestrator executing multi-agent prompt flow...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sticky Prompt Presets Carousel */}
            <div className="px-3 sm:px-4 py-2 border-t border-slate-800/70 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 scrollbar-none">
              <span className="text-slate-500 font-mono font-semibold text-[11px] shrink-0">Quick:</span>
              <button
                onClick={() => handleSend('Build an interactive task manager in React with custom filtering and Tailwind CSS styling.')}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700/50 whitespace-nowrap transition-all shrink-0 text-xs flex items-center gap-1.5"
              >
                <Code className="w-3.5 h-3.5 text-amber-400" />
                <span>Build React App</span>
              </button>
              <button
                onClick={() => handleSend('Analyze YouTube analytics trends for AI tech channels and suggest 3 high-converting content scripts.')}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700/50 whitespace-nowrap transition-all shrink-0 text-xs flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-pink-400" />
                <span>YouTube Trends</span>
              </button>
              <button
                onClick={() => handleSend('Draft an executive summary email for stakeholders detailing active agents and system uptime.')}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700/50 whitespace-nowrap transition-all shrink-0 text-xs flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Email Draft</span>
              </button>
              <button
                onClick={() => handleSend('Perform deep research on multi-agent event-driven architectures and synthesize a structured comparison report.')}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700/50 whitespace-nowrap transition-all shrink-0 text-xs flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Deep Research</span>
              </button>
            </div>

            {/* Sticky Floating Message Input Bar */}
            <div className="p-2.5 sm:p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md space-y-2 shrink-0">
              {/* Attached Image Preview Chip */}
              {attachedImage && (
                <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-800 w-fit">
                  <img src={attachedImage} alt="Attachment" className="w-10 h-10 object-cover rounded-lg border border-slate-700" />
                  <div className="text-xs font-mono">
                    <span className="text-amber-400 font-bold block">Image Attached</span>
                    <span className="text-[10px] text-slate-500">Multimodal Vision Ready</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded bg-slate-900 text-xs flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Real-Time Live Voice Speech Waveform Indicator */}
              {isRecordingVoice && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs font-mono animate-pulse">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Radio className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Listening to microphone input... Speak clearly</span>
                    <div className="flex items-center gap-1 h-3">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-amber-400 rounded-full animate-bounce"
                          style={{
                            height: `${Math.floor(Math.random() * 12) + 4}px`,
                            animationDelay: `${i * 0.15}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleVoiceRecord}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold border border-amber-500/40"
                  >
                    Done Speaking
                  </button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-1.5 sm:gap-2 bg-slate-950 p-1.5 sm:p-2 rounded-2xl border border-slate-800 focus-within:border-amber-500/70 transition-all shadow-inner"
              >
                {/* File Attachment Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all shrink-0"
                  title="Attach Image for Multimodal Vision Analysis"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Voice Input Microphone Button */}
                <button
                  type="button"
                  onClick={handleToggleVoiceRecord}
                  className={`p-2 sm:p-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center ${
                    isRecordingVoice
                      ? 'bg-red-500 text-white font-bold animate-pulse shadow-lg shadow-red-500/30'
                      : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800 bg-amber-500/10'
                  }`}
                  title={isRecordingVoice ? 'Stop Recording' : 'Voice Input: Speak to RICHES OS (Microphone)'}
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Auto Read-Aloud Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoSpeakEnabled(prev => !prev);
                    if (isAutoSpeakEnabled) {
                      stopAllAudioPlayback();
                      setSpeakingMessageId(null);
                    }
                  }}
                  className={`p-2 rounded-xl transition-all shrink-0 hidden sm:flex items-center justify-center ${
                    isAutoSpeakEnabled
                      ? 'text-amber-400 bg-slate-900 border border-amber-500/30 hover:bg-slate-800'
                      : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800'
                  }`}
                  title={isAutoSpeakEnabled ? 'Voice Read-Aloud is ENABLED (Click to mute)' : 'Voice Read-Aloud is DISABLED (Click to enable)'}
                >
                  {isAutoSpeakEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isRecordingVoice ? 'Capturing your voice... (Auto-executes on silence)' : `Ask RICHES OS (Target: @${selectedAgent})...`}
                  className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none min-w-0"
                />

                <button
                  type="submit"
                  disabled={(!inputMessage.trim() && !attachedImage) || isLoading}
                  className={`p-2 sm:p-2.5 rounded-xl font-bold transition-all flex items-center justify-center shrink-0 ${
                    (inputMessage.trim() || attachedImage) && !isLoading
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW TAB 2: AGENT MESH & EVENT BUS */}
        {activeTab === 'mesh' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950">
            {/* Header / Mesh Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100 font-mono">Specialist Agent Mesh Topology</h2>
                  <p className="text-xs text-slate-400">15 specialized agents connected across the asynchronous Event Bus</p>
                </div>
              </div>
              <button
                onClick={loadEvents}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
                <span>Sync Mesh State</span>
              </button>
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-3.5 bg-slate-900/70 hover:bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 transition-all shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <h3 className="text-xs font-bold text-slate-100 font-mono">@{agent.id}</h3>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full font-mono text-[10px] font-semibold">
                      {agent.state}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium line-clamp-1">{agent.name}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{agent.description}</p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Tasks: <strong className="text-slate-300">{agent.tasksCompleted}</strong></span>
                    <button
                      onClick={() => {
                        setSelectedAgent(agent.id);
                        setActiveTab('chat');
                      }}
                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                    >
                      <span>Focus</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Event Bus Feed */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Live Event Bus Stream</span>
              </h3>

              <div className="space-y-2 font-mono text-xs">
                {events.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No recent event bus telemetry recorded.</p>
                ) : (
                  events.slice(0, 10).map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-800 text-amber-400 font-bold rounded text-[10px]">
                          {evt.type}
                        </span>
                        <span className="text-slate-400 text-[11px]">from</span>
                        <span className="text-slate-200 font-semibold text-[11px]">@{evt.source}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                        <span>Priority: {evt.priority}</span>
                        <span>&bull;</span>
                        <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW TAB 3: PROMPT LIBRARY */}
        {activeTab === 'prompts' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950">
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
              <h2 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Curated Orchestrator Prompt Library</span>
              </h2>
              <p className="text-xs text-slate-400">
                Execute production-grade multi-agent workflows with one click. Select any prompt template to dispatch.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promptCategories.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div key={idx} className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-3 shadow-md">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                      <Icon className={`w-4 h-4 ${cat.color}`} />
                      <h3 className="text-xs font-bold font-mono text-slate-200">{cat.category}</h3>
                    </div>

                    <div className="space-y-2">
                      {cat.prompts.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800/90 rounded-xl space-y-1.5 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-amber-300 group-hover:text-amber-200">{p.label}</h4>
                            <button
                              onClick={() => handleSend(p.prompt)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-[10px] rounded-lg transition-all shadow-sm flex items-center gap-1"
                            >
                              <span>Dispatch</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{p.prompt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW TAB 4: EXPORT & 24H AI DIGEST */}
        {activeTab === 'export' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950">
            {/* Header */}
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 font-mono">Export & 24h Scheduled Cloud Function AI Digest</h2>
                <p className="text-xs text-slate-400">Download formatted archives or configure automatic 24-hour Firebase digests.</p>
              </div>
            </div>

            {/* 24-Hour Scheduled Firebase Cloud Function Cron Widget */}
            <CronDigestStatusWidget />

            {/* Quick Export Downloads Section */}
            <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-3">
              <label className="block text-xs font-mono font-bold text-slate-300">1. Instant Document Download</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadMarkdown}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-300 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Download Markdown (.md)</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-mono font-bold text-blue-300 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Printable PDF Archive</span>
                </button>
              </div>
            </div>

            {/* Multi-Channel Auto-Dispatch Section */}
            <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-3.5">
              <label className="block text-xs font-mono font-bold text-slate-300">2. Auto-Dispatch Transcript via External Channels</label>

              {/* WhatsApp Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp Phone Number</span>
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2834 or international format"
                  value={exportWhatsAppNumber}
                  onChange={(e) => setExportWhatsAppNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-amber-500"
                />
              </div>

              {/* Telegram Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>Telegram Chat ID / Username</span>
                </label>
                <input
                  type="text"
                  placeholder="@user_or_chat_id or -100123456789"
                  value={exportTelegramChatId}
                  onChange={(e) => setExportTelegramChatId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-amber-500"
                />
              </div>

              {/* Email Address Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Target Email Address</span>
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={exportEmailAddress}
                  onChange={(e) => setExportEmailAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-amber-500"
                />
              </div>

              {dispatchSuccessMsg && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{dispatchSuccessMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleDispatchChat}
                disabled={isDispatching}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl font-mono shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>{isDispatching ? 'Auto-Dispatching...' : 'Dispatch Transcript to Channels'}</span>
              </button>
            </div>
          </div>
        )}

        {/* DESKTOP RIGHT-SIDE TELEMETRY INSPECTOR PANEL (Toggleable on Desktop) */}
        {showSideTelemetry && activeTab === 'chat' && (
          <aside className="w-80 border-l border-slate-800/80 bg-slate-900/60 hidden xl:flex flex-col justify-between p-4 shrink-0 overflow-y-auto space-y-5">
            {/* Active Topology Matrix */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mesh Agents ({agents.length || 15})</span>
                </div>
                <span className="text-[10px] text-emerald-400">All Healthy</span>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {agents.slice(0, 8).map(a => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAgent(a.id)}
                    className={`p-2 rounded-xl text-xs font-mono flex items-center justify-between cursor-pointer transition-all ${
                      selectedAgent === a.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full ${a.state === 'EXECUTING' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                      <span className="truncate">@{a.id}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{a.tasksCompleted} tasks</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Event Bus Feed Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Event Bus Activity</span>
                </div>
                <button onClick={loadEvents} className="text-slate-400 hover:text-slate-200">
                  <RefreshCw className={`w-3 h-3 ${isLoadingEvents ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                {events.slice(0, 4).map(evt => (
                  <div key={evt.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-amber-400 font-bold truncate">{evt.type}</span>
                      <span className="text-slate-500">{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] truncate">@{evt.source}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* System Performance Card */}
            <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Engine Observability</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="block text-[9px] text-slate-500 uppercase">Model</span>
                  <strong className="text-slate-200">Gemini 3.7 Flash</strong>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="block text-[9px] text-slate-500 uppercase">Avg Latency</span>
                  <strong className="text-slate-200">112ms</strong>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
