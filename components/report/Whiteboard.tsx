"use client";

import type { ReactNode } from "react";
import { MARKER, markerFor, RoughBox, RoughCanvas } from "./rough";

/** The dotted board every section of the report is drawn on, with a marker tray underneath. */
export function Board({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`whiteboard relative ${className}`}>
      {children}
      <div aria-hidden="true" className="whiteboard-tray">
        {[MARKER.moss, MARKER.beak, MARKER.teal, MARKER.ink].map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
      </div>
    </section>
  );
}

/** Overall score as a marker ring that fills to the score. */
export function ScoreRing({ value, max, caption }: { value: number; max: number; caption: string }) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const color = markerFor(ratio);
  return (
    <div className="text-center">
      <div className="relative mx-auto h-[200px] w-[200px]" role="img" aria-label={`${value} out of ${max}`}>
        <RoughCanvas
          deps={[value, max]}
          delay={200}
          duration={1100}
          draw={(rc, _s, svg) => {
            const end = -Math.PI / 2 + ratio * Math.PI * 2;
            svg.appendChild(rc.circle(100, 100, 176, { stroke: MARKER.faint, strokeWidth: 2, roughness: 1.4, seed: 3 }));
            if (ratio > 0) {
              svg.appendChild(rc.arc(100, 100, 176, 176, -Math.PI / 2, end, false, { stroke: color, strokeWidth: 6, roughness: 1.6, seed: 7 }));
              svg.appendChild(rc.arc(100, 100, 166, 166, -Math.PI / 2 + 0.1, Math.max(-Math.PI / 2 + 0.1, end - 0.15), false, { stroke: color, strokeWidth: 2.2, roughness: 2, seed: 9 }));
            }
          }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <b className="block font-hand text-7xl leading-[0.9]" style={{ color }}>
              {value}
            </b>
            <span className="font-hand text-[22px] text-stone-muted">out of {max}</span>
          </div>
        </div>
      </div>
      <p className="mt-1 font-hand text-2xl leading-tight text-ink">{caption}</p>
    </div>
  );
}

/** Filler words as tally marks; marks past the healthy limit turn red. */
export function FillerTally({ count, limit = 5 }: { count: number; limit?: number }) {
  const shown = Math.min(count, 25);
  return (
    <div className="relative mt-1.5 h-11" role="img" aria-label={`${count} filler words`}>
      <RoughCanvas
        deps={[shown, limit]}
        delay={500}
        duration={220}
        draw={(rc, _s, svg) => {
          for (let i = 0; i < shown; i++) {
            const group = Math.floor(i / 5);
            const inGroup = i % 5;
            const stroke = i >= limit ? MARKER.beak : MARKER.ink;
            const gx = 4 + group * 52;
            const o = { stroke, strokeWidth: 2.4, roughness: 1.1, seed: i + 1 };
            svg.appendChild(inGroup === 4 ? rc.line(gx - 4, 34, gx + 38, 8, o) : rc.line(gx + inGroup * 10, 6, gx + inGroup * 10 + 1, 38, o));
          }
        }}
      />
    </div>
  );
}

/** Speaking pace on a number line, with the comfortable range hatched in green. */
export function PaceRuler({ wpm, low = 120, high = 160 }: { wpm: number; low?: number; high?: number }) {
  const min = 80;
  const max = 200;
  return (
    <div className="relative mt-1 h-[58px]" role="img" aria-label={`${wpm} words per minute; aim for ${low} to ${high}`}>
      <RoughCanvas
        deps={[wpm, low, high]}
        delay={700}
        duration={500}
        draw={(rc, { w }, svg) => {
          const X = (v: number) => 6 + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (w - 12);
          svg.appendChild(rc.rectangle(X(low), 26, X(high) - X(low), 14, { fill: "rgba(78,154,62,.4)", fillStyle: "hachure", hachureGap: 4, stroke: "none", seed: 4 }));
          svg.appendChild(rc.line(6, 40, w - 6, 40, { stroke: MARKER.ink, strokeWidth: 2, roughness: 1, seed: 5 }));
          [min, low, high, max].forEach((v, i) => {
            svg.appendChild(rc.line(X(v), 35, X(v), 45, { stroke: MARKER.ink, strokeWidth: 1.6, seed: 30 + i }));
            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", String(X(v)));
            t.setAttribute("y", "57");
            t.setAttribute("text-anchor", i === 0 ? "start" : i === 3 ? "end" : "middle");
            t.setAttribute("class", "font-hand");
            t.setAttribute("font-size", "15");
            t.setAttribute("fill", "#5E6656");
            t.textContent = String(v);
            svg.appendChild(t);
          });
          if (wpm > 0) {
            const px = X(wpm);
            const col = wpm < low || wpm > high ? MARKER.beak : MARKER.moss;
            svg.appendChild(rc.line(px, 4, px, 30, { stroke: col, strokeWidth: 2.6, roughness: 1.2, seed: 40 }));
            svg.appendChild(rc.linearPath([[px - 6, 22], [px, 31], [px + 6, 22]], { stroke: col, strokeWidth: 2.6, seed: 41 }));
          }
        }}
      />
    </div>
  );
}

export interface PathStop {
  label: string;
  question: string;
  score: number | null;
  max: number;
}

/**
 * Every answer as a hatched circle on one connected path. Fuller circles scored
 * higher. Choosing a circle opens that answer on the board below.
 */
export function AnswerPath({ stops, selected, onSelect }: { stops: PathStop[]; selected: number; onSelect: (i: number) => void }) {
  return (
    <div className="relative flex flex-col items-stretch gap-6 py-2.5 sm:flex-row sm:justify-between sm:gap-3">
      <RoughCanvas
        deps={[stops.length, selected, ...stops.map((s) => s.score)]}
        animateKey="path"
        delay={900}
        duration={600}
        draw={(rc, _s, svg) => {
          const host = svg.parentElement!.getBoundingClientRect();
          const dots = Array.from(svg.parentElement!.querySelectorAll<HTMLElement>("[data-dot]")).map((d) => {
            const r = d.getBoundingClientRect();
            return { x: r.left - host.left + r.width / 2, y: r.top - host.top + r.height / 2, r: r.width / 2 };
          });
          const vertical = dots.length > 1 && Math.abs(dots[0].x - dots[1].x) < 4;
          for (let i = 0; i < dots.length - 1; i++) {
            const a = dots[i];
            const b = dots[i + 1];
            const pts: [number, number][] = vertical
              ? [[a.x, a.y + a.r + 4], [a.x - 10, (a.y + b.y) / 2], [b.x, b.y - b.r - 4]]
              : [[a.x + a.r + 6, a.y], [(a.x + b.x) / 2, a.y + (i % 2 ? -14 : 14)], [b.x - b.r - 6, b.y]];
            const o = { stroke: MARKER.ink, strokeWidth: 1.8, roughness: 1.2, seed: 60 + i };
            svg.appendChild(rc.curve(pts, o));
            const [ex, ey] = pts[2];
            svg.appendChild(
              rc.linearPath(
                vertical ? [[ex - 6, ey - 8], [ex, ey], [ex + 6, ey - 8]] : [[ex - 8, ey - 6], [ex, ey], [ex - 8, ey + 6]],
                { ...o, seed: 70 + i }
              )
            );
          }
          dots.forEach((p, i) => {
            const { score, max } = stops[i];
            const ratio = score === null ? 0 : score / max;
            const col = score === null ? MARKER.faint : markerFor(ratio);
            svg.appendChild(
              rc.circle(p.x, p.y, p.r * 2, {
                stroke: col,
                strokeWidth: 2.4,
                roughness: 1.3,
                seed: 80 + i,
                ...(score === null ? {} : { fill: col, fillStyle: "hachure", hachureGap: Math.max(3, 15 - ratio * 14), fillWeight: 1.1, hachureAngle: -40 }),
              })
            );
            if (i === selected) svg.appendChild(rc.circle(p.x, p.y, p.r * 2 + 16, { stroke: MARKER.teal, strokeWidth: 2, roughness: 2.2, seed: 90 }));
          });
        }}
      />
      {stops.map((s, i) => {
        const on = i === selected;
        const col = s.score === null ? MARKER.faint : markerFor(s.score / s.max);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={on}
            aria-label={`Answer ${i + 1}${s.label ? `, ${s.label}` : ""}${s.score === null ? "" : `, scored ${s.score} out of ${s.max}`}`}
            className="group relative z-[1] grid min-w-0 flex-1 grid-cols-[70px_1fr] items-center gap-3 rounded-xl text-left focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-tealbird sm:block sm:text-center"
          >
            <span
              className={`absolute -top-1 right-0 -rotate-3 whitespace-nowrap font-hand text-lg text-tealbird transition-opacity sm:-top-10 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 ${on ? "opacity-100" : "opacity-0"}`}
            >
              open below ↓
            </span>
            <span data-dot className="relative mx-auto grid h-16 w-16 place-items-center sm:mb-2.5 sm:h-[78px] sm:w-[78px]">
              <b className="grid h-10 w-10 place-items-center rounded-full bg-[#FDFCF8]/85 font-hand text-[32px] leading-none" style={{ color: col }}>
                {s.score ?? "–"}
              </b>
            </span>
            <span className="block min-w-0">
              {s.label && <span className="block font-hand text-xl leading-tight text-ink">{s.label}</span>}
              <span className={`mt-1 line-clamp-2 block px-0 text-[12.5px] leading-snug sm:px-1 ${on ? "text-ink" : "text-stone-muted"}`}>{s.question}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A taped sticky note. */
export function Sticky({ title, items, tone }: { title: string; items: string[]; tone: "mint" | "yellow" | "pink" }) {
  const bg = { mint: "bg-[#D3EDC8] -rotate-[1.6deg]", yellow: "bg-[#F8E27C] rotate-[1.2deg]", pink: "bg-[#FADAD2] -rotate-[0.8deg]" }[tone];
  return (
    <div className={`relative min-h-[150px] px-[18px] pb-5 pt-[22px] shadow-[0_14px_18px_-14px_rgba(23,34,26,.45)] ${bg}`}>
      <span aria-hidden="true" className="absolute -top-2.5 left-1/2 h-5 w-[70px] -translate-x-1/2 -rotate-3 border border-ink/5 bg-white/55" />
      <h3 className="mb-2.5 font-hand text-[26px] leading-none text-ink">{title}</h3>
      <ul className="list-disc space-y-1.5 pl-[18px] text-sm leading-normal text-ink">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

const STAR_PARTS = [
  { key: "situation", letter: "S", name: "Situation", missing: "Not set up. The listener has to guess what was at stake." },
  { key: "task", letter: "T", name: "Task", missing: "Your own goal or role never came through." },
  { key: "action", letter: "A", name: "Action", missing: "It's unclear what you personally did." },
  { key: "result", letter: "R", name: "Result", missing: "You stopped before saying what changed." },
] as const;

/** The answer's story as four linked boxes; a missing step is a dashed red box. */
export function StarChain({ star, animateKey }: { star: Record<(typeof STAR_PARTS)[number]["key"], string>; animateKey: unknown }) {
  const present = STAR_PARTS.map((p) => !!star[p.key]?.trim());
  return (
    <div className="relative my-10 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 lg:gap-11">
      <RoughCanvas
        deps={[present.join()]}
        animateKey={animateKey}
        delay={300}
        duration={400}
        draw={(rc, _s, svg) => {
          const host = svg.parentElement!.getBoundingClientRect();
          const steps = Array.from(svg.parentElement!.querySelectorAll<HTMLElement>("[data-step]")).map((s) => s.getBoundingClientRect());
          for (let k = 0; k < steps.length - 1; k++) {
            const a = steps[k];
            const b = steps[k + 1];
            const sameRow = Math.abs(a.top - b.top) < 10;
            const p1: [number, number] = sameRow ? [a.right - host.left + 8, a.top - host.top + a.height / 2] : [a.left - host.left + a.width / 2, a.bottom - host.top + 10];
            const p2: [number, number] = sameRow ? [b.left - host.left - 8, b.top - host.top + b.height / 2] : [b.left - host.left + b.width / 2, b.top - host.top - 10];
            const gap = !present[k + 1];
            const o = { stroke: gap ? MARKER.beak : MARKER.ink, strokeWidth: 2, roughness: 1, seed: 200 + k };
            svg.appendChild(rc.line(p1[0], p1[1], p2[0], p2[1], gap ? { ...o, strokeLineDash: [6, 6] } : o));
            const ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
            svg.appendChild(
              rc.linearPath(
                [[p2[0] - 9 * Math.cos(ang - 0.5), p2[1] - 9 * Math.sin(ang - 0.5)], p2, [p2[0] - 9 * Math.cos(ang + 0.5), p2[1] - 9 * Math.sin(ang + 0.5)]],
                o
              )
            );
          }
        }}
      />
      {STAR_PARTS.map((p, i) => {
        const text = star[p.key]?.trim();
        return (
          <div key={p.key} data-step className="relative">
            <RoughBox
              animateKey={animateKey}
              delay={i * 120}
              className="min-h-[130px]"
              options={
                text
                  ? { stroke: MARKER.ink, strokeWidth: 2, roughness: 1.2, fill: "rgba(78,154,62,.14)", fillStyle: "solid", seed: 100 + i }
                  : { stroke: MARKER.beak, strokeWidth: 2, roughness: 1.8, strokeLineDash: [8, 7], seed: 100 + i }
              }
            >
              <div className="min-h-[130px] px-3.5 pb-4 pt-3.5">
                <p className="flex items-baseline gap-2 font-hand text-[26px] leading-none text-ink">
                  {p.letter}
                  <small className="font-sans text-[13px] text-stone-muted">{p.name}</small>
                </p>
                <p className={`mt-2 text-[13.5px] leading-normal ${text ? "text-ink" : "text-beak-deep"}`}>{text || p.missing}</p>
              </div>
            </RoughBox>
            {!text && (
              <span className="absolute -bottom-7 right-0 -rotate-[5deg] whitespace-nowrap font-hand text-[21px] leading-none text-beak">
                {p.key === "result" ? "missing the ending!" : "add this"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A filler word circled in red marker. */
function FillerMark({ word, animateKey, delay }: { word: string; animateKey: unknown; delay: number }) {
  return (
    <span className="relative mx-1 inline-block whitespace-nowrap text-beak-deep" title="Filler word">
      <RoughCanvas
        inset={6}
        deps={[word]}
        animateKey={animateKey}
        delay={delay}
        duration={300}
        draw={(rc, { w, h }, svg) => {
          svg.appendChild(rc.ellipse(w / 2, h / 2, w - 2, h - 2, { stroke: MARKER.beak, strokeWidth: 1.6, roughness: 1.6, seed: word.length * 31 + delay }));
        }}
      />
      {word}
    </span>
  );
}

/** The spoken answer with each detected filler word circled. */
export function MarkedTranscript({
  text,
  fillerWords,
  animateKey,
}: {
  text: string;
  fillerWords?: { word: string; position: number }[];
  animateKey: unknown;
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  // Positions come from the transcription step; skip any that overlap or fall outside the text
  [...(fillerWords || [])]
    .sort((a, b) => a.position - b.position)
    .forEach((f, i) => {
      if (f.position < last || f.position + f.word.length > text.length) return;
      if (f.position > last) parts.push(text.slice(last, f.position));
      parts.push(<FillerMark key={i} word={text.slice(f.position, f.position + f.word.length)} animateKey={animateKey} delay={600 + parts.length * 45} />);
      last = f.position + f.word.length;
    });
  if (last < text.length) parts.push(text.slice(last));
  return <p className="text-[15px] leading-[1.85] text-ink">{parts}</p>;
}

/** Eye contact per answer as little eye doodles; the pupil drifts as contact drops. */
export function EyeDoodles({ rows, selected }: { rows: { q: number; label?: string; percent: number }[]; selected: number }) {
  return (
    <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-4">
      {rows.map((r, i) => {
        const col = r.percent >= 70 ? MARKER.moss : r.percent >= 55 ? MARKER.amber : MARKER.beak;
        const on = r.q - 1 === selected;
        return (
          <div key={r.q} className="text-center">
            <div className="relative mx-auto h-[66px] w-[120px]" role="img" aria-label={`Answer ${r.q}: ${r.percent}% eye contact`}>
              <RoughCanvas
                deps={[r.percent, on]}
                animateKey="eyes"
                delay={400 + i * 120}
                duration={500}
                draw={(rc, _s, svg) => {
                  svg.appendChild(rc.path("M8 33 Q60 -4 112 33 Q60 70 8 33 Z", { stroke: on ? MARKER.teal : MARKER.ink, strokeWidth: on ? 2.6 : 1.8, roughness: 1.2, seed: 400 + i }));
                  const off = (100 - r.percent) * 0.45;
                  svg.appendChild(rc.circle(60 + off * 0.3, 33 + off * 0.35, 26, { stroke: col, fill: col, fillStyle: "cross-hatch", hachureGap: 4, strokeWidth: 1.6, seed: 420 + i }));
                }}
              />
            </div>
            <b className="font-hand text-2xl" style={{ color: col }}>
              {r.percent}%
            </b>
            <span className="block text-xs text-stone-muted">
              Q{r.q}
              {r.label ? ` · ${r.label}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
