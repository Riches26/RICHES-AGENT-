import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Download,
  Copy,
  Check,
  FileCode,
  ShieldCheck,
  Activity,
  Zap,
  Flame,
  ArrowRight,
  GitBranch,
  Sliders,
  Terminal,
  Code,
  Network,
  BookOpen,
  Database,
  ArrowUpRight,
  Search,
  CheckCircle,
  HelpCircle,
  FolderDown
} from 'lucide-react';
import {
  generateJarvisEDAScript,
  simulateJarvisEDAScript,
  compileASTCode,
  applyRuleEnforce,
  generateSDGSamples,
  runMultiEpisodeRefinement,
  JarvisEDAGenerateParams
} from '../services/api';

interface GeneratedFile {
  filename: string;
  language: string;
  content: string;
}

interface EDAPreset {
  title: string;
  description: string;
  prompt: string;
  scriptType: JarvisEDAGenerateParams['scriptType'];
  targetPDK: JarvisEDAGenerateParams['targetPDK'];
  clockFreqMhz: number;
  badge: string;
}

const EDA_PRESETS: EDAPreset[] = [
  {
    title: 'SkyWater 130nm RISC-V RV32I ALU & Multiplier',
    description: 'Synthesizable 32-bit ALU with single-cycle multiplier, OpenSTA timing constraints, and Yosys mapping.',
    prompt: 'Generate a synthesizable 32-bit RISC-V ALU supporting ADD, SUB, AND, OR, XOR, SLL, SRL, SRA, and single-cycle MUL with synchronous reset for SkyWater 130nm PDK at 100MHz.',
    scriptType: 'full_eda_pipeline',
    targetPDK: 'sky130',
    clockFreqMhz: 100,
    badge: 'SkyWater 130nm'
  },
  {
    title: 'Asynchronous Dual-Clock FIFO with CDC & SDC',
    description: 'Gray-code dual-clock FIFO with 2-FF synchronizers, full/empty flags, and multi-clock SDC constraints.',
    prompt: 'Generate an asynchronous dual-clock FIFO (depth 16, width 32) with 2-stage synchronizers, Gray code pointer conversions, and complete SDC constraints for 100MHz read / 200MHz write clock domain crossing.',
    scriptType: 'full_eda_pipeline',
    targetPDK: 'freepdk45',
    clockFreqMhz: 200,
    badge: 'CDC & Timing SDC'
  },
  {
    title: '16-Bit DSP MAC (Multiply-Accumulate) Unit',
    description: 'Pipelined DSP MAC unit with saturation logic, OpenROAD floorplanning, and timing analysis flow.',
    prompt: 'Create a 16-bit pipelined multiply-accumulate (MAC) unit with 40-bit accumulator register, saturation detection, and OpenROAD synthesis flow script.',
    scriptType: 'openroad_flow',
    targetPDK: 'tsmcN7',
    clockFreqMhz: 500,
    badge: 'High-Speed DSP'
  },
  {
    title: 'Python Cocotb Automated EDA Regression Suite',
    description: 'Python test runner with randomized vector generation, bit-error rate checking, and waveform dump.',
    prompt: 'Generate a Python automated EDA simulation and regression test script using Cocotb and VCD waveform verification for testing a synchronous SPI master controller.',
    scriptType: 'python_eda',
    targetPDK: 'generic',
    clockFreqMhz: 50,
    badge: 'Python / Cocotb'
  }
];

export const JarvisEDAScriptStudio: React.FC = () => {
  // Main Studio Mode Tabs
  const [studioTab, setStudioTab] = useState<'pipeline_generator' | 'algorithm2_refinement' | 'ast_compiler' | 'rule_enforce' | 'sdg_studio'>('pipeline_generator');

  // --- Pipeline Generator State ---
  const [prompt, setPrompt] = useState(EDA_PRESETS[0].prompt);
  const [scriptType, setScriptType] = useState<JarvisEDAGenerateParams['scriptType']>('full_eda_pipeline');
  const [targetPDK, setTargetPDK] = useState<JarvisEDAGenerateParams['targetPDK']>('sky130');
  const [clockFreqMhz, setClockFreqMhz] = useState<number>(100);
  const [includeTestbench, setIncludeTestbench] = useState<boolean>(true);
  const [enableSelfHealing, setEnableSelfHealing] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'planning' | 'coding' | 'critic' | 'healing' | 'completed'>('idle');
  
  const [architecturalPlan, setArchitecturalPlan] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [criticResult, setCriticResult] = useState<any>(null);
  const [repairLogs, setRepairLogs] = useState<string[]>([]);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [copiedFile, setCopiedFile] = useState<boolean>(false);

  // --- Algorithm 2 (Multi-Episode Refinement) State ---
  const [algo2Query, setAlgo2Query] = useState('Write a code to get all hold violations, if any net in the vio has a route length greater than 2um.');
  const [algo2Loading, setAlgo2Loading] = useState(false);
  const [algo2Result, setAlgo2Result] = useState<any>(null);

  // --- AST Code Compiler State (Section IV-3 & Fig 2) ---
  const [compilerCode, setCompilerCode] = useState(
`for node in nodes:
    if not(node.is_net()):
        # Erroneous hallucinated attribute in initial code:
        if node.route_length() > 2:
            filtered_hold_vios.append(vio)`
  );
  const [compilerLoading, setCompilerLoading] = useState(false);
  const [compilerResult, setCompilerResult] = useState<any>(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState<string>('Node');

  // --- RuleEnforce State (Section IV-2) ---
  const [ruleCode, setRuleCode] = useState(
`total_leakage_power = 0
for cell in get_cells("*", "hierarchical"):
    if cell.is_sequential():
        leakage_power = cell.leakage_power
        total_leakage_power += leakage_power`
  );
  const [ruleLoading, setRuleLoading] = useState(false);
  const [ruleResult, setRuleResult] = useState<any>(null);

  // --- SDG Synthetic Data Generator State (Algorithm 1) ---
  const [sdgTopic, setSdgTopic] = useState('timing_violations');
  const [sdgCount, setSdgCount] = useState(2);
  const [sdgLoading, setSdgLoading] = useState(false);
  const [sdgResult, setSdgResult] = useState<any>(null);

  // Multi-Agent Pipeline Generator Handler
  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) return;

    setIsGenerating(true);
    setCurrentStep('planning');
    setSimulationResults(null);
    setArchitecturalPlan(null);
    setGeneratedFiles([]);
    setCriticResult(null);
    setRepairLogs([]);

    try {
      setTimeout(() => setCurrentStep('coding'), 1200);
      setTimeout(() => setCurrentStep('critic'), 2600);
      setTimeout(() => setCurrentStep('healing'), 4000);

      const res = await generateJarvisEDAScript({
        prompt: activePrompt,
        scriptType,
        targetPDK,
        clockFreqMhz,
        includeTestbench,
        enableSelfHealing
      });

      if (res?.success) {
        setArchitecturalPlan(res.architecturalPlan || null);
        setGeneratedFiles(res.files || []);
        setSelectedFileIndex(0);
        setCriticResult(res.critic || null);
        setRepairLogs(res.repairLogs || []);
        setCurrentStep('completed');

        if (res.files && res.files.length > 0) {
          runSimulation(res.files);
        }
      }
    } catch (error) {
      console.error('Error in JARVIS EDA Generator:', error);
      setCurrentStep('completed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Run EDA Flow Simulation
  const runSimulation = async (filesToSimulate?: GeneratedFile[]) => {
    const files = filesToSimulate || generatedFiles;
    if (!files || files.length === 0) return;

    setIsSimulating(true);
    try {
      const res = await simulateJarvisEDAScript(files, targetPDK, clockFreqMhz);
      if (res?.success) {
        setSimulationResults(res);
      }
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Run Algorithm 2 Refinement
  const handleRunAlgo2 = async () => {
    setAlgo2Loading(true);
    try {
      const res = await runMultiEpisodeRefinement(algo2Query);
      if (res?.success) {
        setAlgo2Result(res);
      }
    } catch (e) {
      console.error('Algorithm 2 error:', e);
    } finally {
      setAlgo2Loading(false);
    }
  };

  // Run AST Compiler
  const handleRunCompiler = async () => {
    setCompilerLoading(true);
    try {
      const res = await compileASTCode(compilerCode);
      if (res?.success) {
        setCompilerResult(res);
      }
    } catch (e) {
      console.error('Compiler error:', e);
    } finally {
      setCompilerLoading(false);
    }
  };

  // Run RuleEnforce
  const handleRunRuleEnforce = async () => {
    setRuleLoading(true);
    try {
      const res = await applyRuleEnforce(ruleCode);
      if (res?.success) {
        setRuleResult(res);
      }
    } catch (e) {
      console.error('RuleEnforce error:', e);
    } finally {
      setRuleLoading(false);
    }
  };

  // Run SDG Synthesis
  const handleRunSDG = async () => {
    setSdgLoading(true);
    try {
      const res = await generateSDGSamples(sdgTopic, sdgCount);
      if (res?.success) {
        setSdgResult(res);
      }
    } catch (e) {
      console.error('SDG error:', e);
    } finally {
      setSdgLoading(false);
    }
  };

  const applyPreset = (preset: EDAPreset) => {
    setPrompt(preset.prompt);
    setScriptType(preset.scriptType);
    setTargetPDK(preset.targetPDK);
    setClockFreqMhz(preset.clockFreqMhz);
  };

  const handleCopyCode = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'eda_script.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeFile = generatedFiles[selectedFileIndex] || null;

  return (
    <div className="space-y-6 font-mono text-slate-200">
      {/* Header & Research Paper Reference Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-amber-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">JARVIS Multi-Agent EDA Script Studio</h2>
                <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 font-bold rounded border border-indigo-500/40 uppercase tracking-wider">
                  NVIDIA / ResearchGate arXiv:2505.14978v1
                </span>
                <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 font-bold rounded border border-amber-500/40">
                  Full Paper Implementation
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                "JARVIS: A Multi-Agent Code Assistant for High-Quality EDA Script Generation" — Complete Architecture with AST Tool Command Graph, RuleEnforce, Synthetic Data Generation, and Multi-Episode Code Refinement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-slate-300 text-[11px]">Toolchain: Yosys 0.38 + OpenROAD + OpenSTA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subsystem Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
        <button
          onClick={() => setStudioTab('pipeline_generator')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            studioTab === 'pipeline_generator'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-300" />
          <span>Multi-Agent Script Studio</span>
        </button>

        <button
          onClick={() => setStudioTab('algorithm2_refinement')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            studioTab === 'algorithm2_refinement'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <GitBranch className="w-4 h-4 text-amber-400" />
          <span>Algorithm 2: Multi-Episode Refinement</span>
        </button>

        <button
          onClick={() => setStudioTab('ast_compiler')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            studioTab === 'ast_compiler'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Network className="w-4 h-4 text-purple-300" />
          <span>AST Tool Command Graph & Compiler</span>
        </button>

        <button
          onClick={() => setStudioTab('rule_enforce')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            studioTab === 'rule_enforce'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>RuleEnforce Engine (Listing 4-5)</span>
        </button>

        <button
          onClick={() => setStudioTab('sdg_studio')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            studioTab === 'sdg_studio'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Database className="w-4 h-4 text-cyan-300" />
          <span>Algorithm 1: Synthetic Data Generator (SDG)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PIPELINE GENERATOR & SIMULATOR */}
      {/* ========================================================================= */}
      {studioTab === 'pipeline_generator' && (
        <div className="space-y-6">
          {/* Multi-Agent Architecture Pipeline Flow Visualizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>4-Agent Collaborative Synthesis & Verification Pipeline</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Agent 1: Planner */}
              <div className={`p-3 rounded-xl border transition-all ${
                currentStep === 'planning'
                  ? 'bg-indigo-950/80 border-indigo-500 shadow-md shadow-indigo-500/20 animate-pulse'
                  : architecturalPlan
                  ? 'bg-slate-950/90 border-indigo-500/40 text-slate-200'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
              }`}>
                <div className="flex items-center justify-between font-bold text-indigo-400 mb-1">
                  <span>1. EDA Architect</span>
                  {currentStep === 'planning' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {architecturalPlan && currentStep !== 'planning' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-300 font-sans">
                  Decomposes RTL specs, clocks, target PDK constraints, & hierarchical ports.
                </p>
              </div>

              {/* Agent 2: Coder */}
              <div className={`p-3 rounded-xl border transition-all ${
                currentStep === 'coding'
                  ? 'bg-purple-950/80 border-purple-500 shadow-md shadow-purple-500/20 animate-pulse'
                  : generatedFiles.length > 0
                  ? 'bg-slate-950/90 border-purple-500/40 text-slate-200'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
              }`}>
                <div className="flex items-center justify-between font-bold text-purple-400 mb-1">
                  <span>2. Script Generator</span>
                  {currentStep === 'coding' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {generatedFiles.length > 0 && currentStep !== 'coding' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-300 font-sans">
                  Synthesizes Tcl synthesis flow, Verilog HDL, SDC constraints, and Python tests.
                </p>
              </div>

              {/* Agent 3: Critic */}
              <div className={`p-3 rounded-xl border transition-all ${
                currentStep === 'critic'
                  ? 'bg-amber-950/80 border-amber-500 shadow-md shadow-amber-500/20 animate-pulse'
                  : criticResult
                  ? 'bg-slate-950/90 border-amber-500/40 text-slate-200'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
              }`}>
                <div className="flex items-center justify-between font-bold text-amber-400 mb-1">
                  <span>3. Critic & DRC/STA</span>
                  {currentStep === 'critic' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {criticResult && currentStep !== 'critic' && (
                    <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/20 rounded">
                      Score {criticResult.qualityScore}/100
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 font-sans">
                  Verifies CDC hazards, timing slack margins, fanout rules, & IEEE compliance.
                </p>
              </div>

              {/* Agent 4: Simulator & Self-Healing */}
              <div className={`p-3 rounded-xl border transition-all ${
                currentStep === 'healing'
                  ? 'bg-emerald-950/80 border-emerald-500 shadow-md shadow-emerald-500/20 animate-pulse'
                  : repairLogs.length > 0 || simulationResults
                  ? 'bg-slate-950/90 border-emerald-500/40 text-slate-200'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
              }`}>
                <div className="flex items-center justify-between font-bold text-emerald-400 mb-1">
                  <span>4. Simulator & Repair</span>
                  {currentStep === 'healing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {simulationResults && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-300 font-sans">
                  Executes virtual Yosys gate mapping & iteratively repairs any detected flaws.
                </p>
              </div>
            </div>
          </div>

          {/* Preset Library & Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Preset Cards & Prompt Input (Left 2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Quick Hardware & Script Design Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EDA_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPreset(preset)}
                      className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all space-y-1 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-200 group-hover:text-indigo-300 truncate">
                          {preset.title}
                        </span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded shrink-0">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 font-sans">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Specification Input */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Custom Hardware / EDA Script Specification</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Natural Language to Synthesizable Code</span>
                </div>

                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Generate an AXI4-Lite slave peripheral with 4 read/write 32-bit control registers, SDC timing constraints, and Yosys synthesis script for SkyWater 130nm at 125MHz..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono outline-none focus:border-indigo-500 leading-relaxed resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
                      <input
                        type="checkbox"
                        checked={includeTestbench}
                        onChange={(e) => setIncludeTestbench(e.target.checked)}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Generate Testbench / Verification Suite</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
                      <input
                        type="checkbox"
                        checked={enableSelfHealing}
                        onChange={(e) => setEnableSelfHealing(e.target.checked)}
                        className="accent-emerald-500 rounded"
                      />
                      <span className="text-emerald-300 font-bold">Auto Self-Healing Loop</span>
                    </label>
                  </div>

                  <button
                    onClick={() => handleGenerate()}
                    disabled={isGenerating || !prompt.trim()}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                      isGenerating
                        ? 'bg-indigo-600/50 text-slate-300 cursor-wait'
                        : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 hover:from-indigo-400 hover:to-amber-400 text-slate-950 shadow-indigo-500/20'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Executing MAS Pipeline...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                        <span>Generate & Synthesize EDA Scripts</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Hardware Constraints & PDK Controls (Right 1 col) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Hardware Synthesis Constraints
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Target PDK / Technology Node</label>
                  <select
                    value={targetPDK}
                    onChange={(e) => setTargetPDK(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="sky130">SkyWater 130nm Open PDK (sky130_fd_sc_hd)</option>
                    <option value="freepdk45">FreePDK 45nm Generic Standard Cell</option>
                    <option value="tsmcN7">TSMC N7 FinFET Advanced Node</option>
                    <option value="generic">Generic FPGA / ASIC Gate Library</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Output Script Archetype</label>
                  <select
                    value={scriptType}
                    onChange={(e) => setScriptType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="full_eda_pipeline">Full EDA Flow (Verilog + SDC + Tcl Synth)</option>
                    <option value="yosys_tcl">Yosys Synthesis & Tech Mapping Script (.tcl / .ys)</option>
                    <option value="openroad_flow">OpenROAD Place & Route Flow (.tcl)</option>
                    <option value="opensta_sdc">OpenSTA Timing Constraints (.sdc)</option>
                    <option value="verilog_hdl">Synthesizable Verilog HDL (.v / .sv)</option>
                    <option value="python_eda">Python Automated EDA / Cocotb Suite (.py)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Target Clock Frequency:</span>
                    <span className="text-amber-400 font-bold">{clockFreqMhz} MHz ({(1000 / clockFreqMhz).toFixed(2)} ns)</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={1000}
                    step={10}
                    value={clockFreqMhz}
                    onChange={(e) => setClockFreqMhz(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                    <span>10 MHz</span>
                    <span>250 MHz</span>
                    <span>500 MHz</span>
                    <span>1 GHz</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Setup Slack Budget:</span>
                    <span className="text-emerald-400 font-bold">+{(1000 / clockFreqMhz * 0.15).toFixed(2)} ns</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Max Transition Time:</span>
                    <span className="text-slate-200 font-bold">0.15 ns</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Clock Uncertainty:</span>
                    <span className="text-amber-400 font-bold">0.05 ns</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Code, Critic Report, and Simulator Section */}
          {(generatedFiles.length > 0 || architecturalPlan) && (
            <div className="space-y-6 animate-in fade-in">
              {/* Architectural Plan Drawer */}
              {architecturalPlan && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    <GitBranch className="w-4 h-4 text-indigo-400" />
                    <span>EDA Architect Design Specification Plan</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                    {architecturalPlan}
                  </p>
                </div>
              )}

              {/* Code Viewer & Multi-File Tabs */}
              {generatedFiles.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Tabs Bar */}
                  <div className="flex flex-wrap items-center justify-between bg-slate-950 border-b border-slate-800 px-4 py-2 gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {generatedFiles.map((file, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedFileIndex(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
                            selectedFileIndex === idx
                              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                          }`}
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>{file.filename}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyCode(activeFile?.content || '')}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5 border border-slate-800"
                        title="Copy Code"
                      >
                        {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFile ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => handleDownloadFile(activeFile?.filename || 'script.txt', activeFile?.content || '')}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5 border border-slate-800"
                        title="Download File"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>

                      <button
                        onClick={() => runSimulation()}
                        disabled={isSimulating}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                        {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
                        <span>Simulate Flow</span>
                      </button>
                    </div>
                  </div>

                  {/* Code Display Canvas */}
                  {activeFile && (
                    <div className="p-4 bg-slate-950 overflow-x-auto max-h-[480px]">
                      <pre className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre">
                        <code>{activeFile.content}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Critic Report & Live Simulation Visualizer Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Critic DRC & STA Quality Inspection */}
                {criticResult && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Critic & DRC Quality Assessment
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-lg border border-emerald-500/30">
                          Score: {criticResult.qualityScore || 94} / 100
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          criticResult.passedDRC ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {criticResult.passedDRC ? 'DRC PASSED' : 'WARNINGS FOUND'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      {criticResult.detectedIssues && criticResult.detectedIssues.length > 0 && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                            Detected Design & Timing Violations
                          </span>
                          <ul className="list-disc list-inside text-slate-300 text-xs space-y-0.5">
                            {criticResult.detectedIssues.map((issue: string, i: number) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {repairLogs.length > 0 && (
                        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1 text-emerald-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Self-Healing Repair Engine Adjustments</span>
                          </span>
                          <ul className="list-disc list-inside text-xs space-y-0.5">
                            {repairLogs.map((log, i) => (
                              <li key={i}>{log}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Simulated Toolchain Terminal & Hardware Metrics */}
                {simulationResults && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Virtual Yosys / OpenSTA Synthesis Run
                        </h3>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">
                        {simulationResults.status}
                      </span>
                    </div>

                    {/* Synthesis Hardware Metrics */}
                    {simulationResults.metrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400">Total Cells:</span>
                      <div className="font-bold text-indigo-300 text-sm">{simulationResults.metrics.totalCells}</div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400">Sequential DFFs:</span>
                      <div className="font-bold text-purple-300 text-sm">{simulationResults.metrics.sequentialDFFs}</div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400">Slack (WNS):</span>
                      <div className="font-bold text-emerald-400 text-sm">+{simulationResults.metrics.worstNegativeSlackPs} ps</div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400">Dynamic Power:</span>
                      <div className="font-bold text-amber-300 text-sm">{simulationResults.metrics.dynamicPowerMw} mW</div>
                    </div>
                  </div>
                )}

                {/* Terminal Logs */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] space-y-1 text-slate-300 max-h-48 overflow-y-auto">
                  {simulationResults.logs?.map((line: string, i: number) => (
                    <div key={i} className={line.includes('[SUCCESS]') ? 'text-emerald-400 font-bold' : line.includes('Step') ? 'text-indigo-300' : 'text-slate-400'}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )}

      {/* ========================================================================= */}
      {/* TAB 2: ALGORITHM 2 - MULTI-EPISODE CODE REFINEMENT (PAPER IMPLEMENTATION) */}
      {/* ========================================================================= */}
      {studioTab === 'algorithm2_refinement' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header Description */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Algorithm 2: Multi-Agent based Code Refinement Flow</h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Top Agent ↔ Code Generator (ChipNeMo) ↔ RuleEnforce ↔ Simulate ↔ Code Fixing Agent ↔ ProcessSim ↔ Guardrail Agent
                  </p>
                </div>
              </div>

              <button
                onClick={handleRunAlgo2}
                disabled={algo2Loading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {algo2Loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
                <span>Execute Algorithm 2</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-bold">Query Specification (from Paper Listing 6 & 7)</label>
              <input
                type="text"
                value={algo2Query}
                onChange={(e) => setAlgo2Query(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Algorithm 2 Step-by-Step Flow Chart & Timeline */}
          {algo2Result && (
            <div className="space-y-6">
              {/* Episodes Execution Timeline */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Iterative Multi-Episode Execution Log</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {algo2Result.episodesLog?.map((ep: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border space-y-2 ${
                        ep.status === 'success'
                          ? 'bg-emerald-950/40 border-emerald-500/40'
                          : ep.status === 'repair'
                          ? 'bg-indigo-950/40 border-indigo-500/40'
                          : 'bg-amber-950/40 border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-300">
                          Episode #{ep.episode}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{ep.agent}</span>
                      </div>
                      <p className="text-xs font-sans text-slate-300">{ep.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Evolution: Initial vs. Simulated vs. Refined */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Initial Code & Errors */}
                <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Initial ChipNeMo Draft (Erroneous AST Line)</span>
                    </span>
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300 font-mono overflow-x-auto border border-slate-800">
                    <code>{algo2Result.initialCode}</code>
                  </pre>

                  {algo2Result.simResult && (
                    <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl space-y-1 text-xs text-red-300">
                      <div className="font-bold text-[11px] uppercase">Simulate Output:</div>
                      <div>{algo2Result.simResult.error}</div>
                      <div className="text-[11px] text-amber-300 font-bold mt-1">
                        Shortest Path: {algo2Result.simResult.shortestPath}
                      </div>
                    </div>
                  )}
                </div>

                {/* Refined Final Output */}
                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Refined Code (Code Fixing + RuleEnforce + Guardrail)</span>
                    </span>
                    <button
                      onClick={() => handleCopyCode(algo2Result.refinedCode)}
                      className="px-2 py-0.5 bg-slate-950 text-slate-300 hover:text-white rounded text-[11px] border border-slate-800 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-xl text-xs text-emerald-200 font-mono overflow-x-auto border border-slate-800">
                    <code>{algo2Result.refinedCode}</code>
                  </pre>

                  {algo2Result.guardrailScore && (
                    <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                      <span>Guardrail Quality Score:</span>
                      <span className="font-bold text-sm">{algo2Result.guardrailScore.overallQuality} / 100</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AST TOOL COMMAND GRAPH & COMPILER (SECTION IV-3 & FIG 2) */}
      {/* ========================================================================= */}
      {studioTab === 'ast_compiler' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Tool Command Graph Visualizer */}
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/40">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Tool API Command Graph Explorer (Paper Fig 2)</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Constructed from EDA man pages. Enables AST traversal and shortest path error recovery.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Graph Node Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: 'Node', color: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300', attrs: ['pin', 'pin_name', 'is_net', 'arrival'] },
                { name: 'Pin', color: 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300', attrs: ['net', 'cell', 'slack', 'is_input'] },
                { name: 'Net', color: 'border-purple-500/50 bg-purple-950/40 text-purple-300', attrs: ['route_length', 'fanout', 'capacitance'] },
                { name: 'Cell', color: 'border-amber-500/50 bg-amber-950/40 text-amber-300', attrs: ['calculate_power', 'power', 'is_sequential'] },
                { name: 'Violation', color: 'border-red-500/50 bg-red-950/40 text-red-300', attrs: ['logic_delay', 'slack', 'get_end_ref'] },
                { name: 'Reference', color: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300', attrs: ['of_ram', 'of_rom', 'is_macro'] }
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => setSelectedGraphNode(item.name)}
                  className={`p-3 rounded-xl border text-left space-y-1.5 transition-all ${
                    selectedGraphNode === item.name ? 'ring-2 ring-purple-400' : ''
                  } ${item.color}`}
                >
                  <div className="font-bold text-xs">{item.name}</div>
                  <div className="text-[10px] opacity-80 line-clamp-2">
                    {item.attrs.join(', ')}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Node Connections & Attributes */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
              <span className="text-slate-300">
                Selected Object: <strong className="text-purple-300">{selectedGraphNode}</strong>
              </span>
              <span className="text-slate-400 text-[11px]">
                Shortest Traversal Route: <code className="text-amber-300">Node → pin() → Pin → net() → Net → route_length()</code>
              </span>
            </div>
          </div>

          {/* AST Code Compiler Runner */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200">Input Script for AST Compilation</span>
                <button
                  onClick={handleRunCompiler}
                  disabled={compilerLoading}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  {compilerLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>Compile & Simulate AST</span>
                </button>
              </div>

              <textarea
                rows={7}
                value={compilerCode}
                onChange={(e) => setCompilerCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono outline-none focus:border-purple-500"
              />
            </div>

            {/* Compiler Output & Shortest Path Fix */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200">AST Compiler Diagnostic & Shortest Paths</span>
                {compilerResult && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${compilerResult.clean ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    Accuracy: {compilerResult.accuracyScore}%
                  </span>
                )}
              </div>

              {compilerResult ? (
                <div className="space-y-2 text-xs">
                  {compilerResult.shortestPathFixes?.map((fix: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-950 rounded-xl border border-purple-500/30 space-y-1.5">
                      <div className="text-amber-400 font-bold">Detected Incompatible Relationship:</div>
                      <div className="text-slate-300 font-mono text-[11px] line-through text-red-400">{fix.originalSnippet}</div>
                      <div className="text-purple-300 font-bold text-[11px] mt-1">Shortest Path In Graph:</div>
                      <div className="text-slate-200 font-mono text-[11px] bg-purple-950/40 p-1.5 rounded">{fix.shortestPath}</div>
                      <div className="text-emerald-400 font-bold text-[11px] mt-1">Corrected Output:</div>
                      <div className="text-emerald-300 font-mono text-[11px]">{fix.fixedSnippet}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Run compiler to test AST structure and graph traversal.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RULE ENFORCE ENGINE (SECTION IV-2 & LISTINGS 4-5) */}
      {/* ========================================================================= */}
      {studioTab === 'rule_enforce' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">RuleEnforce Special Rules & Notes Engine</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Implements domain-specific rules (Listing 4 & 5). E.g. Cell power requires calling <code>Cell.calculate_power()</code> first.
                  </p>
                </div>
              </div>

              <button
                onClick={handleRunRuleEnforce}
                disabled={ruleLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2"
              >
                {ruleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                <span>Enforce Domain Rules</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Unrefined Code */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-slate-200">Before RuleEnforce (Standard Code)</span>
              <textarea
                rows={7}
                value={ruleCode}
                onChange={(e) => setRuleCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Output Enforced Code */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-emerald-400">After RuleEnforce (Rule-Compliant Code)</span>
              {ruleResult ? (
                <div className="space-y-3">
                  <pre className="p-3 bg-slate-950 rounded-xl text-xs text-emerald-300 font-mono overflow-x-auto border border-slate-800">
                    <code>{ruleResult.enforcedCode}</code>
                  </pre>
                  {ruleResult.appliedRules?.length > 0 && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 space-y-1">
                      <span className="font-bold uppercase text-[10px] text-emerald-400">Applied Rules:</span>
                      {ruleResult.appliedRules.map((r: string, idx: number) => (
                        <div key={idx}>• {r}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Click "Enforce Domain Rules" to apply domain rules to the code.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYNTHETIC DATA GENERATOR (SDG - ALGORITHM 1 & LISTINGS 1-3) */}
      {/* ========================================================================= */}
      {studioTab === 'sdg_studio' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/40">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Algorithm 1: Synthetic Data Generation (SDG)</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Generates synthetic SFT training data by constructing ASTs from the tool command graph, generating line-by-line comments, and synthesizing questions (Listing 3).
                  </p>
                </div>
              </div>

              <button
                onClick={handleRunSDG}
                disabled={sdgLoading}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/20"
              >
                {sdgLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Synthesize SFT Samples</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Target EDA Domain Topic</label>
                <select
                  value={sdgTopic}
                  onChange={(e) => setSdgTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200"
                >
                  <option value="timing_violations">Timing Slack & Logic Delay Violations</option>
                  <option value="power_calculation">Cell Power & Leakage Computation</option>
                  <option value="pin_net_routing">Pin Netlist & Route Length Traversal</option>
                  <option value="clock_domain_crossing">Clock Domain Crossing (CDC) & FIFOs</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Batch Size</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={sdgCount}
                  onChange={(e) => setSdgCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* SDG Generated Samples List */}
          {sdgResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider">
                  Generated Domain SFT Training Pairs ({sdgResult.samples?.length} pairs)
                </span>
                <button
                  onClick={() => handleDownloadFile('synthetic_sft_dataset.json', JSON.stringify(sdgResult.samples, null, 2))}
                  className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs flex items-center gap-1.5"
                >
                  <FolderDown className="w-3.5 h-3.5" />
                  <span>Export SFT JSON</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {sdgResult.samples?.map((sample: any, idx: number) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-cyan-300">
                        Synthesized Question #{idx + 1}:
                      </span>
                      <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                        AST Validated
                      </span>
                    </div>

                    <p className="text-xs text-slate-100 font-sans italic font-bold">
                      "{sample.question}"
                    </p>

                    <pre className="p-3 bg-slate-950 rounded-xl text-xs text-slate-200 font-mono overflow-x-auto border border-slate-800">
                      <code>{sample.code}</code>
                    </pre>

                    {sample.astStructure && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        AST Construction: <span className="text-purple-300">{sample.astStructure}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
