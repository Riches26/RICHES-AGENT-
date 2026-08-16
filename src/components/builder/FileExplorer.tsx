import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Search,
  FileJson,
  FileText
} from 'lucide-react';
import { ProjectFile } from './ProjectTemplates';

interface FileExplorerProps {
  files: ProjectFile[];
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    let path = newFileName.trim();
    if (!path.startsWith('src/') && !path.includes('/')) {
      path = `src/components/${path}`;
    }
    onCreateFile(path);
    setNewFileName('');
    setShowNewFileInput(false);
  };

  // Group files by folder
  const foldersMap: Record<string, ProjectFile[]> = {};
  files.forEach(file => {
    if (searchTerm && !file.path.toLowerCase().includes(searchTerm.toLowerCase())) return;
    const folderKey = file.folder || 'root';
    if (!foldersMap[folderKey]) foldersMap[folderKey] = [];
    foldersMap[folderKey].push(file);
  });

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    return <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  };

  return (
    <div className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col h-full overflow-hidden text-xs font-mono">
      {/* File Explorer Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5 text-amber-400" />
          <span>Project Explorer</span>
        </span>
        <button
          onClick={() => setShowNewFileInput(!showNewFileInput)}
          title="New File"
          className="p-1 hover:bg-slate-800 rounded text-amber-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New File Input Modal Field */}
      {showNewFileInput && (
        <form onSubmit={handleCreateSubmit} className="p-2 bg-slate-900 border-b border-slate-800 space-y-1">
          <input
            type="text"
            placeholder="src/components/Modal.tsx"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 text-[11px] outline-none focus:border-amber-500"
            autoFocus
          />
          <div className="flex justify-end gap-1 text-[10px]">
            <button type="button" onClick={() => setShowNewFileInput(false)} className="text-slate-400 px-2 py-0.5">Cancel</button>
            <button type="submit" className="bg-amber-500 text-slate-950 font-bold px-2.5 py-0.5 rounded">Create</button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="p-2 border-b border-slate-800/80">
        <div className="relative flex items-center">
          <Search className="w-3 h-3 absolute left-2 text-slate-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 rounded pl-7 pr-2 py-1 text-[11px] text-slate-200 outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      {/* Folders & Files Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {Object.keys(foldersMap).map(folderName => {
          const isCollapsed = collapsedFolders[folderName];
          return (
            <div key={folderName} className="space-y-1">
              {/* Folder Label */}
              <button
                onClick={() => toggleFolder(folderName)}
                className="flex items-center gap-1.5 w-full text-slate-400 hover:text-slate-200 font-bold text-[11px] py-1 px-1 rounded hover:bg-slate-900/60 transition-colors"
              >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {isCollapsed ? <Folder className="w-3.5 h-3.5 text-amber-400" /> : <FolderOpen className="w-3.5 h-3.5 text-amber-400" />}
                <span className="truncate">{folderName === 'root' ? 'Project Root' : folderName}</span>
              </button>

              {/* Folder Files List */}
              {!isCollapsed && (
                <div className="pl-4 space-y-0.5">
                  {foldersMap[folderName].map(file => {
                    const isActive = file.path === activeFilePath;
                    return (
                      <div
                        key={file.path}
                        onClick={() => onSelectFile(file.path)}
                        className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-all ${
                          isActive
                            ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold'
                            : 'text-slate-300 hover:bg-slate-900/80 hover:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          {getFileIcon(file.name)}
                          <span className="truncate">{file.name}</span>
                        </div>

                        {!file.isMainEntry && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteFile(file.path);
                            }}
                            title="Delete file"
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
