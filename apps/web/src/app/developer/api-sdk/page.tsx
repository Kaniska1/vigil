import {
  redirect,
} from "next/navigation";

import { auth } from "@/auth";
import { ApiSdkClient } from "@/components/developer/api-sdk-client";
import { AppShell } from "@/components/layout/app-shell";

export default async function ApiSdkPage() {
  const session =
    await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShell>
      <ApiSdkClient />
    </AppShell>
  );
}
