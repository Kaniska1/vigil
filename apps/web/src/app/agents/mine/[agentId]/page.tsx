import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import {
  ManagePublishedAgent,
} from "@/components/agents/manage-published-agent";

import {
  AppShell,
} from "@/components/layout/app-shell";

export default async function ManagePublishedAgentPage({
  params,
}: {
  params:
    Promise<{
      agentId: string;
    }>;
}) {
  const session =
    await auth();

  if (!session?.user) {
    redirect(
      "/login"
    );
  }

  const {
    agentId,
  } =
    await params;

  return (
    <AppShell>
      <ManagePublishedAgent
        agentId={
          agentId
        }
      />
    </AppShell>
  );
}
