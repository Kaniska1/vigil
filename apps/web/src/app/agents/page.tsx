import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentsServer } from "@/lib/server-api";
import { AgentWorkspace } from "@/components/agents/agent-workspace";
import { AppShell } from "@/components/layout/app-shell";

export default async function AgentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const agents = await getAgentsServer();
  return <AppShell><AgentWorkspace agents={agents} /></AppShell>;
}
