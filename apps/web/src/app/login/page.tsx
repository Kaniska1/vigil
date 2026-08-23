import { redirect } from "next/navigation";
import { Radar, ShieldCheck, Sparkles } from "lucide-react";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/agents");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0 vigil-grid opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[34rem] w-[52rem] -translate-x-1/2 rounded-full bg-[#007fff]/12 blur-[110px]" />
      <div className="pointer-events-none absolute right-[-10rem] top-[12%] size-[30rem] rounded-full bg-[#4800ff]/10 blur-[120px]" />

      <div className="relative w-full max-w-[460px]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#007fff] via-[#4800ff] to-[#6d33ff] shadow-[0_18px_45px_rgba(91,76,224,.35)]">
            <Radar className="size-6 text-white" />
          </div>
          <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.05em]">Welcome to Vigil.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-[var(--text-500)]">A developer runtime for orchestrating and observing autonomous AI agents.</p>
        </div>

        <Card className="vigil-glow border-[#333333] bg-[#1a1a1a]/92">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#333333] bg-[#0d0d0d]/75 p-3.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#4800ff]/10 text-[#b699ff]"><ShieldCheck className="size-4" /></div>
              <div><p className="text-xs font-extrabold text-white">Secure workspace</p><p className="mt-0.5 text-[11px] font-medium text-[var(--text-500)]">Authenticate to access your agent runtime.</p></div>
            </div>

            <form action={async () => { "use server"; await signIn("github", { redirectTo: "/agents" }); }}>
              <Button type="submit" size="lg" className="w-full">
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.3 11.3 0 0 0-3.6 22c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.7 3.7 18.7 4 18.7 4c.6 1.6.2 2.9.1 3.2.8.9 1.2 1.9 1.2 3.2 0 4.5-2.8 5.5-5.4 5.8.4.4.8 1.1.8 2.2v3.7c0 .3.2.7.8.6A11.3 11.3 0 0 0 12 .7Z" /></svg>
                Continue with GitHub
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3"><Separator className="flex-1" /><span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-400)]">or</span><Separator className="flex-1" /></div>

            <form action={async () => { "use server"; await signIn("google", { redirectTo: "/agents" }); }}>
              <Button type="submit" variant="outline" size="lg" className="w-full">
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1H12v2.98h5.38c-.23 1.48-1.64 4.34-5.38 4.34-3.24 0-5.88-2.68-5.88-5.99s2.64-5.99 5.88-5.99c1.85 0 3.08.8 3.79 1.48l2.58-2.53C16.71 3.81 14.56 2.84 12 2.84a9.59 9.59 0 0 0 0 19.18c5.53 0 9.19-3.94 9.19-9.49 0-.64-.07-1.12-.15-1.43Z" /></svg>
                Continue with Google
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-bold text-[var(--text-400)]"><Sparkles className="size-3" /> Build · Orchestrate · Observe</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
