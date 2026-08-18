export type AgentInput = Record<string, unknown>;

export type AgentExecutionResult = {
  output: unknown;
};

export interface VigilAgent {
  slug: string;
  name: string;

  execute(input: AgentInput): Promise<AgentExecutionResult>;
}