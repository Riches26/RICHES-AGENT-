import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Users, Sparkles, PieChart as PieChartIcon } from 'lucide-react';

export interface AgentTaskDistributionData {
  agentName: string;
  tasksCount: number;
  percentage: number;
  color: string;
}

export const D3AgentTaskDistributionChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltipData, setTooltipData] = useState<{ name: string; count: number; percent: number; x: number; y: number } | null>(null);

  // 24-Hour Specialist Sub-Agent Task Distribution Data
  const agentTasksData: AgentTaskDistributionData[] = [
    { agentName: 'Orchestrator', tasksCount: 142, percentage: 28.4, color: '#f59e0b' },
    { agentName: 'Task', tasksCount: 68, percentage: 13.6, color: '#3b82f6' },
    { agentName: 'Builder', tasksCount: 54, percentage: 10.8, color: '#10b981' },
    { agentName: 'Research', tasksCount: 48, percentage: 9.6, color: '#ec4899' },
    { agentName: 'Analytics', tasksCount: 38, percentage: 7.6, color: '#8b5cf6' },
    { agentName: 'Knowledge', tasksCount: 32, percentage: 6.4, color: '#06b6d4' },
    { agentName: 'Comms', tasksCount: 28, percentage: 5.6, color: '#f97316' },
    { agentName: 'GitHub', tasksCount: 24, percentage: 4.8, color: '#6366f1' },
    { agentName: 'Security', tasksCount: 22, percentage: 4.4, color: '#ef4444' },
    { agentName: 'Media', tasksCount: 20, percentage: 4.0, color: '#14b8a6' },
    { agentName: 'Database', tasksCount: 14, percentage: 2.8, color: '#a855f7' },
    { agentName: 'Notification', tasksCount: 10, percentage: 2.0, color: '#eab308' }
  ];

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear existing SVG contents
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 60, left: 110 };
    const width = (containerRef.current.clientWidth || 700) - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Y axis scale (Agent Names)
    const y = d3.scaleBand()
      .range([0, height])
      .domain(agentTasksData.map(d => d.agentName))
      .padding(0.25);

    // X axis scale (Tasks Count)
    const x = d3.scaleLinear()
      .domain([0, d3.max(agentTasksData, d => d.tasksCount) || 150])
      .nice()
      .range([0, width]);

    // Render Y Axis
    svg.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '600');

    // Remove axis lines
    svg.selectAll('.domain').attr('stroke', '#334155');

    // Render X Axis Grid Lines
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(-height))
      .selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    svg.selectAll('.tick line')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '2,2');

    // Create Bars with D3 Animation
    svg.selectAll('.bar')
      .data(agentTasksData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', d => y(d.agentName) || 0)
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', 0) // Start at 0 for animation
      .attr('rx', 6) // Rounded corners
      .attr('fill', d => d.color)
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        d3.select(event.currentTarget)
          .attr('opacity', 1)
          .attr('stroke', '#f8fafc')
          .attr('stroke-width', 1.5);

        const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
        setTooltipData({
          name: d.agentName,
          count: d.tasksCount,
          percent: d.percentage,
          x: mouseX,
          y: mouseY
        });
      })
      .on('mousemove', (event) => {
        const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
        setTooltipData(prev => prev ? { ...prev, x: mouseX, y: mouseY } : null);
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget)
          .attr('opacity', 0.85)
          .attr('stroke', 'none');
        setTooltipData(null);
      })
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('width', d => x(d.tasksCount));

    // Render Count Labels at the end of each bar
    svg.selectAll('.label')
      .data(agentTasksData)
      .enter()
      .append('text')
      .attr('y', d => (y(d.agentName) || 0) + y.bandwidth() / 2 + 4)
      .attr('x', 0)
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text(d => `${d.tasksCount} (${d.percentage}%)`)
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('x', d => x(d.tasksCount) + 8);

  }, []);

  return (
    <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase font-mono flex items-center gap-2">
              <span>24-Hour Specialist Agent Task Distribution (D3 Visualization)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive D3.js chart mapping total tasks assigned and executed per sub-agent.
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-bold">
          D3.js Powered
        </span>
      </div>

      <div ref={containerRef} className="relative w-full overflow-x-auto">
        <svg ref={svgRef} className="w-full min-w-[600px] h-[360px]" />

        {/* Custom Interactive Hover Tooltip */}
        {tooltipData && (
          <div
            className="absolute z-20 pointer-events-none p-3 bg-slate-950/95 border border-amber-500/50 text-slate-100 text-xs font-mono rounded-xl shadow-2xl backdrop-blur-md space-y-1"
            style={{ left: `${tooltipData.x + 15}px`, top: `${tooltipData.y - 10}px` }}
          >
            <p className="font-bold text-amber-400 border-b border-slate-800 pb-1">
              Agent: @{tooltipData.name}
            </p>
            <p className="text-slate-300">Tasks Assigned: <strong className="text-emerald-400">{tooltipData.count}</strong></p>
            <p className="text-slate-300">24h Share: <strong className="text-blue-400">{tooltipData.percent}%</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};
