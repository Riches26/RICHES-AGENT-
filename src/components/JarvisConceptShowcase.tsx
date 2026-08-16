import React, { useState } from 'react';
import {
  Sparkles,
  Eye,
  Download,
  Copy,
  Check,
  Maximize2,
  ExternalLink,
  Layers,
  Cpu,
  Mic,
  Monitor
} from 'lucide-react';

interface ConceptCard {
  id: string;
  title: string;
  category: string;
  aspectRatio: string;
  imageSrc: string;
  promptText: string;
  highlights: string[];
}

export const JarvisConceptShowcase: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ConceptCard | null>(null);

  const concepts: ConceptCard[] = [
    {
      id: 'concept-1',
      title: 'Prompt 1: Main Conversational Dashboard',
      category: 'Desktop Split-Screen UX / High-Tech Glassmorphism',
      aspectRatio: '16:9',
      imageSrc: '/src/assets/images/jarvis_dashboard_ui_1786758070261.jpg',
      promptText:
        'Cyberpunk JARVIS AI agent dashboard UI design, futuristic split-screen layout, left side minimal chat stream, right side high-tech neon data visualization and glassmorphism code panel. Deep obsidian black background, cyan glowing accents, vivid amber warning highlights. Clean modern sans-serif typography, ultra-realistic UX/UI mockup, 8k resolution, sleek web interface style, Figma showcase trend. --ar 16:9',
      highlights: [
        'Deep Obsidian Black (#0B0C10) background with neon cyan glow',
        'Minimalist left conversation stream & right-hand context-splitting artifact panel',
        'Vivid amber warnings for Human-in-the-Loop critical approvals',
        'High-density telemetry cards with glassmorphic depth'
      ]
    },
    {
      id: 'concept-2',
      title: 'Prompt 2: Agent Node Canvas',
      category: 'Sci-Fi Node-Based Workflow Orchestrator',
      aspectRatio: '16:9',
      imageSrc: '/src/assets/images/agent_node_canvas_1786758093561.jpg',
      promptText:
        'Sci-fi node-based AI workflow builder UI, digital canvas with connected floating glowing cards, sub-agents orchestrating tasks, dark mode interface, blueprint style, frosted glass UI components, thin neon blue lines connecting nodes, high-fidelity dashboard design, tech startup aesthetic, clean and scannable. --ar 16:9',
      highlights: [
        'Connected floating glowing node cards with real-time execution states',
        'Animated glowing bezier flow lines indicating streaming tokens',
        'Live cost and latency trackers integrated at the canvas top-bar',
        'Side inspector panel with line-level telemetry logs'
      ]
    },
    {
      id: 'concept-3',
      title: 'Prompt 3: Mobile Voice UI Focus',
      category: 'Holographic Voice Assistant & Sound Waveform',
      aspectRatio: '9:16',
      imageSrc: '/src/assets/images/mobile_voice_ui_1786758106790.jpg',
      promptText:
        'Futuristic mobile app UI design, JARVIS voice assistant interface, dark mode, center screen features a mesmerizing holographic dynamic 3D sound waveform pulsing with cyan light, minimal button controls at the bottom, sleek glassmorphic container edges, premium mobile UX concept, highly aesthetic. --ar 9:16',
      highlights: [
        'Mesmerizing holographic dynamic 3D sound waveform pulsing with cyan light',
        'Hands-free continuous listening with low-latency visual triggers',
        'Minimal glassmorphic bottom controls dock for quick commands',
        'Ultra-clean dark mode typography with seamless mobile ergonomics'
      ]
    }
  ];

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 font-mono text-slate-200">
      {/* Header Banner */}
      <div className="bg-[#0B0C10] border border-[#66FCF1]/30 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#66FCF1]/10 text-[#66FCF1] rounded-xl border border-[#66FCF1]/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>JARVIS AI Studio UI/UX Concept Gallery</span>
              <span className="px-2 py-0.5 bg-[#66FCF1]/10 text-[#66FCF1] text-[10px] font-bold rounded border border-[#66FCF1]/30">
                8K Concept Mockups
              </span>
            </h2>
            <p className="text-xs text-[#45A29E] font-sans mt-0.5">
              High-fidelity visual design concepts generated for Desktop Dashboard (Layout A), Agent Node Canvas (Layout B), and Mobile Voice UI.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Concept Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {concepts.map((concept) => (
          <div
            key={concept.id}
            className="bg-[#0B0C10] border border-[#66FCF1]/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between group hover:border-[#66FCF1]/60 transition-all"
          >
            {/* Image Preview Container */}
            <div className="relative overflow-hidden bg-slate-950 aspect-[16/10] flex items-center justify-center border-b border-[#66FCF1]/20">
              <img
                src={concept.imageSrc}
                alt={concept.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#0B0C10]/80 backdrop-blur-md border border-[#66FCF1]/30 rounded-lg text-[10px] text-[#66FCF1] font-bold">
                {concept.aspectRatio}
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[10px] text-[#45A29E] uppercase tracking-wider font-bold">
                  {concept.category}
                </span>
                <h3 className="text-sm font-bold text-slate-100 font-sans">
                  {concept.title}
                </h3>

                {/* Key Highlights */}
                <ul className="space-y-1 text-xs text-slate-300 font-sans pt-1">
                  {concept.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]">
                      <span className="text-[#66FCF1] shrink-0">✦</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prompt Block & Copy Button */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>AI Generator Prompt:</span>
                  <button
                    onClick={() => handleCopyPrompt(concept.id, concept.promptText)}
                    className="flex items-center gap-1 text-[#66FCF1] hover:underline"
                  >
                    {copiedId === concept.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === concept.id ? 'Copied' : 'Copy Prompt'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-mono bg-[#1F2833]/40 p-2 rounded-lg line-clamp-2 border border-[#66FCF1]/10">
                  {concept.promptText}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
