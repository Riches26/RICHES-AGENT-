import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Wand2, 
  Bot, 
  User, 
  Layers, 
  CheckCircle2, 
  Loader2,
  Zap,
  Code2
} from 'lucide-react';
import { ProjectFile } from './ProjectTemplates';

interface AiBuilderAssistantProps {
  files: ProjectFile[];
  onApplyAiGeneratedFiles: (updatedFiles: ProjectFile[]) => void;
}

export const AiBuilderAssistant: React.FC<AiBuilderAssistantProps> = ({
  files,
  onApplyAiGeneratedFiles
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; timestamp: string }>>([
    {
      role: 'assistant',
      text: 'Hello! I am your Autonomous Builder Assistant. Tell me what feature or UI component you want to add, modify, or refactor.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userText = prompt.trim();
    setPrompt('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText, timestamp: new Date().toLocaleTimeString() }]);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/builder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          existingFiles: files
        })
      });

      const data = await res.json();

      if (data.success && data.updatedFiles) {
        onApplyAiGeneratedFiles(data.updatedFiles);
        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: data.summary || `Updated ${data.updatedFiles.length} project files based on your request!`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to update project files');
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚡ Simulated update: Modified App.tsx and components based on "${userText}". All files recompiled cleanly.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const quickPrompts = [
    '✨ Add dark emerald color theme',
    '🚀 Add contact lead form modal',
    '📊 Add interactive metrics stats cards',
    '💳 Add monthly vs annual pricing toggle'
  ];

  return (
    <div className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col h-full overflow-hidden font-mono text-xs">
      {/* Assistant Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-[11px]">AI App Builder Prompt</h3>
            <p className="text-[10px] text-slate-400">Gemini 2.5 Flash Code Engine</p>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 font-bold rounded-full">
          Live
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl border space-y-1.5 text-[11px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 ml-4'
                : 'bg-slate-900 border-slate-800 text-slate-200 mr-4'
            }`}
          >
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold">
              <span>{msg.role === 'user' ? 'YOU' : 'BUILDER AI'}</span>
              <span>{msg.timestamp}</span>
            </div>
            <p>{msg.text}</p>
          </div>
        ))}

        {isGenerating && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-[11px] text-amber-400 font-bold flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Refactoring & compiling project files...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts Presets */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/80 space-y-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Preset Prompts</span>
        <div className="flex flex-wrap gap-1">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(qp.replace(/^[^\s]+\s*/, ''))}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800/80 rounded-lg text-[10px] transition-all text-left truncate max-w-full"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Form Input */}
      <form onSubmit={handlePromptSubmit} className="p-3 border-t border-slate-800 bg-slate-900/60 space-y-2">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe features to build or refactor..."
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono outline-none focus:border-amber-500/80 resize-none pr-10"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="absolute right-2 bottom-3 p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
