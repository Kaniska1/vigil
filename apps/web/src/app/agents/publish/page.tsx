import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import {
  PublishAgentForm,
} from "@/components/agents/publish-agent-form";

import {
  AppShell,
} from "@/components/layout/app-shell";

export default async function PublishAgentPage() {
  const session =
    await auth();

  if (!session?.user) {
    redirect(
      "/login"
    );
  }

  return (
    <AppShell>
      <PublishAgentForm />
    </AppShell>
  );
}
