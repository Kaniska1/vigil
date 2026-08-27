import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import {
  AppShell,
} from "@/components/layout/app-shell";

import {
  MetricsDashboard,
} from "@/components/developer/metrics-dashboard";

export default async function MetricsPage() {
  const session =
    await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShell>
      <MetricsDashboard />
    </AppShell>
  );
}