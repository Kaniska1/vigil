export type ToolCallResult<T = unknown> = {
  data: T;
};

export interface VigilTool<TInput = unknown, TOutput = unknown> {
  name: string;

  execute(input: TInput): Promise<ToolCallResult<TOutput>>;
}