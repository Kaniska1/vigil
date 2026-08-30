"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

import {
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

import LightRays from "@/components/LightRays";

const NAV_LINKS = [
  {
    label: "Features",
    href: "features",
    scroll: true,
  },
  {
    label: "Contact",
    href: "contact",
    scroll: true,
  },
  {
    label: "Explore",
    href: "/login",
  },
];

export function VigilHero() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  function handleNavClick(link: (typeof NAV_LINKS)[number]) {
    if (link.scroll) {
      document.getElementById(link.href)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setMobileOpen(false);
    }
  }

  return (
    <section
      className="
        relative
        flex
        min-h-screen
        w-full
        flex-col
        overflow-hidden
        bg-[#0d0e0f]
        text-white
      "
    >
      {/* =====================================================
          GRID BACKGROUND
      ===================================================== */}

    
  <div
  className="
    pointer-events-none
    absolute
    inset-0
    [background-size:42px_42px]
    [background-image:linear-gradient(to_right,rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.09)_1px,transparent_1px)]
  "
/>

      {/* Fade grid toward edges */}

      <div
  className="
    pointer-events-none
    absolute
    inset-0
    bg-[#0d0e0f]/90
    [mask-image:radial-gradient(ellipse_at_center,transparent_14%,black_88%)]
  "
/>

      {/* =====================================================
          LIGHT RAYS

          Full hero-sized layer instead of the fixed 1080px demo.
      ===================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-0
          h-full
          w-full
          max-w-[1400px]
          -translate-x-1/2
          opacity-100
        "
      >
        <LightRays
          raysOrigin="top-center"
          raysColor="#c394ff"
          raysSpeed={0.8}
          lightSpread={1.5}
          rayLength={3.4}
          pulsating={false}
          fadeDistance={1}
          saturation={1}
          followMouse={false}
          mouseInfluence={0.1}
          noiseAmount={0.45}
          distortion={0}
        />
      </div>

      {/* Subtle dark top treatment for nav readability */}

      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-40
          bg-gradient-to-b
          from-[#0d0e0f]/75
          to-transparent
        "
      />

      {/* Bottom fade */}

      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-0
          h-52
          bg-gradient-to-t
          from-[#0d0e0f]
          to-transparent
        "
      />

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <header
        className="
          relative
          z-30
          flex
          w-full
          items-center
          justify-between
          px-6
          py-6
          md:px-10
          lg:px-16
        "
      >
        {/* Logo */}

        <Link
  href="/"
  className="flex items-center"
  aria-label="Vigil home"
>
  <Image
    src="/logo.svg"
    alt="Vigil"
    width={118}
    height={36}
    priority
    className="h-9 w-auto"
  />
</Link>

        {/* Desktop links */}

        <nav
          className="
            hidden
            items-center
            gap-9
            lg:flex
          "
        >
          {NAV_LINKS.map((link) =>
            link.scroll ? (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNavClick(link)}
                className="
                  text-[14px]
                  font-medium
                  text-white/50
                  transition-colors
                  hover:text-white
                "
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="
                  text-[14px]
                  font-medium
                  text-white/50
                  transition-colors
                  hover:text-white
                "
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        {/* Right */}

        <div
          className="
            flex
            items-center
            gap-4
          "
        ><button>
          <Link
            href="/login"
            className="
              hidden
              text-[14px]
              font-medium
              border-purple-500
              text-white/55
              transition-colors
              hover:text-white
              sm:inline-flex
            "
          >
            Sign in
          </Link>
    </button>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(
                (current) =>
                  !current,
              )
            }
            aria-label="Toggle navigation"
            className="
              flex
              size-10
              items-center
              justify-center
              text-white
              lg:hidden
            "
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================
          MOBILE NAVIGATION
      ===================================================== */}

      {mobileOpen ? (
        <div
          className="
            absolute
            inset-x-5
            top-[78px]
            z-40
            rounded-2xl
            border
            border-white/[0.08]
            bg-[#111214]/95
            p-3
            shadow-[0_24px_80px_rgba(0,0,0,.5)]
            backdrop-blur-xl
            lg:hidden
          "
        >
          <nav
            className="
              flex
              flex-col
            "
          >
            {NAV_LINKS.map((link) =>
              link.scroll ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleNavClick(link)}
                  className="
                    rounded-xl
                    px-4
                    py-3
                    text-left
                    text-sm
                    font-medium
                    text-white/55
                    transition-colors
                    hover:bg-white/[0.04]
                    hover:text-white
                  "
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="
                    rounded-xl
                    px-4
                    py-3
                    text-sm
                    font-medium
                    text-white/55
                    transition-colors
                    hover:bg-white/[0.04]
                    hover:text-white
                  "
                >
                  {link.label}
                </Link>
              ),
            )}

            <div
              className="
                my-2
                h-px
                bg-white/[0.06]
              "
            />

            <Link
              href="/login"
              onClick={() =>
                setMobileOpen(false)
              }
              className="
                rounded-xl
                px-4
                py-3
                text-sm
                font-medium
                text-white/65
              "
            >
              Sign in
            </Link>

            <Link
              href="/agents"
              onClick={() =>
                setMobileOpen(false)
              }
              className="
                mt-1
                rounded-xl
                bg-[#3879f8]
                px-4
                py-3
                text-center
                text-sm
                font-semibold
                text-white
              "
            >
              Open Vigil
            </Link>
          </nav>
        </div>
      ) : null}

      {/* =====================================================
          CENTERED HERO CONTENT
      ===================================================== */}

      <div
        className="
          relative
          z-20
          flex
          flex-1
          items-center
          justify-center
          px-6
          pb-20
          pt-12
          text-center
          md:px-10
        "
      >
        <div
          className="
            mx-auto
            flex
            max-w-[900px]
            flex-col
            items-center
          "
        >

          {/* Heading */}

          <h1
            className="
              max-w-[900px]
              text-[48px]
              font-medium
              leading-[1.02]
              tracking-[-0.055em]
              text-white
              sm:text-[58px]
              md:text-[72px]
              lg:text-[82px]
            "
          >
            One goal.

            <span className="block">
              A coordinated{" "}
              <span
                className="
                  bg-gradient-to-r
                  from-[#ab56ff]
                  via-[#c394ff]
                  to-[#3879f8]
                  bg-clip-text
                  text-transparent
                "
              >
                agent system.
              </span>
            </span>
          </h1>

          {/* Description */}

          <p
            className="
              mt-7
              max-w-[640px]
              text-[15px]
              font-medium
              leading-7
              text-white/45
              md:text-[16px]
            "
          >
            Vigil plans, selects and
            coordinates specialist AI
            agents to execute complex
            goals — then observes,
            evaluates and adapts as the
            work unfolds.
          </p>

          {/* CTAs */}

          <div
            className="
              mt-9
              flex
              flex-col
              items-center
              justify-center
              gap-3
              sm:flex-row
            "
          >
            <Link
              href="/agents"
              className="
                group
                inline-flex
                min-w-[165px]
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-gradient-to-r
                from-[#7700c7]
                via-[#7606ff]
                to-[#3879f8]
                px-6
                py-3
                text-[14px]
                font-semibold
                text-white
                shadow-[0_12px_35px_rgba(56,121,248,.18)]
                transition-all
                hover:bg-[#a115ff]
              "
            >
              Explore Vigil

              <ArrowRight
                className="
                  size-4
                  transition-transform
                  group-hover:translate-x-0.5
                "
              />
            </Link>
          </div>

          {/* Minimal runtime statement */}

          <div
            className="
              mt-12
              flex
              items-center
              justify-center
              gap-2.5
              font-mono
              text-[10px]
              tracking-[0.1em]
              text-white/25
              sm:text-[11px]
            "
          >
            <span
              className="
                size-1.5
                rounded-full
                bg-[#7e72f4]
                shadow-[0_0_8px_rgba(126,114,244,.75)]
              "
            />

            PLAN · SELECT · EXECUTE · OBSERVE · ADAPT
          </div>
        </div>
      </div>

      {/* Bottom boundary */}

      <div
        className="
          absolute
          inset-x-0
          bottom-0
          h-px
          bg-white/[0.06]
        "
      />
    </section>
  );
}