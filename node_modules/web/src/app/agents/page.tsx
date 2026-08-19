import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import {
  getAgents,
} from "@/lib/api";

import {
  AgentWorkspace,
} from "@/components/agents/agent-workspace";

export default async function AgentsPage() {
  const session =
    await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const agents =
    await getAgents();

  return (
    <AgentWorkspace
      agents={agents}
    />
  );
}