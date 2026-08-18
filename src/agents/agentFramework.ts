// Minimal TypeScript multi-agent framework inspired by Open Multi-Agent
// Provides Agent, Tool, DAG planner, AgentRouter, and Executor for task decomposition and execution.

export type Tool = {
  id: string;
  name: string;
  description?: string;
  execute: (params: any) => Promise<any>;
};

export type AgentDefinition = {
  id: string;
  name: string;
  role?: string;
  description?: string;
  tools?: string[]; // tool ids
  systemPrompt?: string;
};

export class Agent {
  def: AgentDefinition;
  tools: Map<string, Tool>;
  constructor(def: AgentDefinition, tools: Tool[] = []) {
    this.def = def;
    this.tools = new Map();
    for (const t of tools) this.tools.set(t.id, t);
  }

  async handlePrompt(prompt: string, context: any = {}) {
    // Very simple handler: if agent has a matching tool, call it; otherwise return a textual response.
    const toolToCall = this.tools.values().next().value as Tool | undefined;
    if (toolToCall) {
      try {
        const res = await toolToCall.execute({ prompt, ...(context || {}) });
        return { type: 'tool_result', tool: toolToCall.id, result: res };
      } catch (err) {
        return { type: 'error', message: String(err) };
      }
    }
    return { type: 'message', message: `Agent ${this.def.name} received prompt: ${prompt}` };
  }
}

export type TaskNode = {
  id: string;
  label?: string;
  agentId?: string;
  dependsOn?: string[];
  params?: any;
};

export class DAGPlanner {
  // Simple heuristic: split prompt into sentences and create nodes assigned to agents based on keywords
  static plan(prompt: string, agents: Agent[]): TaskNode[] {
    const sentences = prompt.split(/[\.\n]/).map(s => s.trim()).filter(Boolean);
    const nodes: TaskNode[] = [];
    let idx = 0;
    for (const s of sentences) {
      const agent = DAGPlanner.selectAgentForSentence(s, agents);
      nodes.push({ id: `n-${idx++}`, label: s.slice(0, 80), agentId: agent?.def.id, params: { prompt: s } });
    }
    // Add simple dependencies: linear order
    for (let i = 1; i < nodes.length; i++) nodes[i].dependsOn = [nodes[i - 1].id];
    return nodes;
  }

  static selectAgentForSentence(sentence: string, agents: Agent[]): Agent | undefined {
    const lower = sentence.toLowerCase();
    for (const a of agents) {
      const keywords = [a.def.id, a.def.name, (a.def.role || '')].join(' ').toLowerCase();
      const parts = keywords.split(/\s+/).filter(Boolean);
      for (const p of parts) {
        if (p && lower.includes(p)) return a;
      }
    }
    // fallback: return orchestrator if present
    return agents.find(a => a.def.id === 'orchestrator') || agents[0];
  }
}

export class AgentExecutor {
  agents: Map<string, Agent>;
  constructor(agents: Agent[]) {
    this.agents = new Map();
    for (const a of agents) this.agents.set(a.def.id, a);
  }

  async execute(nodes: TaskNode[], context: any = {}) {
    const results: Record<string, any> = {};
    const byId = new Map(nodes.map(n => [n.id, n]));

    // Execute respecting dependencies (very simple topological order)
    const executed = new Set<string>();

    async function execNode(node: TaskNode, self: AgentExecutor) {
      if (executed.has(node.id)) return results[node.id];
      if (node.dependsOn) {
        for (const dep of node.dependsOn) {
          const depNode = byId.get(dep as string);
          if (depNode) await execNode(depNode, self);
        }
      }
      const agent = self.agents.get(node.agentId || 'orchestrator') || Array.from(self.agents.values())[0];
      const res = await agent.handlePrompt(node.params?.prompt || node.label || '', context);
      results[node.id] = { node, agent: agent?.def.id, result: res };
      executed.add(node.id);
      return results[node.id];
    }

    for (const node of nodes) await execNode(node, this);
    return results;
  }
}

export class AgentRouter {
  agents: Agent[] = [];
  tools: Tool[] = [];

  registerTool(tool: Tool) {
    this.tools.push(tool);
  }

  registerAgent(def: AgentDefinition) {
    // attach matching tools by id
    const attached = this.tools.filter(t => def.tools?.includes(t.id));
    const agent = new Agent(def, attached);
    this.agents.push(agent);
    return agent;
  }

  planAndExecute(prompt: string, context: any = {}) {
    const planner = DAGPlanner;
    const nodes = planner.plan(prompt, this.agents);
    const executor = new AgentExecutor(this.agents);
    return executor.execute(nodes, context);
  }
}
