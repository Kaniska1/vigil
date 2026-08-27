"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Braces,
  Clock3,
  Coins,
  Gauge,
  RefreshCcw,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";

type AgentMetrics = {
  id: string;
  slug: string;
  name: string;
  source: "FIRST_PARTY" | "REMOTE";
  runs: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number | null;
  averageDurationMs: number | null;
  toolCalls: number;
  llmCalls: number;
  tokens: {
    input: number;
    output: number;
    thinking: number;
    total: number;
  };
  estimatedCostUsd: number;
};

type DailyMetrics = {
  date: string;
  runs: number;
  successfulRuns: number;
  failedRuns: number;
  averageDurationMs: number | null;
  toolCalls: number;
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

type MetricsResponse = {
  window: {
    days: number;
    since: string;
  };
  overview: {
    runs: number;
    successfulRuns: number;
    failedRuns: number;
    runningRuns: number;
    pendingRuns: number;
    successRate: number | null;
    averageDurationMs: number | null;
    toolCalls: number;
    llmCalls: number;
    tokens: {
      input: number;
      output: number;
      thinking: number;
      total: number;
    };
    estimatedCostUsd: number;
  };
  daily: DailyMetrics[];
  agents: AgentMetrics[];
};

type ApiResponse = {
  success: boolean;
  data?: MetricsResponse;
  message?: string;
};

const PERIODS = [7, 30, 90] as const;

const runsChartConfig = {
  runs: {
    label: "Runs",
    color: "var(--primary-500)",
  },
  successfulRuns: {
    label: "Success",
    color: "#22c55e",
  },
  failedRuns: {
    label: "Failed",
    color: "#ef4444",
  },
} satisfies ChartConfig;

const tokenChartConfig = {
  inputTokens: {
    label: "Input",
    color: "var(--primary-500)",
  },
  outputTokens: {
    label: "Output",
    color: "var(--accent-600)",
  },
  thinkingTokens: {
    label: "Thinking",
    color: "var(--secondary-600)",
  },
} satisfies ChartConfig;

const latencyChartConfig = {
  latency: {
    label: "Latency",
    color: "var(--accent-600)",
  },
} satisfies ChartConfig;

const costChartConfig = {
  cost: {
    label: "Cost",
    color: "var(--primary-500)",
  },
} satisfies ChartConfig;

function formatDuration(value: number | null) {
  if (value === null) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function formatCost(value: number) {
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function MetricCard({
  label,
  value,
  icon: Icon,
  helper,
  accent = "blue",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  helper: string;
  accent?: "blue" | "purple";
}) {
  return (
    <Card className="vigil-panel relative overflow-hidden border-[var(--line)]">
      <div
        className={`absolute inset-x-0 top-0 h-px ${
          accent === "blue"
            ? "bg-gradient-to-r from-transparent via-[var(--primary-600)] to-transparent"
            : "bg-gradient-to-r from-transparent via-[var(--accent-600)] to-transparent"
        }`}
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            {label}
          </span>
          <span
            className={`flex size-8 items-center justify-center rounded-[10px] ${
              accent === "blue"
                ? "bg-[var(--blue-tint)] text-[var(--primary-800)]"
                : "bg-[var(--purple-tint)] text-[var(--accent-800)]"
            }`}
          >
            <Icon className="size-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
          {value}
        </div>
        <p className="mt-2 text-xs font-medium text-[var(--ink-3)]">{helper}</p>
      </CardContent>
    </Card>
  );
}

export function MetricsDashboard() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMetrics() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/metrics?days=${days}`, {
        cache: "no-store",
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "Failed to load metrics");
      }

      setMetrics(payload.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMetrics();
  }, [days]);

  const insights = useMemo(() => {
    if (!metrics || metrics.agents.length === 0) return [];

    const agents = metrics.agents;
    const mostUsed = [...agents].sort((a, b) => b.runs - a.runs)[0];
    const slowest = [...agents]
      .filter((agent) => agent.averageDurationMs !== null)
      .sort(
        (a, b) =>
          (b.averageDurationMs ?? 0) - (a.averageDurationMs ?? 0)
      )[0];
    const leastReliable = [...agents]
      .filter((agent) => agent.successRate !== null)
      .sort((a, b) => (a.successRate ?? 1) - (b.successRate ?? 1))[0];

    return [
      mostUsed
        ? {
            title: "Most active agent",
            value: mostUsed.name,
            description: `${mostUsed.runs} runs in the selected window.`,
            icon: Zap,
          }
        : null,
      slowest
        ? {
            title: "Highest average latency",
            value: slowest.name,
            description: `${formatDuration(
              slowest.averageDurationMs
            )} average execution time.`,
            icon: Gauge,
          }
        : null,
      leastReliable
        ? {
            title: "Lowest success rate",
            value: leastReliable.name,
            description: `${formatPercent(
              leastReliable.successRate
            )} successful terminal runs.`,
            icon: Activity,
          }
        : null,
    ].filter(Boolean) as {
      title: string;
      value: string;
      description: string;
      icon: React.ElementType;
    }[];
  }, [metrics]);

  const chartData = useMemo(
    () =>
      metrics?.daily.map((item) => ({
        ...item,
        label: new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        latency: item.averageDurationMs ?? 0,
        cost: item.estimatedCostUsd,
      })) ?? [],
    [metrics]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-7 px-5 py-7 sm:px-7 lg:px-9">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Badge
            variant="outline"
            className="mb-3 gap-1.5 border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink-2)]"
          >
            <Sparkles className="size-3.5 text-[var(--accent-800)]" />
            Observability
          </Badge>
          <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
            Metrics
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--ink-3)]">
            Understand how your agents perform, what they consume, and where execution quality starts to drift.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[11px] border border-[var(--line)] bg-[var(--field)] p-1">
            {PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setDays(period)}
                className={`rounded-[8px] px-3 py-1.5 text-xs font-bold transition-all ${
                  days === period
                    ? "bg-[var(--hover-2)] text-[var(--ink)] shadow-sm"
                    : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                }`}
              >
                {period}d
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadMetrics()}
            disabled={loading}
            className="border-[var(--line)] bg-[var(--surface)]"
          >
            <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Runs" value={loading ? "..." : String(metrics?.overview.runs ?? 0)} helper={`Last ${days} days`} icon={Activity} />
        <MetricCard label="Success Rate" value={loading ? "..." : formatPercent(metrics?.overview.successRate ?? null)} helper="Terminal executions" icon={Bot} accent="purple" />
        <MetricCard label="Avg Duration" value={loading ? "..." : formatDuration(metrics?.overview.averageDurationMs ?? null)} helper="Completed runs" icon={Clock3} />
        <MetricCard label="Estimated Cost" value={loading ? "..." : formatCost(metrics?.overview.estimatedCostUsd ?? 0)} helper="Recorded LLM calls" icon={Coins} accent="purple" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tokens" value={loading ? "..." : formatTokens(metrics?.overview.tokens.total ?? 0)} helper="Input + output + thinking" icon={Braces} accent="purple" />
        <MetricCard label="Tool Calls" value={loading ? "..." : String(metrics?.overview.toolCalls ?? 0)} helper="Recorded runtime tools" icon={Wrench} />
        <MetricCard label="LLM Calls" value={loading ? "..." : String(metrics?.overview.llmCalls ?? 0)} helper="Completed generations" icon={Sparkles} accent="purple" />
        <MetricCard label="Active Agents" value={loading ? "..." : String(metrics?.agents.length ?? 0)} helper="Agents with recorded runs" icon={Zap} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="vigil-panel border-[var(--line)]">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-[-0.02em]">Execution Trend</CardTitle>
            <p className="text-xs text-[var(--ink-3)]">Run volume across the selected period.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={runsChartConfig} className="h-[280px] w-full">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="runsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="var(--accent-600)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="runs" type="monotone" fill="url(#runsGradient)" stroke="var(--primary-500)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="vigil-panel border-[var(--line)]">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-[-0.02em]">Run Outcomes</CardTitle>
            <p className="text-xs text-[var(--ink-3)]">Successful and failed runs by day.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={runsChartConfig} className="h-[280px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="successfulRuns" stackId="runs" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failedRuns" stackId="runs" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="vigil-panel border-[var(--line)]">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-[-0.02em]">Token Usage</CardTitle>
            <p className="text-xs text-[var(--ink-3)]">Input, output and thinking tokens over time.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tokenChartConfig} className="h-[280px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="inputTokens" stackId="tokens" fill="var(--primary-500)" />
                <Bar dataKey="outputTokens" stackId="tokens" fill="var(--accent-600)" />
                <Bar dataKey="thinkingTokens" stackId="tokens" fill="var(--secondary-600)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="vigil-panel border-[var(--line)]">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-[-0.02em]">Latency & Cost</CardTitle>
            <p className="text-xs text-[var(--ink-3)]">Execution latency and LLM cost trends.</p>
          </CardHeader>
          <CardContent className="space-y-8">
            <ChartContainer config={latencyChartConfig} className="h-[190px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="latency" type="monotone" stroke="var(--accent-600)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
            <Separator />
            <ChartContainer config={costChartConfig} className="h-[190px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="cost" type="monotone" stroke="var(--primary-500)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="vigil-panel overflow-hidden rounded-[18px]">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--accent-800)]" />
              <h2 className="text-lg font-extrabold tracking-[-0.025em] text-[var(--ink)]">Vigil Insights</h2>
            </div>
            <p className="mt-1 text-xs font-medium text-[var(--ink-3)]">Derived directly from current execution data.</p>
          </div>
          <Badge variant="outline" className="w-fit border-[var(--line-strong)] bg-[var(--surface-raised)] text-[var(--ink-2)]">
            {days} day snapshot
          </Badge>
        </div>

        <div className="grid gap-px bg-[var(--line)] lg:grid-cols-3">
          {insights.length > 0 ? (
            insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div key={insight.title} className="bg-[var(--surface)] p-5">
                  <span className="flex size-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-[var(--blue-tint)] to-[var(--purple-tint)] text-[var(--primary-800)]">
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">{insight.title}</p>
                  <p className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-[var(--ink)]">{insight.value}</p>
                  <p className="mt-2 text-sm font-medium leading-5 text-[var(--ink-3)]">{insight.description}</p>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-[var(--surface)] px-5 py-10 text-center text-sm text-[var(--ink-3)]">No insight data yet.</div>
          )}
        </div>
      </section>

      <section className="vigil-panel overflow-hidden rounded-[18px]">
        <div className="px-5 py-5">
          <h2 className="text-lg font-extrabold tracking-[-0.025em] text-[var(--ink)]">Agent Performance</h2>
          <p className="mt-1 text-xs font-medium text-[var(--ink-3)]">Runtime efficiency and usage by agent.</p>
        </div>
        <Separator />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--field)]">
                {["Agent", "Source", "Runs", "Success", "Avg Duration", "Tokens", "Cost"].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics?.agents.map((agent) => (
                <tr key={agent.id} className="border-b border-[var(--line)] transition-colors last:border-0 hover:bg-[var(--hover)]">
                  <td className="px-5 py-4">
                    <div className="font-bold text-[var(--ink)]">{agent.name}</div>
                    <code className="mt-1 block text-[11px] text-[var(--ink-3)]">{agent.slug}</code>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="outline" className="border-[var(--line-strong)] bg-[var(--surface-raised)] text-[var(--ink-2)]">
                      {agent.source === "REMOTE" ? "Remote" : "First-party"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 font-mono text-sm text-[var(--ink-2)]">{agent.runs}</td>
                  <td className="px-5 py-4 font-mono text-sm text-[var(--ink-2)]">{formatPercent(agent.successRate)}</td>
                  <td className="px-5 py-4 font-mono text-sm text-[var(--ink-2)]">{formatDuration(agent.averageDurationMs)}</td>
                  <td className="px-5 py-4 font-mono text-sm text-[var(--ink-2)]">{agent.tokens.total > 0 ? formatTokens(agent.tokens.total) : "—"}</td>
                  <td className="px-5 py-4 font-mono text-sm text-[var(--ink-2)]">{agent.estimatedCostUsd > 0 ? formatCost(agent.estimatedCostUsd) : "—"}</td>
                </tr>
              ))}

              {!loading && (metrics?.agents.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--ink-3)]">No agent execution data yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
