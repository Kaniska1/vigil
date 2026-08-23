import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRunServer } from "@/lib/server-api";
import { RunDebugger } from "@/components/runs/run-debugger";
import { AppShell } from "@/components/layout/app-shell";

type Props = { params: Promise<{ runId: string }> };

export default async function RunPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { runId } = await params;
  try {
    const run = await getRunServer(runId);
    return <AppShell><RunDebugger run={run} /></AppShell>;
  } catch {
    notFound();
  }
}
