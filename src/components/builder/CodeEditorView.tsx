import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Code, 
  Play, 
  Download,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { ProjectFile } from './ProjectTemplates';

interface CodeEditorViewProps {
  files?: ProjectFile[];
  activeFilePath?: string;
  onSelectFile: (path: string) => void;
  onUpdateCode: (path: string, newContent: string) => void;
  onRunCompilation: () => void;
}

export const CodeEditorView: React.FC<CodeEditorViewProps> = ({
  files = [],
  activeFilePath,
  onSelectFile,
  onUpdateCode,
  onRunCompilation
}) => {
  const [copied, setCopied] = useState(false);
  const activeFile = (files || []).find(f => f.path === activeFilePath) || files?.[0];

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = activeFile ? activeFile.content.split('\n').length : 1;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden font-mono text-xs">
      {/* Tabbed Open Files Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 flex items-center overflow-x-auto no-scrollbar">
        {(files || []).map(file => {
          const isActive = file.path === activeFilePath;
          return (
            <button
              key={file.path}
              onClick={() => onSelectFile(file.path)}
              className={`px-3 py-2 border-r border-slate-800/80 flex items-center gap-2 text-[11px] shrink-0 transition-all ${
                isActive
                  ? 'bg-slate-950 text-amber-400 font-bold border-t-2 border-t-amber-400'
                  : 'text-slate-400 hover:bg-slate-950/50 hover:text-slate-200'
              }`}
            >
              <Code className="w-3 h-3 text-slate-500" />
              <span>{file.name}</span>
            </button>
          );
        })}
      </div>

      {/* Code Editor Header Controls */}
      <div className="p-2.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-2 text-slate-400 truncate">
          <span className="text-amber-400 font-bold">{activeFile?.path}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">{activeFile?.language.toUpperCase()}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 transition-all"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={onRunCompilation}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Apply & Render</span>
          </button>
        </div>
      </div>

      {/* Code Editor Area with Line Numbers */}
      <div className="flex-1 flex overflow-hidden bg-slate-950">
        {/* Line Numbers */}
        <div className="w-10 bg-slate-900/40 border-r border-slate-800/60 py-3 text-slate-600 text-right pr-2 select-none font-mono text-[11px] leading-relaxed">
          {lineNumbers.map(n => (
            <div key={n}>{n}</div>
          ))}
        </div>

        {/* Textarea Code Input */}
        <textarea
          value={activeFile?.content || ''}
          onChange={(e) => activeFile && onUpdateCode(activeFile.path, e.target.value)}
          placeholder="// Code here..."
          className="flex-1 bg-transparent p-3 text-slate-200 focus:outline-none leading-relaxed resize-none font-mono text-xs overflow-y-auto"
          spellCheck={false}
        />
      </div>
    </div>
  );
};
