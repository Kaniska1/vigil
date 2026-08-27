import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import {
  MyAgents,
} from "@/components/agents/my-agents";

import {
  AppShell,
} from "@/components/layout/app-shell";

export default async function MyAgentsPage() {
  const session =
    await auth();

  if (!session?.user) {
    redirect(
      "/login"
    );
  }

  return (
    <AppShell>
      <MyAgents />
    </AppShell>
  );
}
