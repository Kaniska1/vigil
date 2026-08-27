import prisma from "../lib/prisma.js";

type LLMCompletedMetadata = {
  latencyMs?: number;
  estimatedCostUsd?: number | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    thinkingTokens?: number;
    totalTokens?: number;
  } | null;
};

function readLLMMetadata(metadata: unknown): LLMCompletedMetadata | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return null;
  }

  return metadata as LLMCompletedMetadata;
}

function getDurationMs(startedAt: Date | null, completedAt: Date | null) {
  if (!startedAt || !completedAt) {
    return null;
  }

  return completedAt.getTime() - startedAt.getTime();
}

export async function getUserMetrics(userId: string, days = 30) {
  const safeDays = Math.min(Math.max(days, 1), 90);

  const since = new Date(
    Date.now() - safeDays * 24 * 60 * 60 * 1000
  );

  const runs = await prisma.run.findMany({
    where: {
      userId,
      createdAt: {
        gte: since,
      },
    },
    include: {
      agent: {
        select: {
          id: true,
          slug: true,
          name: true,
          source: true,
        },
      },
      events: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let successfulRuns = 0;
  let failedRuns = 0;
  let runningRuns = 0;
  let pendingRuns = 0;
  let completedDurationTotal = 0;
  let completedDurationCount = 0;
  let totalToolCalls = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalThinkingTokens = 0;
  let totalTokens = 0;
  let totalEstimatedCostUsd = 0;
  let llmCalls = 0;

  const agentMap = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      source: "FIRST_PARTY" | "REMOTE";
      runs: number;
      successfulRuns: number;
      failedRuns: number;
      durationTotalMs: number;
      durationCount: number;
      toolCalls: number;
      inputTokens: number;
      outputTokens: number;
      thinkingTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      llmCalls: number;
    }
  >();

  const dailyMap = new Map<
    string,
    {
      date: string;
      runs: number;
      successfulRuns: number;
      failedRuns: number;
      durationTotalMs: number;
      durationCount: number;
      toolCalls: number;
      llmCalls: number;
      inputTokens: number;
      outputTokens: number;
      thinkingTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
    }
  >();

  for (const run of runs) {
    const date = run.createdAt.toISOString().slice(0, 10);

    const daily = dailyMap.get(date) ?? {
      date,
      runs: 0,
      successfulRuns: 0,
      failedRuns: 0,
      durationTotalMs: 0,
      durationCount: 0,
      toolCalls: 0,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };

    daily.runs++;

    if (run.status === "SUCCESS") {
      successfulRuns++;
      daily.successfulRuns++;
    }

    if (run.status === "FAILED") {
      failedRuns++;
      daily.failedRuns++;
    }

    if (run.status === "RUNNING") {
      runningRuns++;
    }

    if (run.status === "PENDING") {
      pendingRuns++;
    }

    const durationMs = getDurationMs(run.startedAt, run.completedAt);

    if (durationMs !== null) {
      completedDurationTotal += durationMs;
      completedDurationCount++;
      daily.durationTotalMs += durationMs;
      daily.durationCount++;
    }

    const agentStats = agentMap.get(run.agent.id) ?? {
      id: run.agent.id,
      slug: run.agent.slug,
      name: run.agent.name,
      source: run.agent.source,
      runs: 0,
      successfulRuns: 0,
      failedRuns: 0,
      durationTotalMs: 0,
      durationCount: 0,
      toolCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      llmCalls: 0,
    };

    agentStats.runs++;

    if (run.status === "SUCCESS") {
      agentStats.successfulRuns++;
    }

    if (run.status === "FAILED") {
      agentStats.failedRuns++;
    }

    if (durationMs !== null) {
      agentStats.durationTotalMs += durationMs;
      agentStats.durationCount++;
    }

    for (const event of run.events) {
      if (event.type === "TOOL_CALLED") {
        totalToolCalls++;
        agentStats.toolCalls++;
        daily.toolCalls++;
      }

      if (event.type !== "LLM_COMPLETED") {
        continue;
      }

      const metadata = readLLMMetadata(event.metadata);

      if (!metadata) {
        continue;
      }

      llmCalls++;
      agentStats.llmCalls++;
      daily.llmCalls++;

      const usage = metadata.usage;
      const inputTokens = usage?.inputTokens ?? 0;
      const outputTokens = usage?.outputTokens ?? 0;
      const thinkingTokens = usage?.thinkingTokens ?? 0;
      const usedTotalTokens =
        usage?.totalTokens ?? inputTokens + outputTokens + thinkingTokens;

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      totalThinkingTokens += thinkingTokens;
      totalTokens += usedTotalTokens;

      agentStats.inputTokens += inputTokens;
      agentStats.outputTokens += outputTokens;
      agentStats.thinkingTokens += thinkingTokens;
      agentStats.totalTokens += usedTotalTokens;

      daily.inputTokens += inputTokens;
      daily.outputTokens += outputTokens;
      daily.thinkingTokens += thinkingTokens;
      daily.totalTokens += usedTotalTokens;

      if (typeof metadata.estimatedCostUsd === "number") {
        totalEstimatedCostUsd += metadata.estimatedCostUsd;
        agentStats.estimatedCostUsd += metadata.estimatedCostUsd;
        daily.estimatedCostUsd += metadata.estimatedCostUsd;
      }
    }

    agentMap.set(run.agent.id, agentStats);
    dailyMap.set(date, daily);
  }

  const terminalRuns = successfulRuns + failedRuns;

  const agents = [...agentMap.values()]
    .map((agent) => ({
      id: agent.id,
      slug: agent.slug,
      name: agent.name,
      source: agent.source,
      runs: agent.runs,
      successfulRuns: agent.successfulRuns,
      failedRuns: agent.failedRuns,
      successRate:
        agent.successfulRuns + agent.failedRuns > 0
          ? agent.successfulRuns / (agent.successfulRuns + agent.failedRuns)
          : null,
      averageDurationMs:
        agent.durationCount > 0
          ? Math.round(agent.durationTotalMs / agent.durationCount)
          : null,
      toolCalls: agent.toolCalls,
      llmCalls: agent.llmCalls,
      tokens: {
        input: agent.inputTokens,
        output: agent.outputTokens,
        thinking: agent.thinkingTokens,
        total: agent.totalTokens,
      },
      estimatedCostUsd: agent.estimatedCostUsd,
    }))
    .sort((a, b) => b.runs - a.runs);

  const daily = [...dailyMap.values()]
    .map((item) => ({
      date: item.date,
      runs: item.runs,
      successfulRuns: item.successfulRuns,
      failedRuns: item.failedRuns,
      averageDurationMs:
        item.durationCount > 0
          ? Math.round(item.durationTotalMs / item.durationCount)
          : null,
      toolCalls: item.toolCalls,
      llmCalls: item.llmCalls,
      inputTokens: item.inputTokens,
      outputTokens: item.outputTokens,
      thinkingTokens: item.thinkingTokens,
      totalTokens: item.totalTokens,
      estimatedCostUsd: item.estimatedCostUsd,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    window: {
      days: safeDays,
      since: since.toISOString(),
    },
    overview: {
      runs: runs.length,
      successfulRuns,
      failedRuns,
      runningRuns,
      pendingRuns,
      successRate: terminalRuns > 0 ? successfulRuns / terminalRuns : null,
      averageDurationMs:
        completedDurationCount > 0
          ? Math.round(completedDurationTotal / completedDurationCount)
          : null,
      toolCalls: totalToolCalls,
      llmCalls,
      tokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        thinking: totalThinkingTokens,
        total: totalTokens,
      },
      estimatedCostUsd: totalEstimatedCostUsd,
    },
    daily,
    agents,
  };
}
