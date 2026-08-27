import { redirect } from "next/navigation";

import { auth } from "@/auth";

import {
  AppShell,
} from "@/components/layout/app-shell";

import {
  SettingsClient,
} from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session =
    await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShell>
      <SettingsClient />
    </AppShell>
  );
}
