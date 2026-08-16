import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Activity, 
  Layers, 
  Sparkles, 
  Eye, 
  Sliders, 
  Rotate3d, 
  Volume2, 
  Zap,
  Radio,
  Compass,
  Palette
} from 'lucide-react';

export type Visualizer3DMode = 'ribbon_terrain' | 'hologram_sphere' | 'cyber_equalizer' | 'waterfall_3d';
export type VisualizerTheme = 'amber' | 'emerald' | 'cyan' | 'violet' | 'crimson';

interface AudioVisualizer3DProps {
  analyser?: AnalyserNode | null;
  audioLevels?: number[];
  isActive?: boolean;
  isAiSpeaking?: boolean;
  isUserSpeaking?: boolean;
  statusText?: string;
}

export const AudioVisualizer3D: React.FC<AudioVisualizer3DProps> = ({
  analyser,
  audioLevels = [],
  isActive = false,
  isAiSpeaking = false,
  isUserSpeaking = false,
  statusText
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Customization & Display States
  const [mode, setMode] = useState<Visualizer3DMode>('ribbon_terrain');
  const [theme, setTheme] = useState<VisualizerTheme>('amber');
  const [sensitivity, setSensitivity] = useState<number>(1.3);
  const [wireframeOnly, setWireframeOnly] = useState<boolean>(false);
  const [rotationAngle, setRotationAngle] = useState<{ x: number; y: number }>({ x: 15, y: 25 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // History buffer for 3D Waterfall & Terrain
  const historyBufferRef = useRef<Float32Array[]>([]);
  const MAX_HISTORY_ROWS = 28;
  const FFT_BINS = 48;

  // Real-time audio band metrics
  const [bandMetrics, setBandMetrics] = useState({
    subBass: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    air: 0,
    overallRMS: 0
  });

  // Color Palette Definitions
  const colorThemes = useMemo(() => {
    switch (theme) {
      case 'emerald':
        return {
          primary: '#10b981',
          secondary: '#34d399',
          accent: '#6ee7b7',
          glow: 'rgba(16, 185, 129, 0.4)',
          gradient: ['#064e3b', '#059669', '#10b981', '#34d399', '#6ee7b7'],
          grid: 'rgba(16, 185, 129, 0.15)',
          bg: '#02130e'
        };
      case 'cyan':
        return {
          primary: '#06b6d4',
          secondary: '#38bdf8',
          accent: '#7dd3fc',
          glow: 'rgba(6, 182, 212, 0.4)',
          gradient: ['#164e63', '#0891b2', '#06b6d4', '#38bdf8', '#7dd3fc'],
          grid: 'rgba(6, 182, 212, 0.15)',
          bg: '#021019'
        };
      case 'violet':
        return {
          primary: '#a855f7',
          secondary: '#c084fc',
          accent: '#e9d5ff',
          glow: 'rgba(168, 85, 247, 0.4)',
          gradient: ['#3b0764', '#7e22ce', '#a855f7', '#c084fc', '#e9d5ff'],
          grid: 'rgba(168, 85, 247, 0.15)',
          bg: '#0f041a'
        };
      case 'crimson':
        return {
          primary: '#f43f5e',
          secondary: '#fb7185',
          accent: '#fecdd3',
          glow: 'rgba(244, 63, 94, 0.4)',
          gradient: ['#4c0519', '#be123c', '#f43f5e', '#fb7185', '#fecdd3'],
          grid: 'rgba(244, 63, 94, 0.15)',
          bg: '#140308'
        };
      case 'amber':
      default:
        return {
          primary: '#f59e0b',
          secondary: '#fbbf24',
          accent: '#fef08a',
          glow: 'rgba(245, 158, 11, 0.4)',
          gradient: ['#451a03', '#b45309', '#f59e0b', '#fbbf24', '#fef08a'],
          grid: 'rgba(245, 158, 11, 0.15)',
          bg: '#130902'
        };
    }
  }, [theme]);

  // Keep state and props synced in refs to avoid restarting canvas render loops
  const stateRefs = useRef({
    mode,
    sensitivity,
    wireframeOnly,
    rotationAngle,
    audioLevels,
    isActive,
    isAiSpeaking,
    isUserSpeaking,
    colorThemes
  });

  useEffect(() => {
    stateRefs.current = {
      mode,
      sensitivity,
      wireframeOnly,
      rotationAngle,
      audioLevels,
      isActive,
      isAiSpeaking,
      isUserSpeaking,
      colorThemes
    };
  }, [mode, sensitivity, wireframeOnly, rotationAngle, audioLevels, isActive, isAiSpeaking, isUserSpeaking, colorThemes]);

  const lastMetricsUpdateRef = useRef<number>(0);

  // Handle Mouse Drag to Orbit 3D perspective
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    setRotationAngle(prev => ({
      x: Math.max(-45, Math.min(65, prev.x + deltaY * 0.4)),
      y: (prev.y + deltaX * 0.4) % 360
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Main 3D Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const dataArray = new Uint8Array(FFT_BINS * 2);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      const {
        mode: currentMode,
        sensitivity: currSensitivity,
        wireframeOnly: currWireframe,
        rotationAngle: currRot,
        audioLevels: currLevels,
        isActive: currActive,
        isAiSpeaking: currAiSpeaking,
        isUserSpeaking: currUserSpeaking,
        colorThemes: currColors
      } = stateRefs.current;

      // Extract real-time frequency data or construct synthesized resonant frequencies
      const currentFrequencies = new Float32Array(FFT_BINS);

      if (analyser && (currActive || currUserSpeaking)) {
        try {
          analyser.getByteFrequencyData(dataArray);
          for (let i = 0; i < FFT_BINS; i++) {
            const val = dataArray[i] || 0;
            currentFrequencies[i] = (val / 255) * currSensitivity;
          }
        } catch {
          // Fallback to synthesized audio level data
          for (let i = 0; i < FFT_BINS; i++) {
            const levelIdx = i % (currLevels.length || 1);
            currentFrequencies[i] = ((currLevels[levelIdx] || 15) / 100) * currSensitivity;
          }
        }
      } else if (currAiSpeaking) {
        // Synthesized AI voice speech harmonics
        const t = Date.now() / 120;
        for (let i = 0; i < FFT_BINS; i++) {
          const wave = Math.sin(t * 1.5 + i * 0.4) * 0.4 + 0.5;
          const harmonic = Math.cos(t * 0.8 + i * 0.2) * 0.3;
          currentFrequencies[i] = Math.max(0.08, Math.min(1.2, (wave + harmonic) * currSensitivity));
        }
      } else if (currActive) {
        // Idle ambient baseline
        const t = Date.now() / 300;
        for (let i = 0; i < FFT_BINS; i++) {
          currentFrequencies[i] = Math.max(0.05, Math.sin(t + i * 0.3) * 0.08 + 0.1);
        }
      } else {
        // Dormant
        for (let i = 0; i < FFT_BINS; i++) {
          currentFrequencies[i] = 0.04;
        }
      }

      // Update Frequency Band Metrics at throttled rate (every 120ms max)
      const now = Date.now();
      if (now - lastMetricsUpdateRef.current > 120) {
        lastMetricsUpdateRef.current = now;
        const sub = currentFrequencies.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
        const bass = currentFrequencies.slice(4, 12).reduce((a, b) => a + b, 0) / 8;
        const mid = currentFrequencies.slice(12, 26).reduce((a, b) => a + b, 0) / 14;
        const treble = currentFrequencies.slice(26, 38).reduce((a, b) => a + b, 0) / 12;
        const air = currentFrequencies.slice(38, 48).reduce((a, b) => a + b, 0) / 10;
        const rms = currentFrequencies.reduce((a, b) => a + b, 0) / FFT_BINS;

        setBandMetrics({
          subBass: Math.round(sub * 100),
          bass: Math.round(bass * 100),
          mid: Math.round(mid * 100),
          treble: Math.round(treble * 100),
          air: Math.round(air * 100),
          overallRMS: Math.round(rms * 100)
        });
      }

      // Update History Buffer for 3D depth rows
      historyBufferRef.current.unshift(new Float32Array(currentFrequencies));
      if (historyBufferRef.current.length > MAX_HISTORY_ROWS) {
        historyBufferRef.current.pop();
      }

      // Clear Canvas with smooth trail fade
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Background Ambient Glow
      const centerX = width / 2;
      const centerY = height / 2;
      const glowGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width * 0.6);
      glowGrad.addColorStop(0, currColors.glow);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // 3D Perspective Projection Utility
      const project3D = (x3d: number, y3d: number, z3d: number) => {
        // Apply pitch & yaw rotations
        const radX = (currRot.x * Math.PI) / 180;
        const radY = (currRot.y * Math.PI) / 180;

        // Rotate Y (Yaw)
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);
        const xRot = x3d * cosY + z3d * sinY;
        const zRot = -x3d * sinY + z3d * cosY;

        // Rotate X (Pitch)
        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const yRot = y3d * cosX - zRot * sinX;
        const zFinal = y3d * sinX + zRot * cosX + 450; // Camera distance offset

        // Perspective Divide
        const fov = 380;
        const scale = fov / Math.max(zFinal, 10);
        const projX = centerX + xRot * scale;
        const projY = centerY + yRot * scale + 25;

        return { x: projX, y: projY, scale, z: zFinal };
      };

      // RENDER MODE 1: 3D RIBBON TERRAIN MESH
      if (currentMode === 'ribbon_terrain') {
        const rows = historyBufferRef.current;
        const numCols = FFT_BINS;
        const cellWidth = 14;
        const cellDepth = 16;
        const startX = -((numCols - 1) * cellWidth) / 2;
        const startZ = -((rows.length - 1) * cellDepth) / 2;

        // Draw 3D Grid & Waveform Mesh from back to front
        for (let r = rows.length - 1; r >= 0; r--) {
          const rowData = rows[r];
          const z3d = startZ + r * cellDepth;
          const alpha = 1 - (r / rows.length) * 0.85;

          // Draw ribbon polyline
          ctx.beginPath();
          let firstPt = true;

          for (let c = 0; c < numCols; c++) {
            const x3d = startX + c * cellWidth;
            const amp = rowData ? (rowData[c] || 0) : 0;
            const y3d = -amp * 110;

            const proj = project3D(x3d, y3d, z3d);

            if (firstPt) {
              ctx.moveTo(proj.x, proj.y);
              firstPt = false;
            } else {
              ctx.lineTo(proj.x, proj.y);
            }
          }

          // Stroke Ribbon
          ctx.strokeStyle = r === 0 
            ? currColors.primary 
            : `${currColors.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = r === 0 ? 2.5 : 1.2;
          ctx.stroke();

          // Connect vertical columns to previous row for wireframe grid
          if (r < rows.length - 1 && !currWireframe) {
            const nextRowData = rows[r + 1];
            const nextZ3d = startZ + (r + 1) * cellDepth;

            for (let c = 0; c < numCols; c += 2) {
              const x3d = startX + c * cellWidth;
              const amp1 = rowData ? (rowData[c] || 0) : 0;
              const amp2 = nextRowData ? (nextRowData[c] || 0) : 0;

              const p1 = project3D(x3d, -amp1 * 110, z3d);
              const p2 = project3D(x3d, -amp2 * 110, nextZ3d);

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `${currColors.secondary}${Math.floor(alpha * 120).toString(16).padStart(2, '0')}`;
              ctx.lineWidth = 0.75;
              ctx.stroke();
            }
          }
        }

        // Apex Harmonic Particle Glows on Top Row
        if (rows[0]) {
          for (let c = 0; c < numCols; c += 3) {
            const amp = rows[0][c] || 0;
            if (amp > 0.35) {
              const x3d = startX + c * cellWidth;
              const y3d = -amp * 110;
              const p = project3D(x3d, y3d, startZ);

              ctx.beginPath();
              ctx.arc(p.x, p.y, Math.min(6, amp * 4), 0, Math.PI * 2);
              ctx.fillStyle = currColors.accent;
              ctx.shadowColor = currColors.primary;
              ctx.shadowBlur = 10;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      // RENDER MODE 2: 3D HOLOGRAPHIC PARTICLE ORBIT & SPHERICAL FREQUENCY RINGS
      else if (currentMode === 'hologram_sphere') {
        const time = Date.now() / 600;
        const numRings = 6;
        const pointsPerRing = 36;
        const baseRadius = 85 + (bandMetrics.overallRMS / 100) * 35;

        // Concentric 3D frequency rings
        for (let ring = 0; ring < numRings; ring++) {
          const ringAngleOffset = (ring * Math.PI) / numRings;
          const ringRadius = baseRadius * (0.6 + (ring / numRings) * 0.7);
          const ringFreqIdx = (ring * 7) % FFT_BINS;
          const ringAmp = currentFrequencies[ringFreqIdx] || 0.1;

          ctx.beginPath();
          for (let p = 0; p <= pointsPerRing; p++) {
            const theta = (p / pointsPerRing) * Math.PI * 2 + time * (ring % 2 === 0 ? 1 : -1);
            const freqVal = currentFrequencies[(p + ring * 3) % FFT_BINS] || 0;
            const rOffset = ringRadius + freqVal * 45;

            // Compute spherical 3D coordinates
            const x3d = Math.cos(theta) * rOffset;
            const y3d = Math.sin(theta) * Math.cos(ringAngleOffset) * rOffset;
            const z3d = Math.sin(theta) * Math.sin(ringAngleOffset) * rOffset;

            const proj = project3D(x3d, y3d, z3d);

            if (p === 0) {
              ctx.moveTo(proj.x, proj.y);
            } else {
              ctx.lineTo(proj.x, proj.y);
            }
          }

          ctx.strokeStyle = ring === 0 
            ? currColors.accent 
            : `${currColors.primary}${Math.floor((0.4 + ringAmp * 0.6) * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1.5 + ringAmp * 1.5;
          ctx.stroke();
        }

        // Center Pulsing 3D Core Sphere
        const coreProj = project3D(0, 0, 0);
        ctx.beginPath();
        ctx.arc(coreProj.x, coreProj.y, 16 + (bandMetrics.overallRMS / 100) * 28, 0, Math.PI * 2);
        const coreGrad = ctx.createRadialGradient(coreProj.x, coreProj.y, 2, coreProj.x, coreProj.y, 24 + (bandMetrics.overallRMS / 100) * 30);
        coreGrad.addColorStop(0, currColors.accent);
        coreGrad.addColorStop(0.5, currColors.primary);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // Orbiting Satellites
        for (let sat = 0; sat < 8; sat++) {
          const satTheta = time * 1.4 + (sat * Math.PI) / 4;
          const satR = baseRadius * 1.35;
          const x3d = Math.cos(satTheta) * satR;
          const y3d = Math.sin(satTheta * 0.7) * (satR * 0.6);
          const z3d = Math.sin(satTheta) * satR;

          const satProj = project3D(x3d, y3d, z3d);
          ctx.beginPath();
          ctx.arc(satProj.x, satProj.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = currColors.secondary;
          ctx.fill();
        }
      }

      // RENDER MODE 3: 3D CYBER EQUALIZER CYLINDER
      else if (currentMode === 'cyber_equalizer') {
        const numBars = 32;
        const radius = 95;
        const time = Date.now() / 1500;

        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2 + time;
          const freqVal = currentFrequencies[i % FFT_BINS] || 0.1;
          const barHeight = Math.max(10, freqVal * 120);

          const xBase = Math.cos(angle) * radius;
          const zBase = Math.sin(angle) * radius;

          const pBottom = project3D(xBase, 40, zBase);
          const pTop = project3D(xBase, 40 - barHeight, zBase);

          // Draw 3D vertical pillar
          ctx.beginPath();
          ctx.moveTo(pBottom.x, pBottom.y);
          ctx.lineTo(pTop.x, pTop.y);
          ctx.strokeStyle = currColors.primary;
          ctx.lineWidth = Math.max(2, pBottom.scale * 3.5);
          ctx.stroke();

          // Cap light on top
          ctx.beginPath();
          ctx.arc(pTop.x, pTop.y, Math.max(2, pTop.scale * 2.5), 0, Math.PI * 2);
          ctx.fillStyle = currColors.accent;
          ctx.fill();
        }

        // Circular Base Ring
        ctx.beginPath();
        for (let i = 0; i <= numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2 + time;
          const xBase = Math.cos(angle) * radius;
          const zBase = Math.sin(angle) * radius;
          const p = project3D(xBase, 40, zBase);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = currColors.grid;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // RENDER MODE 4: 3D WATERFALL SPECTROGRAM
      else if (currentMode === 'waterfall_3d') {
        const rows = historyBufferRef.current;
        const numCols = FFT_BINS;
        const sliceWidth = 14;
        const sliceDepth = 15;
        const startX = -((numCols - 1) * sliceWidth) / 2;

        for (let r = rows.length - 1; r >= 0; r--) {
          const rowData = rows[r];
          const z3d = -((rows.length - 1) * sliceDepth) / 2 + r * sliceDepth;
          const alpha = 1 - (r / rows.length) * 0.8;

          for (let c = 0; c < numCols - 1; c++) {
            const x1 = startX + c * sliceWidth;
            const x2 = startX + (c + 1) * sliceWidth;
            const amp1 = rowData ? (rowData[c] || 0) : 0;
            const amp2 = rowData ? (rowData[c + 1] || 0) : 0;

            const p1 = project3D(x1, -amp1 * 90, z3d);
            const p2 = project3D(x2, -amp2 * 90, z3d);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${currColors.gradient[c % currColors.gradient.length]}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 2.2;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight || 300;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[320px] bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col select-none font-mono"
    >
      {/* Top HUD Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-slate-950/90 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
              <span>3D WebGL / Canvas Spectral Engine</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-semibold">
                {isActive || isAiSpeaking || isUserSpeaking ? 'STREAMING' : 'READY'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {statusText || (isAiSpeaking ? 'Vocal Synthesis Output Reactive FFT' : isUserSpeaking ? 'Microphone Voice Input Wave' : 'Awaiting Speech Activation')}
            </p>
          </div>
        </div>

        {/* Visualizer Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setMode('ribbon_terrain')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              mode === 'ribbon_terrain' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3D Terrain Mesh Ribbon"
          >
            Terrain
          </button>
          <button
            onClick={() => setMode('hologram_sphere')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              mode === 'hologram_sphere' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3D Holographic Orbit"
          >
            Hologram
          </button>
          <button
            onClick={() => setMode('cyber_equalizer')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              mode === 'cyber_equalizer' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3D Cylindrical Equalizer"
          >
            Equalizer
          </button>
          <button
            onClick={() => setMode('waterfall_3d')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              mode === 'waterfall_3d' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3D Waterfall Spectrogram"
          >
            Waterfall
          </button>
        </div>
      </div>

      {/* Main Interactive 3D Canvas Stage */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      />

      {/* Bottom HUD Spectrum & Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent flex flex-wrap items-center justify-between gap-3 text-[10px]">
        {/* Real-Time Harmonic Equalizer Bands */}
        <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">SUB</span>
            <span className="text-amber-400 font-bold">{bandMetrics.subBass}%</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">BASS</span>
            <span className="text-emerald-400 font-bold">{bandMetrics.bass}%</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">MID</span>
            <span className="text-cyan-400 font-bold">{bandMetrics.mid}%</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">TREBLE</span>
            <span className="text-violet-400 font-bold">{bandMetrics.treble}%</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">AIR</span>
            <span className="text-pink-400 font-bold">{bandMetrics.air}%</span>
          </div>
        </div>

        {/* Customization Controls: Palette & Sensitivity */}
        <div className="flex items-center gap-2">
          {/* Color Themes */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {(['amber', 'emerald', 'cyan', 'violet', 'crimson'] as VisualizerTheme[]).map(th => (
              <button
                key={th}
                onClick={() => setTheme(th)}
                className={`w-3.5 h-3.5 rounded-full transition-transform ${
                  theme === th ? 'scale-125 ring-2 ring-white/50' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: 
                    th === 'amber' ? '#f59e0b' : 
                    th === 'emerald' ? '#10b981' : 
                    th === 'cyan' ? '#06b6d4' : 
                    th === 'violet' ? '#a855f7' : '#f43f5e'
                }}
                title={`${th} theme`}
              />
            ))}
          </div>

          {/* Sensitivity Slider */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800">
            <Sliders className="w-3 h-3 text-slate-400" />
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-16 h-1 accent-amber-400 bg-slate-800 rounded cursor-pointer"
              title={`Gain Sensitivity: ${sensitivity}x`}
            />
            <span className="text-slate-400 text-[9px] w-6">{sensitivity}x</span>
          </div>

          {/* Perspective Reset */}
          <button
            onClick={() => setRotationAngle({ x: 15, y: 25 })}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition-colors"
            title="Reset 3D Camera Orbit"
          >
            <Rotate3d className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
