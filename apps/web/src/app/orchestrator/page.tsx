import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrchestratorPlayground } from "@/components/orchestrator/orchestrator-playground";
import { AppShell } from "@/components/layout/app-shell";

export default async function OrchestratorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <AppShell><OrchestratorPlayground /></AppShell>;
}
