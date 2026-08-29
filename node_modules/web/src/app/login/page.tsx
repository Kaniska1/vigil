import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Bot,
  Braces,
  Check,
  GitBranch,
  Network,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M12 .7a11.3 11.3 0 0 0-3.6 22c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.7 3.7 18.7 4 18.7 4c.6 1.6.2 2.9.1 3.2.8.9 1.2 1.9 1.2 3.2 0 4.5-2.8 5.5-5.4 5.8.4.4.8 1.1.8 2.2v3.7c0 .3.2.7.8.6A11.3 11.3 0 0 0 12 .7Z" />
  </svg>
);

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="#4285F4"
      d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 4.98-.9 6.64-2.41l-3.24-2.51c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.12H3.04v2.6A10 10 0 0 0 12 22Z"
    />
    <path
      fill="#FBBC05"
      d="M6.39 13.92A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.31.31-1.92v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.52l3.35-2.6Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.96c1.47 0 2.79.51 3.83 1.5l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.48l3.35 2.6C7.18 7.72 9.39 5.96 12 5.96Z"
    />
  </svg>
);

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/agents");
  }

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.04fr_0.96fr]">
        {/* ---------------------------------------------------------------- */}
        {/* Left / Product panel                                             */}
        {/* ---------------------------------------------------------------- */}

        <section className="relative hidden min-h-screen overflow-hidden border-r border-white/[0.07] lg:flex lg:flex-col">
          {/* background */}
          <div className="absolute inset-0 bg-[#0a0b10]" />

          <div
            className="
              pointer-events-none absolute inset-0
              bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)]
              bg-[size:38px_38px]
            "
          />

          <div className="pointer-events-none absolute -left-40 top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[#007fff]/20 blur-[130px]" />
          <div className="pointer-events-none absolute bottom-[-10rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[#6536ff]/20 blur-[130px]" />
          <div className="pointer-events-none absolute left-[45%] top-[35%] h-[20rem] w-[20rem] rounded-full bg-[#4800ff]/10 blur-[110px]" />

          {/* top */}
          <div className="relative z-10 flex items-center justify-between px-10 py-9 xl:px-14">
            <Link
              href="/"
              className="group flex items-center gap-3"
            >
              <div className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-[0_0_25px_rgba(0,127,255,0.08)] backdrop-blur-xl">
                <Radar className="size-[18px] text-[#8ebcff]" />
              </div>

              <span className="text-[17px] font-extrabold tracking-[-0.04em]">
                Vigil
              </span>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold text-white/50 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Back to home
            </Link>
          </div>

          {/* visual */}
          <div className="relative z-10 flex flex-1 items-center justify-center px-12">
            <div className="relative h-[430px] w-full max-w-[610px]">
              {/* connecting paths */}
              <svg
                viewBox="0 0 610 430"
                fill="none"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id="connectionGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop stopColor="#007FFF" stopOpacity="0.45" />
                    <stop offset="1" stopColor="#6D33FF" stopOpacity="0.35" />
                  </linearGradient>
                </defs>

                <path
                  d="M304 212 C 242 165, 201 115, 139 101"
                  stroke="url(#connectionGradient)"
                  strokeWidth="1.5"
                  strokeDasharray="5 6"
                />

                <path
                  d="M304 212 C 366 159, 414 112, 480 105"
                  stroke="url(#connectionGradient)"
                  strokeWidth="1.5"
                  strokeDasharray="5 6"
                />

                <path
                  d="M304 212 C 228 242, 182 298, 115 326"
                  stroke="url(#connectionGradient)"
                  strokeWidth="1.5"
                  strokeDasharray="5 6"
                />

                <path
                  d="M304 212 C 380 247, 423 301, 494 329"
                  stroke="url(#connectionGradient)"
                  strokeWidth="1.5"
                  strokeDasharray="5 6"
                />
              </svg>

              {/* glow behind center */}
              <div className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4c35ff]/10 blur-[65px]" />

              {/* Center node */}
              <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                <div className="relative flex size-[130px] items-center justify-center rounded-[34px] border border-[#6f64ff]/30 bg-[#11131b]/90 shadow-[0_0_70px_rgba(72,0,255,0.22)] backdrop-blur-xl">
                  <div className="absolute inset-[8px] rounded-[27px] border border-white/[0.05]" />

                  <div className="text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#007fff] via-[#4c36ff] to-[#7a45ff] shadow-[0_10px_30px_rgba(72,0,255,.35)]">
                      <Radar className="size-5 text-white" />
                    </div>

                    <p className="mt-3 text-xs font-extrabold tracking-[-0.02em]">
                      Vigil
                    </p>

                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
                      Meta-agent
                    </p>
                  </div>
                </div>
              </div>

              {/* top left */}
              <div className="absolute left-[4%] top-[7%] rounded-2xl border border-white/[0.08] bg-[#11131a]/85 p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#007fff]/10">
                    <GitBranch className="size-4 text-[#71adff]" />
                  </div>

                  <div>
                    <p className="text-[11px] font-bold">
                      GitHub Reviewer
                    </p>
                    <p className="mt-0.5 text-[9px] text-white/35">
                      code-review
                    </p>
                  </div>
                </div>
              </div>

              {/* top right */}
              <div className="absolute right-[2%] top-[8%] rounded-2xl border border-white/[0.08] bg-[#11131a]/85 p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#6536ff]/12">
                    <ShieldCheck className="size-4 text-[#a98cff]" />
                  </div>

                  <div>
                    <p className="text-[11px] font-bold">
                      Security Reviewer
                    </p>
                    <p className="mt-0.5 text-[9px] text-white/35">
                      security-review
                    </p>
                  </div>
                </div>
              </div>

              {/* bottom left */}
              <div className="absolute bottom-[5%] left-0 rounded-2xl border border-white/[0.08] bg-[#11131a]/85 p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#007fff]/10">
                    <Network className="size-4 text-[#71adff]" />
                  </div>

                  <div>
                    <p className="text-[11px] font-bold">
                      Google Researcher
                    </p>
                    <p className="mt-0.5 text-[9px] text-white/35">
                      web-research
                    </p>
                  </div>
                </div>
              </div>

              {/* bottom right */}
              <div className="absolute bottom-[4%] right-0 rounded-2xl border border-white/[0.08] bg-[#11131a]/85 p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#6536ff]/12">
                    <Bot className="size-4 text-[#a98cff]" />
                  </div>

                  <div>
                    <p className="text-[11px] font-bold">
                      Remote Agents
                    </p>
                    <p className="mt-0.5 text-[9px] text-white/35">
                      dynamic registry
                    </p>
                  </div>
                </div>
              </div>

              {/* small status pill */}
              <div className="absolute bottom-[15%] left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#5c50ff]/20 bg-[#12131b]/95 px-3 py-1.5 shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-[#5ed6a0] shadow-[0_0_10px_rgba(94,214,160,.8)]" />

                  <span className="text-[9px] font-bold text-white/55">
                    Runtime ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* copy */}
          <div className="relative z-10 px-10 pb-12 xl:px-14 xl:pb-14">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#82b6ff]">
              <Sparkles className="size-3.5" />
              Autonomous agent infrastructure
            </div>

            <h1 className="max-w-2xl text-[44px] font-extrabold leading-[1.02] tracking-[-0.055em] xl:text-[52px]">
              Orchestrate agents.
              <br />

              <span className="bg-gradient-to-r from-[#6eb1ff] via-[#8f8cff] to-[#a77cff] bg-clip-text text-transparent">
                Observe everything.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-[14px] font-medium leading-6 text-white/45">
              Plan, execute, trace, evaluate and adapt across a dynamic fleet
              of AI agents from one developer runtime.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-semibold text-white/42">
              <span className="flex items-center gap-2">
                <Check className="size-3.5 text-[#77b4ff]" />
                Dynamic registry
              </span>

              <span className="flex items-center gap-2">
                <Check className="size-3.5 text-[#8f7dff]" />
                Live traces
              </span>

              <span className="flex items-center gap-2">
                <Check className="size-3.5 text-[#a287ff]" />
                Adaptive replanning
              </span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Right / Authentication                                           */}
        {/* ---------------------------------------------------------------- */}

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
          <div
            className="
              pointer-events-none absolute inset-0
              bg-[radial-gradient(circle_at_50%_0%,rgba(0,127,255,0.08),transparent_35%)]
            "
          />

          <div className="pointer-events-none absolute right-[-15rem] top-[20%] size-[30rem] rounded-full bg-[#4800ff]/8 blur-[120px]" />

          {/* mobile brand */}
          <Link
            href="/"
            className="absolute left-6 top-6 flex items-center gap-2.5 lg:hidden"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#007fff] to-[#6536ff]">
              <Radar className="size-4 text-white" />
            </div>

            <span className="text-sm font-extrabold">
              Vigil
            </span>
          </Link>

          <div className="relative z-10 w-full max-w-[430px]">
            <div className="mb-9">
              <div className="mb-5 hidden size-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] lg:flex">
                <Workflow className="size-[18px] text-[#8e9dff]" />
              </div>

              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#7faeff]">
                Developer access
              </p>

              <h2 className="text-[32px] font-extrabold tracking-[-0.05em] text-white sm:text-[36px]">
                Welcome to Vigil
              </h2>

              <p className="mt-3 max-w-sm text-sm font-medium leading-6 text-white/40">
                Sign in to access your agents, orchestrations, execution
                traces and developer tools.
              </p>
            </div>

            {/* GitHub */}
            <form
              action={async () => {
                "use server";

                await signIn("github", {
                  redirectTo: "/agents",
                });
              }}
            >
              <Button
                type="submit"
                size="lg"
                className="
                  h-12 w-full rounded-xl
                  bg-gradient-to-r from-[#1578ff] via-[#4d42ff] to-[#683cff]
                  text-[13px] font-bold text-white
                  shadow-[0_12px_35px_rgba(72,67,255,0.22)]
                  transition-all
                  hover:brightness-110
                  active:scale-[0.99]
                "
              >
                <GitHubIcon className="size-[17px]" />
                Continue with GitHub
              </Button>
            </form>

            <div className="my-5 flex items-center gap-4">
              <Separator className="bg-white/[0.07]" />

              <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
                or
              </span>

              <Separator className="bg-white/[0.07]" />
            </div>

            {/* Google */}
            <form
              action={async () => {
                "use server";

                await signIn("google", {
                  redirectTo: "/agents",
                });
              }}
            >
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="
                  h-12 w-full rounded-xl
                  border-white/[0.09]
                  bg-white/[0.035]
                  text-[13px] font-bold text-white
                  hover:border-white/[0.14]
                  hover:bg-white/[0.065]
                "
              >
                <GoogleIcon className="size-[17px]" />
                Continue with Google
              </Button>
            </form>

            {/* security */}
            <div className="mt-8 rounded-2xl border border-white/[0.065] bg-white/[0.025] p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#5e48ff]/10">
                  <ShieldCheck className="size-3.5 text-[#9585ff]" />
                </div>

                <div>
                  <p className="text-[11px] font-bold text-white/75">
                    Secure developer authentication
                  </p>

                  <p className="mt-1 text-[10px] font-medium leading-5 text-white/30">
                    Your OAuth identity gives you access to your private runs,
                    orchestrations and API credentials. Vigil never asks for
                    your account password.
                  </p>
                </div>
              </div>
            </div>

            {/* mini feature row */}
            <div className="mt-7 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <Braces className="mb-2 size-3.5 text-[#75adff]" />
                <p className="text-[9px] font-bold text-white/45">
                  SDK
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <Activity className="mb-2 size-3.5 text-[#9183ff]" />
                <p className="text-[9px] font-bold text-white/45">
                  Traces
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <Network className="mb-2 size-3.5 text-[#ab83ff]" />
                <p className="text-[9px] font-bold text-white/45">
                  Agents
                </p>
              </div>
            </div>

            <p className="mt-8 text-center text-[10px] font-medium leading-5 text-white/25">
              By continuing, you agree to use Vigil in accordance with its{" "}
              <Link
                href="#"
                className="text-white/45 transition-colors hover:text-white"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="#"
                className="text-white/45 transition-colors hover:text-white"
              >
                Privacy Policy
              </Link>
              .
            </p>

            <div className="mt-8 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/20">
              <span className="size-1 rounded-full bg-[#53d99a]" />
              Build
              <span className="text-white/10">·</span>
              Orchestrate
              <span className="text-white/10">·</span>
              Observe
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}