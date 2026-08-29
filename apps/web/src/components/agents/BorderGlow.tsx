"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type MouseEvent,
} from "react";

type BorderGlowProps = {
  children: ReactNode;

  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;

  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  borderWidth?: number;

  coneSpread?: number;

  animated?: boolean;
  active?: boolean;

  colors?: string[];

  className?: string;
};

export default function BorderGlow({
  children,

  edgeSensitivity = 30,

  glowColor = "22 119 255",

  backgroundColor = "#0e1117",

  borderRadius = 12,

  glowRadius = 40,

  glowIntensity = 1,

  borderWidth = 1,

  coneSpread = 40,

  animated = false,

  active = false,

  colors = [
    "#1677ff",
    "#725cff",
    "#38bdf8",
  ],

  className = "",
}: BorderGlowProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const animationFrame =
    useRef<number | null>(
      null,
    );

  const [hovering, setHovering] =
    useState(false);

  const [nearEdge, setNearEdge] =
    useState(false);

  const [mouse, setMouse] =
    useState({
      x: 50,
      y: 50,
    });

  useEffect(() => {
    if (!animated) {
      return;
    }

    let angle = 0;

    const update = () => {
      angle += 0.6;

      const radians =
        (angle * Math.PI) /
        180;

      setMouse({
        x:
          50 +
          Math.cos(radians) *
            46,

        y:
          50 +
          Math.sin(radians) *
            46,
      });

      animationFrame.current =
        requestAnimationFrame(
          update,
        );
    };

    animationFrame.current =
      requestAnimationFrame(
        update,
      );

    return () => {
      if (
        animationFrame.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrame.current,
        );
      }
    };
  }, [animated]);

  function handleMouseMove(
    event: MouseEvent<HTMLDivElement>,
  ) {
    const element =
      containerRef.current;

    if (!element) {
      return;
    }

    const rect =
      element.getBoundingClientRect();

    const x =
      event.clientX -
      rect.left;

    const y =
      event.clientY -
      rect.top;

    const percentageX =
      (x / rect.width) *
      100;

    const percentageY =
      (y / rect.height) *
      100;

    setMouse({
      x: percentageX,
      y: percentageY,
    });

    const distanceToEdge =
      Math.min(
        x,
        rect.width - x,
        y,
        rect.height - y,
      );

    setNearEdge(
      distanceToEdge <=
        edgeSensitivity,
    );
  }

  const gradientColors =
    colors.length > 0
      ? colors
      : [
          `rgb(${glowColor})`,
        ];

  const primaryColor =
    gradientColors[0];

  const middleColor =
    gradientColors[
      Math.floor(
        gradientColors.length /
          2,
      )
    ];

  const lastColor =
    gradientColors[
      gradientColors.length - 1
    ];

  const hoverVisible =
    hovering && nearEdge;

  const glowVisible =
    active ||
    animated ||
    hoverVisible;

  const glowOpacity =
    glowVisible
      ? glowIntensity
      : 0;

  const borderOpacity =
    active
      ? 1
      : glowVisible
        ? 0.85
        : 0;

  const variables = {
    "--glow-x": `${mouse.x}%`,
    "--glow-y": `${mouse.y}%`,
    "--glow-radius": `${glowRadius}px`,
    "--cone-spread": `${coneSpread}%`,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`
        relative
        isolate
        ${className}
      `}
      style={{
        ...variables,
        borderRadius,
      }}
      onMouseEnter={() =>
        setHovering(true)
      }
      onMouseLeave={() => {
        setHovering(false);
        setNearEdge(false);
      }}
      onMouseMove={
        handleMouseMove
      }
    >
      {/* Outer ambient glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -inset-[5px]
          z-0
          transition-opacity
          duration-200
        "
        style={{
          borderRadius:
            borderRadius + 6,

          opacity:
            active
              ? 0.82
              : glowOpacity,

          background: `
            radial-gradient(
              circle var(--glow-radius)
              at var(--glow-x)
              var(--glow-y),
              rgba(${glowColor}, ${
                active
                  ? 0.42
                  : 0.28
              }),
              transparent 68%
            )
          `,

          filter:
            active
              ? "blur(12px)"
              : "blur(9px)",
        }}
      />

      {/* Permanent/hover gradient border */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          z-[1]
          transition-opacity
          duration-200
        "
        style={{
          borderRadius,

          padding: active
            ? `${Math.max(
                borderWidth,
                2,
              )}px`
            : `${borderWidth}px`,

          opacity:
            borderOpacity,

          background: active
            ? `
              linear-gradient(
                120deg,
                ${primaryColor} 0%,
                ${middleColor} 50%,
                ${lastColor} 100%
              )
            `
            : `
              conic-gradient(
                from 200deg
                at var(--glow-x)
                var(--glow-y),

                transparent 0%,

                transparent calc(
                  50% - var(--cone-spread)
                ),

                ${primaryColor} 43%,
                ${middleColor} 50%,
                ${lastColor} 57%,

                transparent calc(
                  50% + var(--cone-spread)
                ),

                transparent 100%
              )
            `,

          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",

          WebkitMaskComposite:
            "xor",

          maskComposite:
            "exclude",

          filter:
            active
              ? "drop-shadow(0 0 5px rgba(126,114,244,.55))"
              : "none",
        }}
      />

      {/* Secondary selected halo */}
      {active ? (
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -inset-px
            z-[1]
            rounded-[inherit]
          "
          style={{
            borderRadius,

            boxShadow: `
              0 0 12px rgba(171,86,255,.20),
              0 0 20px rgba(126,114,244,.14),
              0 0 26px rgba(56,121,248,.10)
            `,
          }}
        />
      ) : null}

      {/* Content */}
      <div
        className="
          relative
          z-[2]
          overflow-hidden
        "
        style={{
          borderRadius,

          background:
            backgroundColor,
        }}
      >
        {children}
      </div>
    </div>
  );
}