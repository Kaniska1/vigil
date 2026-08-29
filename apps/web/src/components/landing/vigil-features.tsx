import Link from "next/link";

import {
  Activity,
  GitBranch,
  Route,
} from "lucide-react";

import { RiAiAgentLine } from "react-icons/ri";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

const FEATURES = [
  {
    icon: GitBranch,
    title: "Adaptive planning",
    description:
      "Turn a high-level objective into a dependency-aware execution plan.",
  },
  {
    icon: Route,
    title: "Capability routing",
    description:
      "Match required capabilities to real registered agents without invented agent identities.",
  },
  {
    icon: Activity,
    title: "Observable execution",
    description:
      "Inspect execution, tool calls, failures, evaluation and replanning in real time.",
  },
];

export function VigilFeatures() {
  return (
    <section
      id="features"
      className="
        relative
        overflow-hidden
        border-t
        border-white/[0.05]
        bg-[#0d0e0f]
        py-24
        md:py-32
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          right-[-180px]
          top-[5%]
          size-[500px]
          rounded-full
          bg-[#7e72f4]/10
          blur-[160px]
        "
      />

      <div
        className="
          mx-auto
          grid
          max-w-7xl
          items-center
          gap-16
          px-6
          md:px-10
          lg:grid-cols-[0.9fr_1.1fr]
          lg:px-12
        "
      >
        {/* LEFT */}

        <div>

          <h2
            className="
              mt-6
              max-w-xl
              text-4xl
              font-semibold
              leading-[1.08]
              tracking-[-0.045em]
              text-white
              md:text-5xl
            "
          >
            Run the system,
            <br />
            not individual agents.
          </h2>

          <p
            className="
              mt-6
              max-w-lg
              text-[15px]
              font-medium
              leading-7
              text-white/45
            "
          >
            Vigil coordinates specialist AI agents as one
            adaptive execution system. Give it the goal and
            let the runtime plan, route, execute, observe and
            replan.
          </p>

          <div className="mt-9 space-y-5">
            {FEATURES.map(
              ({
                icon: Icon,
                title,
                description,
              }) => (
                <div
                  key={title}
                  className="flex items-start gap-4"
                >
                  <div
                    className="
                      flex
                      size-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-[#7e72f4]/20
                      bg-[#7e72f4]/[0.07]
                      text-[#aaa1ff]
                    "
                  >
                    <Icon className="size-4" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white/90">
                      {title}
                    </p>

                    <p
                      className="
                        mt-1
                        max-w-md
                        text-[13px]
                        leading-5
                        text-white/40
                      "
                    >
                      {description}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>

        <Link
  href="/agents"
  className="
    mt-9
    inline-flex
    h-10
    items-center
    justify-center
    rounded-xl
    bg-[#7700c7]
    px-6
    text-sm
    font-bold
    text-white
    transition-colors
    hover:bg-[#a115ff]/90
  "
>
  Explore agents
</Link>
        </div>

        {/* RIGHT */}

        <div
          id="architecture"
          className="
            relative
            min-h-[500px]
            overflow-hidden
            rounded-[24px]
            border
            border-white/[0.06]
            bg-[#111214]
            p-7
            shadow-[inset_0_1px_0_rgba(255,255,255,.025),0_30px_90px_rgba(0,0,0,.4)]
          "
        >
          {/* grid */}

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              opacity-[0.055]
            "
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "25px 25px",
            }}
          />

          <div
            className="
              pointer-events-none
              absolute
              left-[10%]
              top-[10%]
              size-[260px]
              rounded-full
              bg-[#ab56ff]/10
              blur-[110px]
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              bottom-[0%]
              right-[5%]
              size-[280px]
              rounded-full
              bg-[#3879f8]/10
              blur-[120px]
            "
          />

          <div
            className="
              relative
              mx-auto
              h-[440px]
              max-w-[500px]
            "
          >
            {/* Goal */}

            <Card
              className="
                absolute
                left-0
                top-0
                w-[280px]
                border-white/[0.07]
                bg-[#15171a]/95
                shadow-[0_18px_55px_rgba(0,0,0,.45)]
              "
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span
                    className="
                      font-mono
                      text-[10px]
                      tracking-wide
                      text-white/30
                    "
                  >
                    GOAL_RECEIVED
                  </span>

                  <span
                    className="
                      size-2
                      rounded-full
                      bg-[#ab56ff]
                      shadow-[0_0_10px_#ab56ff]
                    "
                  />
                </div>

                <p
                  className="
                    mt-4
                    text-[15px]
                    font-semibold
                    leading-6
                    text-white/90
                  "
                >
                  Review this pull request and identify
                  security regressions.
                </p>

                <div className="mt-4 flex gap-2">
                  <span
                    className="
                      rounded-md
                      bg-[#ab56ff]/10
                      px-2
                      py-1
                      text-[10px]
                      font-semibold
                      text-[#ca8cff]
                    "
                  >
                    code-review
                  </span>

                  <span
                    className="
                      rounded-md
                      bg-[#3879f8]/10
                      px-2
                      py-1
                      text-[10px]
                      font-semibold
                      text-[#7ba5ff]
                    "
                  >
                    security
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Meta agent */}

            <Card
              className="
                absolute
                right-0
                top-[135px]
                z-20
                w-[285px]
                border-[#7e72f4]/20
                bg-[#17191d]
                shadow-[0_24px_70px_rgba(0,0,0,.5)]
              "
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex
                      size-9
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-[#7e72f4]/20
                      bg-[#7e72f4]/10
                    "
                  >
                    <RiAiAgentLine className="size-[18px] text-[#aaa1ff]" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white/90">
                      Vigil Meta-Agent
                    </p>

                    <p className="text-[10px] text-white/30">
                      capability routing
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      rounded-lg
                      border
                      border-white/[0.05]
                      bg-[#0d0e0f]
                      px-3
                      py-2.5
                    "
                  >
                    <span className="font-mono text-[10px] text-white/35">
                      code-review
                    </span>

                    <span className="text-[10px] font-semibold text-[#aaa1ff]">
                      GitHub Reviewer
                    </span>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      rounded-lg
                      border
                      border-white/[0.05]
                      bg-[#0d0e0f]
                      px-3
                      py-2.5
                    "
                  >
                    <span className="font-mono text-[10px] text-white/35">
                      security-review
                    </span>

                    <span className="text-[10px] font-semibold text-[#aaa1ff]">
                      Security Reviewer
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Result */}

            <Card
              className="
                absolute
                bottom-0
                left-8
                w-[300px]
                border-[#3879f8]/20
                bg-[#15171a]
                shadow-[0_22px_65px_rgba(0,0,0,.48)]
              "
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/80">
                    Evaluation
                  </span>

                  <span className="text-[10px] font-bold text-[#7ba5ff]">
                    SUCCESS
                  </span>
                </div>

                <p
                  className="
                    mt-3
                    text-[12px]
                    leading-5
                    text-white/40
                  "
                >
                  All required capabilities were satisfied.
                  No further replanning required.
                </p>

                <div
                  className="
                    mt-4
                    h-1.5
                    overflow-hidden
                    rounded-full
                    bg-white/[0.05]
                  "
                >
                  <div
                    className="
                      h-full
                      w-full
                      bg-gradient-to-r
                      from-[#ab56ff]
                      via-[#7e72f4]
                      to-[#3879f8]
                    "
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}