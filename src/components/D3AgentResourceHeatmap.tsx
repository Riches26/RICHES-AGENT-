import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Zap, 
  Activity, 
  Layers, 
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  Cpu, 
  Database, 
  AlertTriangle,
  Clock,
  Flame,
  Info,
  Maximize2
} from 'lucide-react';

export type HeatmapViewMode = 'resource_metrics' | 'hourly_tokens' | 'hourly_latency';
export type HeatmapColorScale = 'magma' | 'viridis' | 'turbo' | 'plasma';

interface HeatmapCellData {
  agentId: string;
  agentName: string;
  metricKey: string;
  metricLabel: string;
  value: number;
  formattedValue: string;
  normalizedScore: number; // 0 to 100
  unit: string;
  category: 'tokens' | 'latency' | 'compute' | 'calls' | 'reliability';
}

export const D3AgentResourceHeatmap: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Configuration States
  const [viewMode, setViewMode] = useState<HeatmapViewMode>('resource_metrics');
  const [colorScaleName, setColorScaleName] = useState<HeatmapColorScale>('turbo');
  const [isLiveTelemetry, setIsLiveTelemetry] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [hoveredCell, setHoveredCell] = useState<{
    data: HeatmapCellData;
    x: number;
    y: number;
  } | null>(null);

  // List of Platform Agents
  const agentRoster = useMemo(() => [
    { id: 'orchestrator', name: 'Master Orchestrator', category: 'system' },
    { id: 'builder', name: 'Software Builder', category: 'developer' },
    { id: 'research', name: 'Research Analyst', category: 'specialist' },
    { id: 'task', name: 'Task Specialist', category: 'core' },
    { id: 'knowledge', name: 'Knowledge & RAG', category: 'specialist' },
    { id: 'analytics', name: 'Analytics Engine', category: 'specialist' },
    { id: 'communications', name: 'Comms & Gmail', category: 'specialist' },
    { id: 'github', name: 'GitHub Agent', category: 'developer' },
    { id: 'database', name: 'Database Architect', category: 'developer' },
    { id: 'media', name: 'Media Generator', category: 'specialist' },
    { id: 'security', name: 'Security Sentinel', category: 'system' },
    { id: 'notification', name: 'Notification Hub', category: 'system' }
  ], []);

  // Metrics Columns for 'resource_metrics' mode
  const metricColumns = useMemo(() => [
    { key: 'tokens_in', label: 'Input Tokens (k)', unit: 'k tokens', category: 'tokens' as const },
    { key: 'tokens_out', label: 'Output Tokens (k)', unit: 'k tokens', category: 'tokens' as const },
    { key: 'avg_latency', label: 'Avg Latency (ms)', unit: 'ms', category: 'latency' as const },
    { key: 'p99_latency', label: 'P99 Latency (ms)', unit: 'ms', category: 'latency' as const },
    { key: 'compute_load', label: 'CPU Load (%)', unit: '%', category: 'compute' as const },
    { key: 'mem_mb', label: 'Memory (MB)', unit: 'MB', category: 'compute' as const },
    { key: 'tool_calls', label: 'Tool Invocations', unit: 'calls/hr', category: 'calls' as const },
    { key: 'retry_rate', label: 'Retry Rate (%)', unit: '%', category: 'reliability' as const }
  ], []);

  // Time Columns for 24-Hour mode
  const hourlyColumns = useMemo(() => [
    '00:00', '02:00', '04:00', '06:00', '08:00', '10:00',
    '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'
  ], []);

  // Dynamic Telemetry Data State
  const [telemetryMatrix, setTelemetryMatrix] = useState<HeatmapCellData[]>([]);

  // Generate / Refresh Matrix Data
  const generateData = () => {
    const cells: HeatmapCellData[] = [];

    if (viewMode === 'resource_metrics') {
      agentRoster.forEach(agent => {
        // Base seed multipliers per agent profile
        let tokenInBase = 42;
        let tokenOutBase = 38;
        let latencyBase = 110;
        let p99Base = 220;
        let cpuBase = 25;
        let memBase = 180;
        let toolsBase = 45;
        let retryBase = 1.2;

        if (agent.id === 'builder') {
          tokenInBase = 85; tokenOutBase = 120; latencyBase = 240; p99Base = 480; cpuBase = 72; memBase = 460; toolsBase = 110; retryBase = 3.8;
        } else if (agent.id === 'orchestrator') {
          tokenInBase = 98; tokenOutBase = 75; latencyBase = 135; p99Base = 260; cpuBase = 54; memBase = 320; toolsBase = 140; retryBase = 0.8;
        } else if (agent.id === 'research') {
          tokenInBase = 76; tokenOutBase = 95; latencyBase = 310; p99Base = 590; cpuBase = 60; memBase = 380; toolsBase = 85; retryBase = 2.4;
        } else if (agent.id === 'knowledge') {
          tokenInBase = 62; tokenOutBase = 50; latencyBase = 160; p99Base = 320; cpuBase = 48; memBase = 410; toolsBase = 90; retryBase = 1.6;
        } else if (agent.id === 'media') {
          tokenInBase = 40; tokenOutBase = 30; latencyBase = 420; p99Base = 850; cpuBase = 85; memBase = 620; toolsBase = 30; retryBase = 4.2;
        }

        // Add subtle live variance
        const variance = () => (Math.random() - 0.5) * 0.15;

        metricColumns.forEach(col => {
          let val = 0;
          let formatted = '';
          let score = 0; // 0 to 100

          switch (col.key) {
            case 'tokens_in':
              val = Math.round(tokenInBase * (1 + variance()));
              formatted = `${val}k`;
              score = Math.min(100, Math.round((val / 110) * 100));
              break;
            case 'tokens_out':
              val = Math.round(tokenOutBase * (1 + variance()));
              formatted = `${val}k`;
              score = Math.min(100, Math.round((val / 130) * 100));
              break;
            case 'avg_latency':
              val = Math.round(latencyBase * (1 + variance()));
              formatted = `${val}ms`;
              score = Math.min(100, Math.round((val / 450) * 100));
              break;
            case 'p99_latency':
              val = Math.round(p99Base * (1 + variance()));
              formatted = `${val}ms`;
              score = Math.min(100, Math.round((val / 900) * 100));
              break;
            case 'compute_load':
              val = Math.round(cpuBase * (1 + variance()));
              formatted = `${val}%`;
              score = val;
              break;
            case 'mem_mb':
              val = Math.round(memBase * (1 + variance()));
              formatted = `${val}MB`;
              score = Math.min(100, Math.round((val / 700) * 100));
              break;
            case 'tool_calls':
              val = Math.round(toolsBase * (1 + variance()));
              formatted = `${val}/hr`;
              score = Math.min(100, Math.round((val / 150) * 100));
              break;
            case 'retry_rate':
              val = parseFloat((retryBase * (1 + variance())).toFixed(1));
              formatted = `${val}%`;
              score = Math.min(100, Math.round((val / 6) * 100));
              break;
          }

          cells.push({
            agentId: agent.id,
            agentName: agent.name,
            metricKey: col.key,
            metricLabel: col.label,
            value: val,
            formattedValue: formatted,
            normalizedScore: Math.max(8, score),
            unit: col.unit,
            category: col.category
          });
        });
      });
    } else {
      // 24-Hour hourly token / latency heatmap
      const isTokens = viewMode === 'hourly_tokens';
      agentRoster.forEach(agent => {
        hourlyColumns.forEach((hour, hIdx) => {
          // Peak daytime usage curve (hours 10:00 - 18:00)
          const hourWeight = Math.sin((hIdx / hourlyColumns.length) * Math.PI) * 0.8 + 0.3;
          let agentWeight = 1.0;
          if (agent.id === 'orchestrator' || agent.id === 'builder') agentWeight = 1.8;
          if (agent.id === 'research' || agent.id === 'knowledge') agentWeight = 1.4;

          const baseVal = isTokens ? 18000 : 120;
          const val = Math.round(baseVal * hourWeight * agentWeight * (0.85 + Math.random() * 0.3));
          const score = isTokens 
            ? Math.min(100, Math.round((val / 42000) * 100))
            : Math.min(100, Math.round((val / 480) * 100));

          cells.push({
            agentId: agent.id,
            agentName: agent.name,
            metricKey: hour,
            metricLabel: `${hour} Epoch`,
            value: val,
            formattedValue: isTokens ? `${(val / 1000).toFixed(1)}k tokens` : `${val}ms`,
            normalizedScore: Math.max(10, score),
            unit: isTokens ? 'tokens' : 'ms',
            category: isTokens ? 'tokens' : 'latency'
          });
        });
      });
    }

    setTelemetryMatrix(cells);
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // Initial load and Live Telemetry polling
  useEffect(() => {
    generateData();
  }, [viewMode]);

  useEffect(() => {
    if (!isLiveTelemetry) return;
    const interval = setInterval(() => {
      generateData();
    }, 4500);
    return () => clearInterval(interval);
  }, [isLiveTelemetry, viewMode]);

  // D3 Color Interpolator
  const colorInterpolator = useMemo(() => {
    switch (colorScaleName) {
      case 'magma':
        return d3.interpolateMagma;
      case 'viridis':
        return d3.interpolateViridis;
      case 'plasma':
        return d3.interpolatePlasma;
      case 'turbo':
      default:
        return d3.interpolateTurbo;
    }
  }, [colorScaleName]);

  // Main D3 Rendering Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || telemetryMatrix.length === 0) return;

    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 60, right: 30, bottom: 30, left: 160 };
    const containerWidth = containerRef.current.clientWidth || 800;
    const width = containerWidth - margin.left - margin.right;
    const rowHeight = 32;
    const height = agentRoster.length * rowHeight;

    svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X and Y Scales
    const xLabels = viewMode === 'resource_metrics' 
      ? metricColumns.map(c => c.label)
      : hourlyColumns;

    const yLabels = agentRoster.map(a => a.name);

    const xScale = d3.scaleBand()
      .domain(xLabels)
      .range([0, width])
      .padding(0.06);

    const yScale = d3.scaleBand()
      .domain(yLabels)
      .range([0, height])
      .padding(0.06);

    // Color Scale: Normalized score (0 to 100) -> Interpolator (0.1 to 0.9 for readability)
    const colorScale = (score: number) => {
      const t = 0.15 + (score / 100) * 0.8;
      return colorInterpolator(Math.min(0.95, t));
    };

    // Render X Axis (Top Labels with angle)
    const xAxis = g.append('g')
      .attr('class', 'x-axis')
      .call(d3.axisTop(xScale).tickSize(0));

    xAxis.select('.domain').remove();
    xAxis.selectAll('text')
      .style('fill', '#94a3b8')
      .style('font-family', 'monospace')
      .style('font-size', '10px')
      .style('font-weight', '600')
      .attr('transform', 'rotate(-25)')
      .style('text-anchor', 'start')
      .attr('dx', '8px')
      .attr('dy', '-6px');

    // Render Y Axis (Agent Names)
    const yAxis = g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale).tickSize(0));

    yAxis.select('.domain').remove();
    yAxis.selectAll('text')
      .style('fill', '#e2e8f0')
      .style('font-family', 'monospace')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .attr('dx', '-8px');

    // Draw Heatmap Cells
    const cellGroups = g.selectAll<SVGGElement, HeatmapCellData>('.cell-group')
      .data(telemetryMatrix)
      .enter()
      .append('g')
      .attr('class', 'cell-group')
      .attr('transform', (d: HeatmapCellData) => {
        const xPos = xScale(d.metricLabel) || 0;
        const yPos = yScale(d.agentName) || 0;
        return `translate(${xPos}, ${yPos})`;
      });

    // Background Rounded Rectangles
    cellGroups.append('rect')
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d: HeatmapCellData) => colorScale(d.normalizedScore))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseenter', function(event: MouseEvent, d: HeatmapCellData) {
        d3.select(this)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))');

        const [mX, mY] = d3.pointer(event, containerRef.current);
        setHoveredCell({
          data: d,
          x: mX,
          y: mY
        });
      })
      .on('mousemove', function(event: MouseEvent, d: HeatmapCellData) {
        const [mX, mY] = d3.pointer(event, containerRef.current);
        setHoveredCell({
          data: d,
          x: mX,
          y: mY
        });
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('stroke', '#0f172a')
          .attr('stroke-width', 1.5)
          .style('filter', 'none');
        setHoveredCell(null);
      });

    // Cell Value Text Label (Visible if cell width allows)
    if (xScale.bandwidth() > 44) {
      cellGroups.append('text')
        .attr('x', xScale.bandwidth() / 2)
        .attr('y', yScale.bandwidth() / 2 + 3.5)
        .attr('text-anchor', 'middle')
        .style('fill', (d: HeatmapCellData) => d.normalizedScore > 55 ? '#020617' : '#ffffff')
        .style('font-family', 'monospace')
        .style('font-size', '9px')
        .style('font-weight', '700')
        .style('pointer-events', 'none')
        .text((d: HeatmapCellData) => d.formattedValue);
    }

  }, [telemetryMatrix, viewMode, colorInterpolator, colorScaleName, agentRoster, metricColumns, hourlyColumns]);

  // Calculate Top Aggregates
  const topTokenAgent = useMemo(() => {
    return { name: 'Software Builder', tokens: '205k', share: '32.4%' };
  }, []);

  const topLatencyAgent = useMemo(() => {
    return { name: 'Media Generator', latency: '420ms', status: 'Multimodal Render' };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-4 shadow-xl font-mono relative overflow-hidden"
    >
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Agent Resource & Token Consumption Heatmap (D3.js)
              </h3>
              <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                Real-Time Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Visualizes relative token consumption, processing latency, and compute load across specialist agents.
            </p>
          </div>
        </div>

        {/* View Mode & Color Scale Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('resource_metrics')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                viewMode === 'resource_metrics'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Metrics Matrix
            </button>
            <button
              onClick={() => setViewMode('hourly_tokens')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                viewMode === 'hourly_tokens'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24h Tokens
            </button>
            <button
              onClick={() => setViewMode('hourly_latency')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                viewMode === 'hourly_latency'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24h Latency
            </button>
          </div>

          {/* Color Palettes */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 mr-1">Scale:</span>
            {(['turbo', 'magma', 'viridis', 'plasma'] as HeatmapColorScale[]).map(cs => (
              <button
                key={cs}
                onClick={() => setColorScaleName(cs)}
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                  colorScaleName === cs
                    ? 'bg-slate-800 text-amber-300 border border-slate-700'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {cs}
              </button>
            ))}
          </div>

          {/* Live Refresh Toggle */}
          <button
            onClick={() => setIsLiveTelemetry(!isLiveTelemetry)}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              isLiveTelemetry
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
            title="Toggle Live Telemetry Polling"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLiveTelemetry ? 'animate-spin' : ''}`} />
            <span>{isLiveTelemetry ? 'Live' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase">Top Token Consumer</span>
            <p className="text-xs font-bold text-slate-100">@{topTokenAgent.name}</p>
          </div>
          <span className="px-2 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold">
            {topTokenAgent.tokens} ({topTokenAgent.share})
          </span>
        </div>

        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase">Highest Latency P99</span>
            <p className="text-xs font-bold text-slate-100">@{topLatencyAgent.name}</p>
          </div>
          <span className="px-2 py-1 bg-pink-500/15 text-pink-300 border border-pink-500/30 rounded-lg text-xs font-bold">
            {topLatencyAgent.latency}
          </span>
        </div>

        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase">Telemetry Stream Health</span>
            <p className="text-xs font-bold text-emerald-400">Optimal Throughput</p>
          </div>
          <span className="text-[10px] text-slate-400">
            Updated: {lastSyncTime}
          </span>
        </div>
      </div>

      {/* Main D3 Heatmap SVG Stage */}
      <div className="w-full overflow-x-auto pt-2 pb-2">
        <div className="min-w-[650px]">
          <svg ref={svgRef} className="w-full" />
        </div>
      </div>

      {/* Heatmap Legend Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">Consumption Scale:</span>
          <span>Low (0-25%)</span>
          <div 
            className="w-28 h-2.5 rounded-full" 
            style={{ 
              background: colorScaleName === 'turbo' 
                ? 'linear-gradient(to right, #30123b, #28bbec, #a2fc3c, #fb8022, #7a0403)' 
                : colorScaleName === 'viridis' 
                ? 'linear-gradient(to right, #440154, #31688e, #35b779, #fde725)'
                : colorScaleName === 'magma'
                ? 'linear-gradient(to right, #000004, #51127c, #b73779, #fc8961, #fcfdbf)'
                : 'linear-gradient(to right, #0d0887, #6a00a8, #b12a90, #e16462, #fca636, #f0f921)'
            }} 
          />
          <span>Critical / Heavy (75-100%)</span>
        </div>

        <span className="text-slate-500">
          Hover over any grid tile to inspect telemetry parameters & anomalies.
        </span>
      </div>

      {/* Floating Interactive Tooltip */}
      {hoveredCell && (
        <div 
          className="absolute z-30 pointer-events-none p-3 bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 animate-in fade-in duration-150"
          style={{
            left: `${Math.min(hoveredCell.x + 15, (containerRef.current?.clientWidth || 700) - 220)}px`,
            top: `${Math.max(10, hoveredCell.y - 80)}px`,
            width: '210px'
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="font-bold text-amber-300">@{hoveredCell.data.agentName}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-300 font-mono">
              {hoveredCell.data.normalizedScore}% load
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">{hoveredCell.data.metricLabel}:</span>
            <span className="font-bold text-slate-100 font-mono">{hoveredCell.data.formattedValue}</span>
          </div>

          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-300"
              style={{ width: `${hoveredCell.data.normalizedScore}%` }}
            />
          </div>

          <div className="text-[9px] text-slate-400 pt-0.5 flex items-center justify-between">
            <span>Status:</span>
            <span className={hoveredCell.data.normalizedScore > 75 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
              {hoveredCell.data.normalizedScore > 75 ? '⚠️ Elevated Consumption' : '✓ Normal Throughput'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
