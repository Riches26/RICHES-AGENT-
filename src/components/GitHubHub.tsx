import React, { useState, useEffect } from 'react';
import { 
  Github, 
  Key, 
  ExternalLink, 
  RefreshCw, 
  Download, 
  Code, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  FolderGit2, 
  FileCode, 
  Star, 
  GitFork, 
  Lock, 
  Globe, 
  Search, 
  Layers, 
  Cpu, 
  Check, 
  Copy, 
  ChevronRight, 
  FileText, 
  LogOut,
  Sparkles,
  Zap,
  Clock
} from 'lucide-react';
import { 
  fetchGitHubStatus, 
  fetchGitHubOAuthUrl, 
  connectGitHubToken, 
  disconnectGitHub, 
  fetchGitHubRepos, 
  fetchGitHubTree, 
  fetchGitHubFile, 
  pullGitHubRepo, 
  GitHubUser, 
  GitHubRepo, 
  GitHubTreeFile 
} from '../services/api';
import { showToast } from './Toast';

interface GitHubHubProps {
  onNavigateToBuilder?: (code: string) => void;
  onNavigateToView?: (view: string) => void;
}

export const GitHubHub: React.FC<GitHubHubProps> = ({ 
  onNavigateToBuilder, 
  onNavigateToView 
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [connected, setConnected] = useState<boolean>(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  
  // PAT token input state
  const [patToken, setPatToken] = useState<string>('');
  const [showPatInput, setShowPatInput] = useState<boolean>(false);
  const [connectingPat, setConnectingPat] = useState<boolean>(false);
  
  // Selected repository & file inspection state
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repoTree, setRepoTree] = useState<GitHubTreeFile[]>([]);
  const [loadingTree, setLoadingTree] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string; name: string } | null>(null);
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  
  // Code pulling state
  const [pullingRepoId, setPullingRepoId] = useState<number | null>(null);
  const [pullDestination, setPullDestination] = useState<'builder' | 'knowledge' | 'all'>('builder');
  const [pulledResult, setPulledResult] = useState<any | null>(null);
  
  const [copiedCallback, setCopiedCallback] = useState<boolean>(false);

  // Exact OAuth callback URLs from AI Studio preview environment
  const devCallbackUrl = `${window.location.origin}/auth/callback`;

  // Load GitHub Status & Repositories
  const loadGitHubData = async () => {
    setLoading(true);
    try {
      const status = await fetchGitHubStatus();
      setConnected(status.connected);
      setUser(status.user);

      if (status.connected) {
        const reposData = await fetchGitHubRepos();
        setRepos(reposData.repos || []);
      }
    } catch (e: any) {
      console.warn('Error loading GitHub data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGitHubData();

    // Listen for cross-origin popup OAuth message as specified in oauth-integration skill
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && (event.data?.provider === 'github' || !event.data?.provider)) {
        showToast('GitHub OAuth Authentication completed successfully!', 'success');
        loadGitHubData();
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Open Popup OAuth Authorization Flow (oauth-integration skill compliant)
  const handleConnectOAuth = async () => {
    try {
      showToast('Initiating GitHub OAuth authorization...', 'info');
      const { url } = await fetchGitHubOAuthUrl(devCallbackUrl);
      
      const authWindow = window.open(
        url,
        'github_oauth_popup',
        'width=620,height=750,menubar=no,toolbar=no,status=no,scrollbars=yes'
      );

      if (!authWindow) {
        showToast('Pop-up blocked. Please allow pop-ups for this site or use a Personal Access Token.', 'warning');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to start OAuth flow', 'error');
    }
  };

  // Connect via Personal Access Token
  const handleConnectPAT = async () => {
    if (!patToken.trim()) {
      showToast('Please enter your GitHub Personal Access Token.', 'warning');
      return;
    }
    setConnectingPat(true);
    try {
      const result = await connectGitHubToken(patToken.trim());
      showToast(result.message || 'GitHub Connected successfully!', 'success');
      setPatToken('');
      setShowPatInput(false);
      await loadGitHubData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to authenticate token', 'error');
    } finally {
      setConnectingPat(false);
    }
  };

  // Disconnect GitHub
  const handleDisconnect = async () => {
    try {
      await disconnectGitHub();
      setConnected(false);
      setUser(null);
      setRepos([]);
      setSelectedRepo(null);
      setSelectedFile(null);
      showToast('GitHub account disconnected.', 'info');
    } catch (e: any) {
      showToast('Error disconnecting account', 'error');
    }
  };

  // Inspect Repo Files
  const handleInspectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setSelectedFile(null);
    setLoadingTree(true);
    try {
      const data = await fetchGitHubTree(repo.owner, repo.name, repo.default_branch);
      setRepoTree(data.tree || []);
    } catch (err: any) {
      showToast('Failed to fetch file tree for repository', 'error');
      setRepoTree([]);
    } finally {
      setLoadingTree(false);
    }
  };

  // Inspect Single File Content
  const handleInspectFile = async (filePath: string) => {
    if (!selectedRepo) return;
    setLoadingFile(true);
    try {
      const fileData = await fetchGitHubFile(selectedRepo.owner, selectedRepo.name, filePath, selectedRepo.default_branch);
      setSelectedFile({
        path: fileData.path,
        name: fileData.name,
        content: fileData.content
      });
    } catch (err: any) {
      showToast(`Failed to load file: ${filePath}`, 'error');
    } finally {
      setLoadingFile(false);
    }
  };

  // Pull Complete Repository
  const handlePullRepo = async (repo: GitHubRepo) => {
    setPullingRepoId(repo.id);
    showToast(`Pulling source code from ${repo.full_name}...`, 'info');
    try {
      const result = await pullGitHubRepo({
        owner: repo.owner,
        repo: repo.name,
        branch: repo.default_branch,
        targetDestination: pullDestination,
        maxFiles: 35
      });

      setPulledResult(result);
      showToast(`Pulled ${result.filesCount} files (${result.totalLines} lines) from @${repo.full_name}!`, 'success');

      // If destination is builder, automatically route or prepare code
      if (pullDestination === 'builder' && result.mainCodeSnippet && onNavigateToBuilder) {
        onNavigateToBuilder(result.mainCodeSnippet);
        showToast('Codebase loaded into Builder Sandbox!', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to pull repository', 'error');
    } finally {
      setPullingRepoId(null);
    }
  };

  // Copy Callback URL helper
  const handleCopyCallback = () => {
    navigator.clipboard.writeText(devCallbackUrl);
    setCopiedCallback(true);
    showToast('Callback URL copied to clipboard!', 'success');
    setTimeout(() => setCopiedCallback(false), 2500);
  };

  // Filtered Repositories
  const filteredRepos = repos.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.language && r.language.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLanguage = languageFilter === 'all' || (r.language && r.language.toLowerCase() === languageFilter.toLowerCase());
    return matchesSearch && matchesLanguage;
  });

  const availableLanguages = Array.from(new Set(repos.map(r => r.language).filter(Boolean)));

  return (
    <div id="github-hub-root" className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Header Banner */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/5">
              <Github className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">GitHub Code Puller & Sync Hub</h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                  @github Specialist
                </span>
                {connected && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pull repositories, inspect file trees, and load live source code into Builder Sandbox & pgvector RAG memory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadGitHubData}
              disabled={loading}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              title="Refresh GitHub state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh</span>
            </button>

            {connected ? (
              <button
                onClick={handleDisconnect}
                className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                onClick={handleConnectOAuth}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
              >
                <Github className="w-4 h-4" />
                <span>Connect GitHub Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-5 space-y-6 flex-1">
        {/* Account Status Card */}
        {connected && user ? (
          <div className="p-4 bg-slate-900/80 border border-purple-500/30 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={user.avatar_url || 'https://github.com/ghost.png'}
                alt={user.login}
                className="w-14 h-14 rounded-2xl border-2 border-purple-500/40 shadow-md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{user.name || user.login}</h2>
                  <a
                    href={user.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 font-mono flex items-center gap-0.5"
                  >
                    @{user.login} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {user.bio && <p className="text-xs text-slate-400 max-w-lg mt-0.5 line-clamp-1">{user.bio}</p>}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <FolderGit2 className="w-3.5 h-3.5 text-amber-400" /> {user.public_repos} Public Repos
                  </span>
                  {user.total_private_repos !== undefined && (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-purple-400" /> {user.total_private_repos} Private
                    </span>
                  )}
                  {user.followers !== undefined && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400" /> {user.followers} Followers
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Target Destination Control */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-mono font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Pull Target:
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPullDestination('builder')}
                  className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-all ${
                    pullDestination === 'builder'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Builder Sandbox
                </button>
                <button
                  onClick={() => setPullDestination('knowledge')}
                  className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-all ${
                    pullDestination === 'knowledge'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🧠 Knowledge RAG
                </button>
                <button
                  onClick={() => setPullDestination('all')}
                  className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-all ${
                    pullDestination === 'all'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔄 Both
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Not Connected Onboarding Card */
          <div className="p-6 bg-gradient-to-br from-slate-900 to-purple-950/30 border border-purple-500/30 rounded-2xl shadow-2xl space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">Connect GitHub to Pull Real Repositories & Codes</h2>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  Link your GitHub account to let the <strong>@github</strong> and <strong>@builder</strong> agents pull your private/public repositories, analyze AST structures, and load project source code directly into the workspace.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleConnectOAuth}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  <Github className="w-4 h-4" />
                  <span>Connect with OAuth Popup</span>
                </button>
                <button
                  onClick={() => setShowPatInput(!showPatInput)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Personal Token (PAT)</span>
                </button>
              </div>
            </div>

            {/* PAT Input Box */}
            {showPatInput && (
              <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Enter GitHub Personal Access Token (Classic or Fine-Grained)
                  </span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    Generate Token on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Requires 'repo' scope)"
                    className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  <button
                    onClick={handleConnectPAT}
                    disabled={connectingPat}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5"
                  >
                    {connectingPat ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save & Sync</span>
                  </button>
                </div>
              </div>
            )}

            {/* OAuth Callback Information */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" /> Authorized OAuth Redirect Callback URL:
                </span>
                <button
                  onClick={handleCopyCallback}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono"
                >
                  {copiedCallback ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCallback ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <code className="block p-2 bg-slate-900 rounded-lg text-[11px] font-mono text-purple-300 border border-slate-800 break-all select-all">
                {devCallbackUrl}
              </code>
            </div>
          </div>
        )}

        {/* Pulled Codebase Notification Result Banner */}
        {pulledResult && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-emerald-300">
                  Successfully Pulled {pulledResult.filesCount} Files ({pulledResult.totalLines} lines) from {pulledResult.repository}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">{pulledResult.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onNavigateToBuilder && (
                <button
                  onClick={() => {
                    if (pulledResult.mainCodeSnippet) onNavigateToBuilder(pulledResult.mainCodeSnippet);
                    else if (onNavigateToView) onNavigateToView('builder');
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Open in Builder Sandbox</span>
                </button>
              )}
              {onNavigateToView && (
                <button
                  onClick={() => onNavigateToView('memory')}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded-lg text-xs flex items-center gap-1.5 transition-all"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>View Knowledge Base</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Content: Repositories & Code Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Repositories List Section (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Your GitHub Repositories ({filteredRepos.length})</h3>
              </div>

              {/* Search & Language Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search repos..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {availableLanguages.length > 0 && (
                  <select
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">All Languages</option>
                    {availableLanguages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading connected repositories from GitHub API...</p>
              </div>
            ) : filteredRepos.length > 0 ? (
              <div className="space-y-2.5">
                {filteredRepos.map((repo) => {
                  const isSelected = selectedRepo?.id === repo.id;
                  const isPulling = pullingRepoId === repo.id;

                  return (
                    <div
                      key={repo.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-purple-950/30 border-purple-500/50 shadow-md shadow-purple-500/5'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white flex items-center gap-1.5">
                              {repo.name}
                            </span>
                            {repo.private ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/30 rounded flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Private
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5" /> Public
                              </span>
                            )}
                            {repo.language && (
                              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 rounded">
                                {repo.language}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{repo.description}</p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500/80" /> {repo.stargazers_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitFork className="w-3 h-3 text-slate-400" /> {repo.forks_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" /> Updated {new Date(repo.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleInspectRepo(repo)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-all ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-500'
                                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            <span>Browse Files</span>
                          </button>

                          <button
                            onClick={() => handlePullRepo(repo)}
                            disabled={isPulling}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                          >
                            {isPulling ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>{isPulling ? 'Pulling...' : 'Pull Code'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <Github className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No repositories found. Connect your GitHub account or generate a Personal Access Token with repo permissions.</p>
              </div>
            )}
          </div>

          {/* Repo Tree & Code Viewer Section (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  {selectedRepo ? `${selectedRepo.name} (${selectedRepo.default_branch})` : 'Repository File Inspector'}
                </h3>
              </div>
              {selectedRepo && (
                <button
                  onClick={() => handlePullRepo(selectedRepo)}
                  disabled={pullingRepoId === selectedRepo.id}
                  className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg text-[11px] font-mono font-semibold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Pull Full Repo</span>
                </button>
              )}
            </div>

            {selectedRepo ? (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-xl" style={{ minHeight: '480px' }}>
                {/* File Tree / List Header */}
                <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-purple-400" />
                    {selectedFile ? selectedFile.path : `Files in ${selectedRepo.name} (${repoTree.length})`}
                  </span>
                  {selectedFile && (
                    <button
                      onClick={() => {
                        if (onNavigateToBuilder) {
                          onNavigateToBuilder(selectedFile.content);
                          showToast(`Loaded ${selectedFile.name} into Builder Sandbox!`, 'success');
                        }
                      }}
                      className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[10px] flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" /> Run in Sandbox
                    </button>
                  )}
                </div>

                {loadingTree ? (
                  <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mb-2" />
                    <p className="text-xs text-slate-400">Inspecting repository tree...</p>
                  </div>
                ) : selectedFile ? (
                  /* File Content Viewer */
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono">
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        ← Back to File Tree
                      </button>
                      <span className="text-slate-500">{selectedFile.content.split('\n').length} lines</span>
                    </div>
                    <pre className="p-3 bg-slate-950 text-slate-200 text-xs font-mono overflow-auto flex-1 leading-relaxed selection:bg-purple-500/30">
                      <code>{selectedFile.content}</code>
                    </pre>
                  </div>
                ) : (
                  /* File Tree List */
                  <div className="p-2 overflow-y-auto max-h-[440px] space-y-1">
                    {repoTree.length > 0 ? (
                      repoTree.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleInspectFile(item.path)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 text-purple-400 group-hover:text-amber-400 shrink-0" />
                            <span className="truncate">{item.path}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {Math.round((item.size || 0) / 1024 * 10) / 10} KB
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No blobs detected or branch is empty.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-xs text-slate-400 space-y-3" style={{ minHeight: '380px' }}>
                <FolderGit2 className="w-10 h-10 text-slate-700" />
                <p className="max-w-xs leading-relaxed">
                  Select any repository on the left and click <strong>"Browse Files"</strong> or <strong>"Pull Code"</strong> to inspect and synchronize your project code into RICHES OS.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
