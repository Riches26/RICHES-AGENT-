import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Play, 
  Terminal, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  RefreshCw,
  Eye,
  FolderTree,
  Layout,
  MessageSquare,
  Package,
  Wand2,
  CheckCircle2,
  Save,
  Trash2,
  FolderOpen,
  Cloud
} from 'lucide-react';
import { FileExplorer } from './builder/FileExplorer';
import { CodeEditorView } from './builder/CodeEditorView';
import { ResponsivePreview } from './builder/ResponsivePreview';
import { AiBuilderAssistant } from './builder/AiBuilderAssistant';
import { PROJECT_TEMPLATES, ProjectFile, ProjectTemplate, DEFAULT_SAAS_TEMPLATE } from './builder/ProjectTemplates';
import { fetchBuilderProjects, saveBuilderProject, deleteBuilderProject, BuilderProjectRecord } from '../services/api';

interface BuilderSandboxProps {
  initialCode?: string;
}

export const BuilderSandbox: React.FC<BuilderSandboxProps> = ({ initialCode }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate>(PROJECT_TEMPLATES[0]);
  const [files, setFiles] = useState<ProjectFile[]>(PROJECT_TEMPLATES[0].files);
  const [activeFilePath, setActiveFilePath] = useState<string>('src/App.tsx');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');
  const [showFileExplorer, setShowFileExplorer] = useState<boolean>(true);
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [showSavedProjectsModal, setShowSavedProjectsModal] = useState<boolean>(false);
  const [savedProjects, setSavedProjects] = useState<BuilderProjectRecord[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Sandbox Ready');

  // Load saved projects list on mount
  useEffect(() => {
    loadSavedProjects();
  }, []);

  const loadSavedProjects = async () => {
    try {
      const projs = await fetchBuilderProjects();
      setSavedProjects(projs);
    } catch (e) {
      console.error('Error fetching builder projects:', e);
    }
  };

  // Load initial code if passed into props
  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      setFiles(prev => {
        const hasApp = prev.some(f => f.path === 'src/App.tsx');
        if (hasApp) {
          return prev.map(f => f.path === 'src/App.tsx' ? { ...f, content: initialCode } : f);
        } else {
          return [
            ...prev,
            {
              path: 'src/App.tsx',
              name: 'App.tsx',
              folder: 'src',
              language: 'typescript',
              content: initialCode,
              isMainEntry: true
            }
          ];
        }
      });
      setActiveFilePath('src/App.tsx');
      setStatusMessage('Loaded code from Orchestrator Workspace');
    }
  }, [initialCode]);

  // File CRUD Operations
  const handleSelectFile = (path: string) => {
    setActiveFilePath(path);
  };

  const handleCreateFile = (path: string) => {
    const fileName = path.split('/').pop() || path;
    const folder = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : 'root';
    const newFile: ProjectFile = {
      path,
      name: fileName,
      folder,
      language: fileName.endsWith('.json') ? 'json' : (fileName.endsWith('.css') ? 'css' : 'typescript'),
      content: fileName.endsWith('.css') ? '/* Custom Styles */\n' : `import React from 'react';\n\nexport default function ${fileName.replace(/\.[^/.]+$/, '')}() {\n  return (\n    <div className="p-6 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl space-y-2">\n      <h2 className="font-bold text-amber-400 text-base font-mono">${fileName}</h2>\n      <p className="text-xs text-slate-400 font-mono">Custom component rendered inside RICHES Sandbox.</p>\n    </div>\n  );\n}`
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFilePath(path);
    setStatusMessage(`Created file ${path}`);
  };

  const handleDeleteFile = (path: string) => {
    setFiles(prev => prev.filter(f => f.path !== path));
    if (activeFilePath === path) {
      setActiveFilePath('src/App.tsx');
    }
    setStatusMessage(`Deleted file ${path}`);
  };

  const handleUpdateCode = (path: string, newContent: string) => {
    setFiles(prev => prev.map(f => f.path === path ? { ...f, content: newContent } : f));
  };

  const handleApplyAiGeneratedFiles = (updatedFiles: ProjectFile[]) => {
    setFiles(updatedFiles);
    setStatusMessage(`Applied & saved changes to Firestore (${updatedFiles.length} files)`);
    loadSavedProjects();
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setFiles(template.files);
    setActiveFilePath('src/App.tsx');
    setShowTemplateModal(false);
    setCurrentProjectId(null);
    setStatusMessage(`Loaded template: ${template.title}`);
  };

  // Save current project state directly to Firestore
  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      const saved = await saveBuilderProject({
        id: currentProjectId || undefined,
        title: selectedTemplate.title || 'Custom App Build',
        description: selectedTemplate.description || 'Application created in RICHES Builder',
        files: files.map(f => ({
          path: f.path,
          name: f.name,
          folder: f.folder,
          language: f.language,
          content: f.content,
          isMainEntry: f.isMainEntry
        }))
      });
      if (saved && saved.id) {
        setCurrentProjectId(saved.id);
        setStatusMessage(`Saved "${saved.title}" to Firestore cloud database.`);
        loadSavedProjects();
      }
    } catch (e: any) {
      setStatusMessage(`Save failed: ${e?.message || 'Error saving'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Load a saved project from Firestore
  const handleLoadSavedProject = (proj: BuilderProjectRecord) => {
    setCurrentProjectId(proj.id);
    setSelectedTemplate({
      id: proj.id,
      title: proj.title,
      description: proj.description || '',
      category: (proj.category as any) || 'SaaS App',
      files: proj.files.map(f => ({
        path: f.path,
        name: f.name,
        folder: f.folder || 'src',
        language: f.language || 'typescript',
        content: f.content,
        isMainEntry: f.isMainEntry
      }))
    });
    setFiles(proj.files.map(f => ({
      path: f.path,
      name: f.name,
      folder: f.folder || 'src',
      language: f.language || 'typescript',
      content: f.content,
      isMainEntry: f.isMainEntry
    })));
    setActiveFilePath('src/App.tsx');
    setShowSavedProjectsModal(false);
    setStatusMessage(`Loaded saved project: ${proj.title}`);
  };

  const handleDeleteSavedProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteBuilderProject(id);
      setSavedProjects(prev => prev.filter(p => p.id !== id));
      if (currentProjectId === id) setCurrentProjectId(null);
      setStatusMessage('Project deleted from Firestore.');
    } catch (err: any) {
      setStatusMessage(`Failed to delete project: ${err.message}`);
    }
  };

  // Export Full Project as Runnable ZIP / Download
  const handleExportProject = () => {
    const projectContent = files.map(f => `// =========================================\n// File: ${f.path}\n// =========================================\n${f.content}`).join('\n\n\n');
    const blob = new Blob([projectContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedTemplate.id}-riches-build.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatusMessage('Exported project bundle');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden font-mono">
      {/* Top Builder Navbar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            className={`p-2 rounded-xl border transition-all ${
              showFileExplorer ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Toggle File Explorer"
          >
            <FolderTree className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
              <Layout className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-100 text-xs sm:text-sm truncate">{selectedTemplate.title}</h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold rounded-full border border-emerald-500/30 shrink-0">
                  <Cloud className="w-3 h-3" /> Firestore Synced
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* View Layout Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Saved Projects Button */}
          <button
            onClick={() => {
              loadSavedProjects();
              setShowSavedProjectsModal(true);
            }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1.5 transition-all font-bold text-xs border border-slate-700"
            title="Open saved projects from Firestore"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Saved ({savedProjects.length})</span>
          </button>

          {/* Template Modal Opener */}
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1.5 transition-all font-bold text-xs border border-slate-700"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Templates</span>
          </button>

          {/* Save to Firestore Button */}
          <button
            onClick={handleSaveToCloud}
            disabled={isSaving}
            className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-500/60 rounded-xl flex items-center gap-1.5 transition-all font-bold text-xs"
            title="Save current code files to Firestore"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          {/* View Tab Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'editor' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`hidden md:block px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'split' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'preview' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Toggle AI Assistant Drawer */}
          <button
            onClick={() => setShowAiAssistant(!showAiAssistant)}
            className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs ${
              showAiAssistant ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Builder</span>
          </button>

          {/* Export Project Button */}
          <button
            onClick={handleExportProject}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Builder Workspace Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Folder Explorer */}
        {showFileExplorer && (
          <div className="absolute md:relative z-30 h-full shadow-2xl md:shadow-none">
            <FileExplorer
              files={files}
              activeFilePath={activeFilePath}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
            />
          </div>
        )}

        {/* Center: Code Editor / Live Preview / Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {(activeTab === 'editor' || activeTab === 'split') && (
            <div className={`${activeTab === 'split' ? 'w-full md:w-1/2 border-r border-slate-800' : 'w-full'} h-full flex flex-col`}>
              <CodeEditorView
                files={files}
                activeFilePath={activeFilePath}
                onSelectFile={handleSelectFile}
                onUpdateCode={handleUpdateCode}
                onRunCompilation={() => setStatusMessage('Recompiled code into preview')}
              />
            </div>
          )}

          {(activeTab === 'preview' || activeTab === 'split') && (
            <div className={`${activeTab === 'split' ? 'w-full md:w-1/2' : 'w-full'} h-full flex flex-col`}>
              <ResponsivePreview
                files={files}
              />
            </div>
          )}
        </div>

        {/* Right AI Prompt Assistant Chat Drawer */}
        {showAiAssistant && (
          <div className="absolute right-0 top-0 z-30 h-full shadow-2xl">
            <AiBuilderAssistant
              files={files}
              onApplyAiGeneratedFiles={handleApplyAiGeneratedFiles}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-2 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-[11px] text-slate-400 px-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{statusMessage}</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span>{files.length} active files</span>
          <span>Active: {activeFilePath}</span>
        </div>
      </div>

      {/* Saved Projects Modal */}
      {showSavedProjectsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">Firestore Saved Projects</h3>
              </div>
              <button onClick={() => setShowSavedProjectsModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            {savedProjects.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <p>No saved projects in Firestore yet.</p>
                <p className="text-[11px] text-slate-500">Generate an app using the AI Builder or click "Save" to persist your project.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {savedProjects.map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => handleLoadSavedProject(proj)}
                    className="p-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all space-y-2 group relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 text-xs truncate max-w-[180px]">{proj.title}</span>
                      <button
                        onClick={(e) => handleDeleteSavedProject(proj.id, e)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{proj.description || 'Custom Project'}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                      <span>{proj.files.length} Files</span>
                      <span className="text-amber-400 group-hover:underline">Load Project →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Select Starter Project Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROJECT_TEMPLATES.map(tmpl => (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="p-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 text-xs">{tmpl.title}</span>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] rounded border border-amber-500/20">
                      {tmpl.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{tmpl.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                    <span>{tmpl.files.length} Files</span>
                    <span className="text-amber-400 group-hover:underline">Load Template →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
