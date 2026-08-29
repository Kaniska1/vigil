"use client";

import Link from "next/link";

import {
  ArrowLeft,
  RotateCcw,
  Unplug,
} from "lucide-react";

export default function NotFound() {
  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#0d0e0f]
        text-white
        selection:bg-[#7e72f4]/30
      "
    >
      {/* background */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          size-[650px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-[#7e72f4]/10
          blur-[180px]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          left-[5%]
          top-[8%]
          size-[330px]
          rounded-full
          bg-[#ab56ff]/[0.07]
          blur-[140px]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          bottom-[2%]
          right-[5%]
          size-[350px]
          rounded-full
          bg-[#3879f8]/[0.07]
          blur-[140px]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-[0.035]
        "
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)",
          backgroundSize:
            "44px 44px",
        }}
      />

      <div
        className="
          relative
          z-10
          flex
          min-h-screen
          items-center
          justify-center
          px-6
          py-16
        "
      >
        <div
          className="
            w-full
            max-w-2xl
            text-center
          "
        >
          <div className="relative inline-block">
            {/* stroke */}

            <span
              className="
                block
                select-none
                text-[120px]
                font-black
                leading-none
                tracking-[-0.09em]
                text-transparent
                sm:text-[160px]
              "
              style={{
                WebkitTextStroke:
                  "2px rgba(126,114,244,.22)",
              }}
            >
              404
            </span>

            {/* colored offset */}

            <span
              aria-hidden="true"
              className="
                absolute
                inset-0
                translate-x-[3px]
                translate-y-[-2px]
                select-none
                bg-gradient-to-r
                from-[#ab56ff]
                via-[#7e72f4]
                to-[#3879f8]
                bg-clip-text
                text-[120px]
                font-black
                leading-none
                tracking-[-0.09em]
                text-transparent
                opacity-60
                sm:text-[160px]
              "
              style={{
                clipPath:
                  "polygon(0 0, 100% 0, 100% 45%, 0 45%)",
              }}
            >
              404
            </span>

            {/* white */}

            <span
              aria-hidden="true"
              className="
                absolute
                inset-0
                select-none
                text-[120px]
                font-black
                leading-none
                tracking-[-0.09em]
                text-white
                sm:text-[160px]
              "
            >
              404
            </span>
          </div>

          <div
            className="
              mt-7
              rounded-2xl
              border
              border-[#7e72f4]/15
              bg-[#121416]/80
              p-7
              shadow-[0_26px_90px_rgba(0,0,0,.4)]
              backdrop-blur-xl
            "
          >
            <div
              className="
                flex
                items-center
                justify-center
                gap-2.5
              "
            >
              <Unplug className="size-4 text-[#aaa1ff]" />

              <h1
                className="
                  text-sm
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-[#aaa1ff]
                "
              >
                Route unresolved
              </h1>
            </div>

            <p
              className="
                mx-auto
                mt-4
                max-w-lg
                text-[14px]
                leading-7
                text-white/42
              "
            >
              Vigil could not resolve this destination.
              The requested route does not exist in the
              current execution graph.
            </p>

            <div
              className="
                mt-5
                rounded-lg
                border
                border-white/[0.05]
                bg-[#0d0e0f]
                px-4
                py-3
                font-mono
                text-[10px]
                text-white/25
              "
            >
              ERROR_ROUTE_NOT_FOUND · VIGIL_RUNTIME
            </div>
          </div>

          <div
            className="
              mt-7
              flex
              flex-col
              items-center
              justify-center
              gap-3
              sm:flex-row
            "
          >
            <Link
              href="/"
              className="
                group
                inline-flex
                min-w-[190px]
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#3879f8]
                px-6
                py-3.5
                text-xs
                font-bold
                uppercase
                tracking-[0.07em]
                text-white
                transition-all
                hover:bg-[#4b86fb]
              "
            >
              <ArrowLeft
                className="
                  size-4
                  transition-transform
                  group-hover:-translate-x-1
                "
              />

              Return home
            </Link>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="
                inline-flex
                min-w-[190px]
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-[#7e72f4]/25
                bg-[#7e72f4]/[0.05]
                px-6
                py-3.5
                text-xs
                font-bold
                uppercase
                tracking-[0.07em]
                text-[#aaa1ff]
                transition-all
                hover:bg-[#7e72f4]/10
              "
            >
              <RotateCcw className="size-4" />

              Retry route
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}