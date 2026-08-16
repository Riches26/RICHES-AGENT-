import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OrchestratorChat } from './components/OrchestratorChat';
import { AgentCommandCenter } from './components/AgentCommandCenter';
import { PlannerDAG } from './components/PlannerDAG';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { PluginStore } from './components/PluginStore';
import { MemoryEngine } from './components/MemoryEngine';
import { BuilderSandbox } from './components/BuilderSandbox';
import { VoiceStudio } from './components/VoiceStudio';
import { SecurityApprovals } from './components/SecurityApprovals';
import { GoogleWorkspaceHub } from './components/GoogleWorkspaceHub';
import { JarvisAutonomousEngine } from './components/JarvisAutonomousEngine';
import { GlobalVoiceAssistantHUD } from './components/GlobalVoiceAssistantHUD';
import { ToastContainer } from './components/Toast';

import { AgentInfo, ChatMessage, PendingApproval, PluginItem } from './types';
import { fetchAgents, fetchPendingApprovals, fetchPlugins, fetchChatHistory } from './services/api';

export default function App() {
  const [activeView, setActiveView] = useState<string>('workspace');
  const [viewHistory, setViewHistory] = useState<string[]>(['workspace']);
  const [isListeningWakeWord, setIsListeningWakeWord] = useState<boolean>(false);
  const [sandboxCode, setSandboxCode] = useState<string | undefined>(undefined);

  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'orchestrator',
      content: `### [SYSTEM] Welcome to RICHES AI Operating System

I am **RICHES**, a production-grade, event-driven multi-agent platform powered by Gemini 2.5 Flash and specialist sub-agent execution pipelines.

#### Active Specialist Sub-Agents
- **@builder**: Full-stack web software, API, and containerized sandbox generation.
- **@task**: Task agendas, scheduling reminders, and recurring cron management.
- **@research**: Deep web research, paper synthesis, and citation extraction.
- **@analytics**: YouTube, Instagram, and OS latency/token observability.
- **@communications**: Google Workspace Gmail email drafting & Calendar scheduling.
- **@knowledge**: Document ingestion (PDF/DOCX) & pgvector semantic RAG.
- **@github**: Repository management, commits, and pull request workflows.
- **@database**: Relational SQL & vector schema architecture.
- **@security**: Zero-trust human-in-the-loop approval queue enforcer.

*Select a preset prompt below or type any prompt to start executing across the Event Bus!*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Navigate view with history stack push
  const handleNavigate = (newView: string) => {
    if (newView === activeView) return;
    setViewHistory(prev => [...prev, newView]);
    setActiveView(newView);
    window.history.pushState({ view: newView }, '', `#${newView}`);
  };

  // Back navigation function
  const handleGoBack = () => {
    if (viewHistory.length <= 1) return;
    const newHistory = [...viewHistory];
    newHistory.pop(); // remove current view
    const previousView = newHistory[newHistory.length - 1];
    setViewHistory(newHistory);
    setActiveView(previousView);
  };

  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setActiveView(e.state.view);
        setViewHistory(prev => {
          if (prev.length > 1) {
            const next = [...prev];
            next.pop();
            return next;
          }
          return prev;
        });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Initial data load from Firestore
    fetchAgents().then(setAgents).catch(console.error);
    fetchPendingApprovals().then(setApprovals).catch(console.error);
    fetchPlugins().then(setPlugins).catch(console.error);

    // Load saved Firestore chat conversations
    fetchChatHistory().then(history => {
      if (history && history.length > 0) {
        setMessages(history);
      }
    }).catch(console.error);
  }, []);

  const handleOpenSandboxCode = (code: string) => {
    setSandboxCode(code);
    handleNavigate('builder');
  };

  const handleTriggerAgentTest = (agentId: string) => {
    console.log(`Triggering test for agent ${agentId}`);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Global Toast Notification System in App Root */}
      <ToastContainer />

      {/* Sidebar - Desktop persistent, Mobile toggleable drawer */}
      <Sidebar
        activeView={activeView}
        setActiveView={handleNavigate}
        onNavigate={handleNavigate}
        pendingApprovalsCount={(approvals || []).filter(a => a.status === 'pending').length}
        approvalsCount={(approvals || []).filter(a => a.status === 'pending').length}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          activeView={activeView}
          setActiveView={handleNavigate}
          onNavigate={handleNavigate}
          onBack={handleGoBack}
          onGoBack={handleGoBack}
          canGoBack={viewHistory.length > 1}
          isListeningWakeWord={isListeningWakeWord}
          setIsListeningWakeWord={setIsListeningWakeWord}
          pendingApprovalsCount={(approvals || []).filter(a => a.status === 'pending').length}
          activeAgentsCount={agents.filter(a => a.state !== 'IDLE').length || 15}
          apiLatencyMs={42}
          agents={agents}
          onSelectSandboxCode={handleOpenSandboxCode}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {activeView === 'workspace' && (
            <OrchestratorChat
              agents={agents}
              onNavigate={handleNavigate}
              messages={messages}
              setMessages={setMessages}
              onOpenSandboxCode={handleOpenSandboxCode}
            />
          )}

          {activeView === 'jarvis' && (
            <JarvisAutonomousEngine />
          )}

          {activeView === 'google_workspace' && (
            <GoogleWorkspaceHub />
          )}

          {activeView === 'agents' && (
            <AgentCommandCenter
              agents={agents}
              onTriggerAgentTest={handleTriggerAgentTest}
            />
          )}

          {activeView === 'planner' && (
            <PlannerDAG />
          )}

          {activeView === 'builder' && (
            <BuilderSandbox initialCode={sandboxCode} />
          )}

          {activeView === 'analytics' && (
            <AnalyticsDashboard />
          )}

          {activeView === 'plugins' && (
            <PluginStore plugins={plugins} setPlugins={setPlugins} />
          )}

          {activeView === 'memory' && (
            <MemoryEngine />
          )}

          {activeView === 'voice' && (
            <VoiceStudio
              isListeningWakeWord={isListeningWakeWord}
              setIsListeningWakeWord={setIsListeningWakeWord}
              onNavigateToView={setActiveView}
            />
          )}

          {activeView === 'security' && (
            <SecurityApprovals
              approvals={approvals}
              setApprovals={setApprovals}
            />
          )}
        </main>
      </div>

      {/* Global Voice & Wake-Word Floating Assistant HUD (Accessible anywhere in OS) */}
      <GlobalVoiceAssistantHUD
        isListeningWakeWord={isListeningWakeWord}
        setIsListeningWakeWord={setIsListeningWakeWord}
        onNavigateToView={handleNavigate}
        activeView={activeView}
      />
    </div>
  );
}
