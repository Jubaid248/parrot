"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import rough from "roughjs";
import type { RoughSVG } from "roughjs/bin/svg";
import type { Options } from "roughjs/bin/core";

/** Marker colours shared by every whiteboard drawing. */
export const MARKER = {
  ink: "#17221A",
  moss: "#2F5E25",
  mossLight: "#4E9A3E",
  beak: "#E2432B",
  beakDeep: "#A8301F",
  teal: "#2E9F9C",
  amber: "#B7791F",
  faint: "#CFC7B4",
};

/** Green for strong, amber for middling, red for weak. `ratio` is score / max. */
export function markerFor(ratio: number) {
  return ratio >= 0.7 ? MARKER.moss : ratio >= 0.6 ? MARKER.amber : MARKER.beak;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Strokes each path in turn so a drawing looks like it's being sketched live. */
export function drawIn(svg: SVGSVGElement, delay = 0, duration = 600) {
  if (prefersReducedMotion()) return;
  svg.querySelectorAll("path").forEach((p, i) => {
    const len = p.getTotalLength();
    if (!len) return;
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
    p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
      duration,
      delay: delay + i * 40,
      easing: "cubic-bezier(.5,0,.3,1)",
      fill: "forwards",
    });
  });
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type DrawFn = (rc: RoughSVG, size: { w: number; h: number }, svg: SVGSVGElement) => void;

/**
 * An SVG that fills its positioned parent and is redrawn with Rough.js whenever
 * the parent resizes or `deps` change. The first draw (and any change to
 * `animateKey`) plays the sketch-in animation; resizes redraw instantly.
 */
export function RoughCanvas({
  draw,
  deps,
  animateKey,
  delay = 0,
  duration = 600,
  inset = 0,
  className = "",
}: {
  draw: DrawFn;
  deps: unknown[];
  animateKey?: unknown;
  delay?: number;
  duration?: number;
  /** Extra room on every side so marker strokes can sit just outside the box. */
  inset?: number;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const lastAnimated = useRef<unknown>(Symbol("never"));

  useIsoLayoutEffect(() => {
    const svg = ref.current;
    const host = svg?.parentElement;
    if (!svg || !host) return;

    const render = (animate: boolean) => {
      const w = host.clientWidth + inset * 2;
      const h = host.clientHeight + inset * 2;
      if (!w || !h) return;
      svg.replaceChildren();
      svg.setAttribute("width", String(w));
      svg.setAttribute("height", String(h));
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      drawRef.current(rough.svg(svg), { w, h }, svg);
      if (animate) drawIn(svg, delay, duration);
    };

    const shouldAnimate = lastAnimated.current !== animateKey;
    lastAnimated.current = animateKey;
    render(shouldAnimate);

    let first = true;
    const ro = new ResizeObserver(() => {
      // The observer fires once on attach; that draw already happened above
      if (first) return void (first = false);
      render(false);
    });
    ro.observe(host);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, animateKey]);

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute overflow-visible ${className}`}
      style={{ left: -inset, top: -inset }}
    />
  );
}

/** A box with a hand-drawn marker outline around its content. */
export function RoughBox({
  children,
  options,
  className = "",
  animateKey,
  delay = 0,
  tail,
}: {
  children: ReactNode;
  options: Options;
  className?: string;
  animateKey?: unknown;
  delay?: number;
  /** Draws a speech-bubble tail on the left edge. */
  tail?: boolean;
}) {
  const key = JSON.stringify(options);
  return (
    <div className={`relative ${className}`}>
      <RoughCanvas
        inset={6}
        deps={[key, tail]}
        animateKey={animateKey}
        delay={delay}
        duration={500}
        draw={(rc, { w, h }, svg) => {
          svg.appendChild(rc.rectangle(4, 4, w - 8, h - 8, { seed: 11, ...options }));
          if (tail) svg.appendChild(rc.linearPath([[4, 26], [-14, 34], [4, 42]], { ...options, fill: undefined, seed: 12 }));
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
