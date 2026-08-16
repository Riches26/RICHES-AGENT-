export interface ProjectFile {
  path: string; // e.g. 'src/App.tsx'
  name: string; // e.g. 'App.tsx'
  folder: string; // e.g. 'src'
  content: string;
  language: 'typescript' | 'javascript' | 'json' | 'css' | 'html';
  isMainEntry?: boolean;
}

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  files: ProjectFile[];
}

export const DEFAULT_SAAS_TEMPLATE: ProjectFile[] = [
  {
    path: 'package.json',
    name: 'package.json',
    folder: 'root',
    language: 'json',
    content: `{
  "name": "riches-generated-saas",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.344.0"
  }
}`
  },
  {
    path: 'src/App.tsx',
    name: 'App.tsx',
    folder: 'src',
    language: 'typescript',
    isMainEntry: true,
    content: `import React, { useState } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesGrid from './components/FeaturesGrid';
import PricingTable from './components/PricingTable';
import ContactModal from './components/ContactModal';

export default function App() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className={\`min-h-screen font-sans transition-colors duration-300 \${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}\`}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        onOpenContact={() => setIsContactOpen(true)} 
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-20">
        <HeroSection onOpenContact={() => setIsContactOpen(true)} />
        <FeaturesGrid />
        <PricingTable onSelectPlan={() => setIsContactOpen(true)} />
      </main>

      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500 font-mono">
        © 2026 RICHES Autonomous Builder. All rights reserved. Built with React & Tailwind CSS.
      </footer>

      {isContactOpen && (
        <ContactModal onClose={() => setIsContactOpen(false)} />
      )}
    </div>
  );
}`
  },
  {
    path: 'src/components/Header.tsx',
    name: 'Header.tsx',
    folder: 'src/components',
    language: 'typescript',
    content: `import React, { useState } from 'react';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenContact: () => void;
}

export default function Header({ darkMode, setDarkMode, onOpenContact }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-bold font-mono">
            <Zap className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-mono font-bold text-base text-slate-100 tracking-wide">
            AuraAI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-mono text-slate-300">
          <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing</a>
          <a href="#docs" className="hover:text-amber-400 transition-colors">Documentation</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 hover:border-amber-500/50 transition-all flex items-center gap-1.5"
          >
            {darkMode ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{darkMode ? 'Dark' : 'Light'}</span>
          </button>

          <button
            onClick={onOpenContact}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
          >
            Get Started
          </button>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-amber-400"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 p-4 space-y-3 text-xs font-mono text-slate-300">
          <a href="#features" className="block hover:text-amber-400">Features</a>
          <a href="#pricing" className="block hover:text-amber-400">Pricing</a>
          <a href="#docs" className="block hover:text-amber-400">Documentation</a>
        </div>
      )}
    </header>
  );
}`
  },
  {
    path: 'src/components/HeroSection.tsx',
    name: 'HeroSection.tsx',
    folder: 'src/components',
    language: 'typescript',
    content: `import React from 'react';

interface HeroSectionProps {
  onOpenContact: () => void;
}

export default function HeroSection({ onOpenContact }: HeroSectionProps) {
  return (
    <section className="text-center space-y-6 pt-10 pb-6">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Next-Gen AI Workflow Automation Engine v2.5</span>
      </div>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-100 tracking-tight leading-tight max-w-4xl mx-auto">
        Autonomous AI Agents for Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">Engineering Teams</span>
      </h1>

      <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-sans leading-relaxed">
        Deploy intelligent multi-agent swarms that plan, code, test, and monitor your cloud infrastructure with zero human friction.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <button
          onClick={onOpenContact}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold font-mono text-xs rounded-2xl shadow-xl shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
        >
          Start 14-Day Free Trial
        </button>
        <a
          href="#features"
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold font-mono text-xs rounded-2xl transition-all"
        >
          Explore Architecture
        </a>
      </div>
    </section>
  );
}`
  },
  {
    path: 'src/components/FeaturesGrid.tsx',
    name: 'FeaturesGrid.tsx',
    folder: 'src/components',
    language: 'typescript',
    content: `import React from 'react';

export default function FeaturesGrid() {
  const features = [
    { title: 'Multi-Agent Swarm', desc: '15 specialized agents collaborating via event-driven pub/sub bus.', iconName: 'Cpu' },
    { title: 'Container Sandboxing', desc: 'Isolated E2B environments for safe code execution.', iconName: 'ShieldCheck' },
    { title: 'Vector RAG Memory', desc: 'Long-term semantic knowledge indexing with pgvector.', iconName: 'Brain' },
    { title: 'Voice & Wake Word', desc: 'Hands-free voice execution using Web Speech STT/TTS.', iconName: 'Mic' },
    { title: 'OAuth Integrations', desc: 'Native Google Workspace, GitHub, Slack & Gmail connectors.', iconName: 'Zap' },
    { title: 'Governed Autonomy', desc: '10-level authority scale with emergency kill switch.', iconName: 'Layers' },
  ];

  const renderIcon = (name) => {
    switch (name) {
      case 'Cpu': return <Cpu className="w-6 h-6 text-amber-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-cyan-400" />;
      case 'Brain': return <Brain className="w-6 h-6 text-pink-400" />;
      case 'Mic': return <Mic className="w-6 h-6 text-emerald-400" />;
      case 'Zap': return <Zap className="w-6 h-6 text-amber-400" />;
      default: return <Layers className="w-6 h-6 text-blue-400" />;
    }
  };

  return (
    <section id="features" className="space-y-8 pt-8">
      <div className="text-center space-y-2">
        <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">Platform Capabilities</h2>
        <p className="text-2xl font-bold text-slate-100">Engineered for Production Scale</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((item, idx) => (
          <div key={idx} className="p-6 bg-slate-900/80 border border-slate-800/90 rounded-2xl space-y-3 hover:border-amber-500/40 transition-all group">
            <div className="p-3 bg-slate-950 rounded-xl w-fit border border-slate-800 group-hover:scale-110 transition-transform">
              {renderIcon(item.iconName)}
            </div>
            <h3 className="font-mono font-bold text-slate-200 text-sm">{item.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}`
  },
  {
    path: 'src/components/PricingTable.tsx',
    name: 'PricingTable.tsx',
    folder: 'src/components',
    language: 'typescript',
    content: `import React, { useState } from 'react';

interface PricingTableProps {
  onSelectPlan: () => void;
}

export default function PricingTable({ onSelectPlan }: PricingTableProps) {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="space-y-8 pt-8">
      <div className="text-center space-y-3">
        <h2 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">Transparent Pricing</h2>
        <p className="text-2xl font-bold text-slate-100">Choose the Autonomy Tier That Fits</p>

        <div className="inline-flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setAnnual(false)}
            className={\`px-3 py-1.5 rounded-lg transition-all \${!annual ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}\`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={\`px-3 py-1.5 rounded-lg transition-all \${annual ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}\`}
          >
            Annual (Save 20%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-5">
          <div className="space-y-1">
            <h3 className="font-mono font-bold text-slate-200">Developer</h3>
            <p className="text-3xl font-extrabold text-slate-100 font-mono">$0 <span className="text-xs text-slate-400">/mo</span></p>
          </div>
          <ul className="text-xs text-slate-300 font-mono space-y-2">
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 3 Active Agent Threads</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 50,000 Tokens / Month</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Local Memory Storage</li>
          </ul>
          <button onClick={onSelectPlan} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-mono text-xs rounded-xl">
            Get Started Free
          </button>
        </div>

        <div className="p-6 bg-slate-900 border-2 border-amber-500 rounded-2xl space-y-5 relative shadow-xl shadow-amber-500/10">
          <span className="absolute -top-3 right-4 px-2.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-bold font-mono rounded-full uppercase">
            Most Popular
          </span>
          <div className="space-y-1">
            <h3 className="font-mono font-bold text-amber-400">Pro Swarm</h3>
            <p className="text-3xl font-extrabold text-slate-100 font-mono">{annual ? '$49' : '$59'} <span className="text-xs text-slate-400">/mo</span></p>
          </div>
          <ul className="text-xs text-slate-300 font-mono space-y-2">
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> 15 Specialist Agents</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> 2,000,000 Tokens / Month</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> Vector RAG Database</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> Voice & Wake Word OS</li>
          </ul>
          <button onClick={onSelectPlan} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-md">
            Start Pro Trial
          </button>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-5">
          <div className="space-y-1">
            <h3 className="font-mono font-bold text-slate-200">Enterprise</h3>
            <p className="text-3xl font-extrabold text-slate-100 font-mono">Custom</p>
          </div>
          <ul className="text-xs text-slate-300 font-mono space-y-2">
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Unlimited Agents</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> On-Premise Container Isolation</li>
            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Dedicated SLA & Support</li>
          </ul>
          <button onClick={onSelectPlan} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-mono text-xs rounded-xl">
            Contact Sales
          </button>
        </div>
      </div>
    </section>
  );
}`
  },
  {
    path: 'src/components/ContactModal.tsx',
    name: 'ContactModal.tsx',
    folder: 'src/components',
    language: 'typescript',
    content: `import React, { useState } from 'react';

interface ContactModalProps {
  onClose: () => void;
}

export default function ContactModal({ onClose }: ContactModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-mono font-bold text-sm text-slate-100">Get Early Platform Access</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 font-mono">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono rounded-xl text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>Welcome aboard!</span>
            </div>
            <p className="text-[11px] text-emerald-400/80">We have sent access keys to {email}</p>
            <button onClick={onClose} className="mt-2 px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Work Email</label>
              <input
                type="email"
                required
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Primary Use Case</label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none">
                <option>Automated Software Engineering</option>
                <option>Autonomous Infrastructure DevOps</option>
                <option>RAG Knowledge Base Automation</option>
              </select>
            </div>
            <button type="submit" className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5">
              <span>Claim Access Pass</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}`
  }
];

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'saas-landing',
    title: 'AuraAI SaaS Landing & Pricing App',
    description: 'Complete multi-component SaaS app with dark/light themes, features grid, pricing tables, and lead modals.',
    category: 'Landing & Marketing',
    files: DEFAULT_SAAS_TEMPLATE
  },
  {
    id: 'kanban-task-board',
    title: 'Kanban Task Manager App',
    description: 'Interactive Drag & Drop task management app with custom status columns, priorities, and local persistence.',
    category: 'Productivity',
    files: [
      {
        path: 'package.json',
        name: 'package.json',
        folder: 'root',
        language: 'json',
        content: `{\n  "name": "kanban-task-board",\n  "private": true,\n  "version": "1.0.0"\n}`
      },
      {
        path: 'src/App.tsx',
        name: 'App.tsx',
        folder: 'src',
        language: 'typescript',
        isMainEntry: true,
        content: `import React, { useState } from 'react';

export default function App() {
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Implement Vector RAG Pipeline', status: 'In Progress', priority: 'High' },
    { id: '2', title: 'Setup Google Workspace OAuth', status: 'Done', priority: 'Medium' },
    { id: '3', title: 'Configure D3 Analytics Chart', status: 'Todo', priority: 'High' }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks([...tasks, { id: Date.now().toString(), title: newTaskTitle, status: 'Todo', priority: 'Medium' }]);
    setNewTaskTitle('');
  };

  const moveTask = (id: string, nextStatus: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: nextStatus } : t));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans space-y-6">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold font-mono text-amber-400 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          <span>Autonomous Task Kanban</span>
        </h1>
        <form onSubmit={addTask} className="flex gap-2">
          <input
            type="text"
            placeholder="New task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 font-mono"
          />
          <button type="submit" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold rounded-xl flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Todo', 'In Progress', 'Done'].map((status) => (
          <div key={status} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h2 className="font-mono text-xs font-bold text-amber-300 uppercase">{status}</h2>
            <div className="space-y-2">
              {tasks.filter(t => t.status === status).map(t => (
                <div key={t.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <p className="text-xs text-slate-200 font-mono">{t.title}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-amber-400 font-bold">{t.priority}</span>
                    <div className="flex gap-1">
                      {status !== 'Todo' && (
                        <button onClick={() => moveTask(t.id, status === 'Done' ? 'In Progress' : 'Todo')} className="px-2 py-1 bg-slate-800 text-slate-300 rounded flex items-center">
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      {status !== 'Done' && (
                        <button onClick={() => moveTask(t.id, status === 'Todo' ? 'In Progress' : 'Done')} className="px-2 py-1 bg-slate-800 text-slate-300 rounded flex items-center">
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`
      }
    ]
  }
];
