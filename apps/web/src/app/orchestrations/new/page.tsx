import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { OrchestratorPlayground } from "@/components/orchestrator/orchestrator-playground";

export default async function NewOrchestrationPage({
  searchParams,
}: {
  searchParams: Promise<{
    draft?: string;
  }>;
}) {
  const session =
    await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params =
    await searchParams;

  if (!params.draft) {
    redirect(
      `/orchestrations/new?draft=${randomUUID()}`
    );
  }

  return (
    <AppShell>
      <OrchestratorPlayground
        key={params.draft}
        draftId={params.draft}
      />
    </AppShell>
  );
}
