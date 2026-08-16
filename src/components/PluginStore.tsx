import React, { useState } from 'react';
import { 
  Package, 
  CheckCircle2, 
  Power, 
  Settings, 
  Sparkles, 
  Key, 
  Wrench,
  Search
} from 'lucide-react';
import { PluginItem } from '../types';
import { togglePlugin } from '../services/api';

interface PluginStoreProps {
  plugins?: PluginItem[];
  setPlugins: React.Dispatch<React.SetStateAction<PluginItem[]>>;
}

export const PluginStore: React.FC<PluginStoreProps> = ({ plugins = [], setPlugins }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = async (id: string) => {
    try {
      const updated = await togglePlugin(id);
      setPlugins(prev => (prev || []).map(p => p.id === id ? updated : p));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredPlugins = (plugins || []).filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Plugin-First Dynamic Tool Registry</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 rounded-full font-semibold">
                Modular Capabilities
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Install, configure OAuth/API keys, and toggle tools provided to Specialist Agents.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plugins..."
            className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500/60"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 text-xs font-mono">
        {['all', 'workspace', 'development', 'social', 'productivity', 'data'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl capitalize transition-all border ${
              selectedCategory === cat
                ? 'bg-purple-500/20 text-purple-300 font-bold border-purple-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map(plugin => (
          <div
            key={plugin.id}
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
              plugin.enabled
                ? 'bg-slate-900/90 border-purple-500/30 shadow-lg shadow-purple-500/5'
                : 'bg-slate-950/60 border-slate-800/80 opacity-75'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-100">{plugin.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                  v{plugin.version}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{plugin.description}</p>
            </div>

            {/* Tools Provided */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 flex items-center gap-1">
                <Wrench className="w-3 h-3 text-purple-400" /> Tools Exposed:
              </span>
              <div className="flex flex-wrap gap-1">
                {plugin.toolsProvided.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-950 text-purple-300 font-mono text-[10px] rounded border border-slate-800">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                <Key className="w-3 h-3 text-slate-500" />
                Auth: <strong className="text-slate-200 uppercase">{plugin.authType}</strong>
              </span>

              <button
                onClick={() => handleToggle(plugin.id)}
                className={`px-3 py-1.5 rounded-xl font-mono font-bold flex items-center gap-1.5 transition-all ${
                  plugin.enabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{plugin.enabled ? 'Active' : 'Enable'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
