import Link from "next/link";
import { Activity, Braces, Settings } from "lucide-react";
import { auth } from "@/auth";
import { UserMenu } from "@/components/auth/user-menu";
import { AppSidebar } from "@/components/layout/app-sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div className="pointer-events-none fixed inset-0 vigil-grid opacity-30" />
      <AppSidebar />

      <div className="relative lg:pl-[232px]">
        <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-[var(--line)] bg-[var(--background-50)]/82 px-5 backdrop-blur-xl sm:px-7 lg:px-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--ink-3)]">
            <Braces className="size-3.5 text-[var(--primary-700)]" />
            <span className="hidden sm:inline">developer infrastructure / autonomous agents</span>
            <span className="sm:hidden">Vigil</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[10.5px] font-bold text-[var(--ink-2)] sm:flex">
              <span className="size-1.5 rounded-full bg-[var(--primary-600)] shadow-[0_0_12px_rgba(51,153,255,.75)]" />
              Runtime online
            </div>
            <Link href="/runs" className="flex size-8 items-center justify-center rounded-[9px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-3)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--ink)]">
              <Activity className="size-3.5" />
            </Link>
            <Link href="/runs" className="flex size-8 items-center justify-center rounded-[9px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-3)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--ink)]">
              <Settings className="size-3.5" />
            </Link>
            {session?.user ? <UserMenu user={session.user} /> : null}
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-[1500px] px-5 py-6 sm:px-7 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
