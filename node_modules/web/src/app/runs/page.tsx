import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import {
  getRuns,
} from "@/lib/api";

import {
  RunList,
} from "@/components/runs/run-list";

export default async function RunsPage() {
  const session =
    await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const runs =
    await getRuns();

  return (
    <RunList runs={runs} />
  );
}