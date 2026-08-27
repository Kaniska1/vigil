import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { OrchestrationDetail } from "@/components/orchestrations/orchestration-detail";

export default async function OrchestrationDetailPage({
  params,
}: {
  params: Promise<{
    orchestrationId: string;
  }>;
}) {
  const session =
    await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const {
    orchestrationId,
  } = await params;

  return (
    <AppShell>
      <OrchestrationDetail
        orchestrationId={
          orchestrationId
        }
      />
    </AppShell>
  );
}
