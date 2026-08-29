import Link from "next/link";

import {
  ArrowUpRight,
} from "lucide-react";

import {
  FaGithub,
} from "react-icons/fa";

import {
  RiAiAgentLine,
} from "react-icons/ri";

const COLUMNS = [
  {
    title: "PRODUCT",
    links: [
      {
        label: "Agent Registry",
        href: "/agents",
      },
      {
        label: "Orchestrator",
        href: "/orchestrator",
      },
      {
        label: "Runs",
        href: "/runs",
      },
      {
        label: "Orchestrations",
        href: "/orchestrations",
      },
    ],
  },

  {
    title: "DEVELOPERS",
    links: [
      {
        label: "Developer",
        href: "/developer",
      },
      {
        label: "SDK",
        href: "/developer",
      },
      {
        label: "API Keys",
        href: "/settings",
      },
      {
        label: "Execution Traces",
        href: "/runs",
      },
    ],
  },

  {
    title: "PROJECT",
    links: [
      {
        label: "Architecture",
        href: "#architecture",
      },
      {
        label: "Features",
        href: "#features",
      },
      {
        label: "Contact",
        href: "#contact",
      },
      {
        label: "Sign In",
        href: "/login",
      },
    ],
  },
];

export function VigilFooter() {
  return (
    <footer
      className="
        relative
        overflow-hidden
        border-t
        border-white/[0.05]
        bg-[#090a0b]
        text-white
      "
    >
      {/* effects */}

      <div className="pointer-events-none absolute inset-0">
        <div
          className="
            absolute
            bottom-[-40%]
            left-[-10%]
            size-[620px]
            rounded-full
            bg-[#ab56ff]/10
            blur-[170px]
          "
        />

        <div
          className="
            absolute
            bottom-[-45%]
            right-[-5%]
            size-[600px]
            rounded-full
            bg-[#3879f8]/[0.07]
            blur-[180px]
          "
        />

        <div
          className="
            absolute
            inset-0
            opacity-[0.045]
          "
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />
      </div>

      <div
        className="
          relative
          z-10
          mx-auto
          max-w-7xl
          px-6
          pb-10
          pt-20
          md:px-10
          lg:px-12
        "
      >
        {/* TOP */}

        <div
          className="
            flex
            flex-col
            justify-between
            gap-12
            lg:flex-row
            lg:items-end
          "
        >
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="
                  size-2
                  rounded-full
                  bg-[#ab56ff]
                  shadow-[0_0_14px_rgba(171,86,255,.8)]
                "
              />

              <span className="text-sm font-semibold text-white/55">
                Autonomous agent infrastructure
              </span>
            </div>

            <h2
              className="
                text-4xl
                font-medium
                leading-[1.08]
                tracking-[-0.045em]
                text-white
                md:text-5xl
              "
            >
              Build agents.
              <br />
              Let Vigil coordinate them.
            </h2>
          </div>

          <Link
            href="/agents"
            className="
              group
              inline-flex
              w-fit
              items-center
              gap-2
              rounded-xl
              bg-[#7700c7]
              px-5
              py-3
              text-sm
              font-bold
              text-white
              transition-colors
              hover:bg-[#ae36fe]
            "
          >
            Enter Vigil

            <ArrowUpRight
              className="
                size-4
                transition-transform
                group-hover:translate-x-0.5
                group-hover:-translate-y-0.5
              "
            />
          </Link>
        </div>

        {/* MIDDLE */}

        <div
          className="
            my-20
            flex
            flex-col
            justify-between
            gap-16
            md:flex-row
          "
        >
          <div>
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <div
                className="
                  flex
                  size-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-[#7e72f4]/20
                  bg-[#7e72f4]/10
                "
              >
                <RiAiAgentLine className="size-5 text-[#aaa1ff]" />
              </div>

              <span
                className="
                  text-2xl
                  font-extrabold
                  tracking-[-0.045em]
                "
              >
                Vigil
              </span>
            </Link>

            <p
              className="
                mt-5
                max-w-[300px]
                text-[13px]
                leading-6
                text-white/30
              "
            >
              The autonomous meta-agent that plans,
              coordinates and adapts across a dynamic
              fleet of AI agents.
            </p>

            <div
              className="
                mt-6
                flex
                items-center
                gap-2
                font-mono
                text-[10px]
                text-white/25
              "
            >
              <span className="size-1.5 rounded-full bg-[#7e72f4]" />

              PLAN → EXECUTE → OBSERVE → ADAPT
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-2
              gap-x-14
              gap-y-12
              sm:grid-cols-3
              md:gap-x-20
              lg:gap-x-28
            "
          >
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3
                  className="
                    text-[11px]
                    font-bold
                    tracking-[0.13em]
                    text-white/65
                  "
                >
                  {column.title}
                </h3>

                <ul className="mt-5 space-y-3.5">
                  {column.links.map(
                    (link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="
                            text-[13px]
                            font-medium
                            text-white/32
                            transition-colors
                            hover:text-white
                          "
                        >
                          {link.label}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM */}

        <div
          className="
            flex
            flex-col
            gap-5
            border-t
            border-white/[0.05]
            pt-7
            text-[11px]
            font-medium
            text-white/25
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <p>
            © 2026 Vigil. Built for autonomous agent
            infrastructure.
          </p>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span
                className="
                  size-1.5
                  rounded-full
                  bg-[#7e72f4]
                  shadow-[0_0_8px_rgba(126,114,244,.6)]
                "
              />

              Runtime online
            </span>

            <a
              href="https://github.com/Kaniska1/vigil"
              target="_blank"
              rel="noreferrer"
              className="
                flex
                items-center
                gap-1.5
                transition-colors
                hover:text-white
              "
            >
              <FaGithub className="size-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}