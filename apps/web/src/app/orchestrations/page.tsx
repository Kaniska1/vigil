import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { OrchestrationList } from "@/components/orchestrations/orchestration-list";

export default async function OrchestrationsPage() {
  const session =
    await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShell>
      <OrchestrationList />
    </AppShell>
  );
}
