"use client";

import React, { useEffect, useRef, useState } from "react";

interface SystemCheckProps {
  onStartInterview: (mode: "practice" | "serious") => void;
  trackName?: string;
  onRequestCamera: () => Promise<boolean>;
  cameraActive: boolean;
  cameraError?: string;
  initialMode?: "practice" | "serious";
}

const MODES = {
  practice: {
    chips: ["Your own pace", "Camera optional", "Tap to record"],
    start: "Start practice",
    fine: "You can turn your camera on any time.",
  },
  serious: {
    chips: ["Full screen", "Camera on", "Records automatically"],
    start: "Start interview",
    fine: "Leaving full screen or switching tabs shows up in your report.",
  },
} as const;

/** One small card: pick a mode, (for a real interview) turn on camera and mic, start. */
export default function SystemCheck({
  onStartInterview,
  onRequestCamera,
  cameraActive,
  cameraError,
  initialMode = "practice",
}: SystemCheckProps) {
  const [mode, setMode] = useState<"practice" | "serious">(initialMode);
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [requesting, setRequesting] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);

  // Turn on camera and mic, and listen to the mic so the user can see it works
  const handleEnableMedia = async () => {
    setRequesting(true);
    try {
      const ok = await onRequestCamera();
      if (!ok) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioCtx;
      setMicActive(true);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setMicLevel(Math.min(1, sum / data.length / 70));
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Permission problems surface through cameraError
    } finally {
      setRequesting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const serious = mode === "serious";
  const devicesReady = cameraActive && micActive;
  const canStart = !serious || devicesReady;
  const copy = MODES[mode];

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      <div className="rounded-[1.75rem] border border-line bg-white px-6 pb-6 pt-8 text-center shadow-[0_30px_60px_-30px_rgba(23,34,26,0.18)] sm:px-8">
        <h1 className="font-serif text-4xl font-normal leading-tight text-ink sm:text-[2.6rem]">Ready when you are</h1>
        <p className="mt-2 text-sm text-stone-muted">Pick a mode and Tota will take it from there.</p>

        {/* Mode switch */}
        <div role="radiogroup" aria-label="Interview mode" className="relative mt-6 grid grid-cols-2 rounded-2xl border border-line bg-cream p-1">
          <span
            aria-hidden="true"
            className={`absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-[0_2px_8px_rgba(23,34,26,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              serious ? "translate-x-full" : ""
            }`}
          />
          {(["practice", "serious"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`relative z-10 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                mode === m ? "text-ink" : "text-stone-muted hover:text-ink"
              }`}
            >
              {m === "practice" ? "Practice" : "Real interview"}
            </button>
          ))}
        </div>

        {/* What this mode means */}
        <div key={mode} className="mt-4 flex min-h-[30px] flex-wrap justify-center gap-2">
          {copy.chips.map((chip, i) => (
            <span
              key={chip}
              className="animate-chip-in inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${serious ? "bg-beak" : "bg-moss-light"}`} aria-hidden="true" />
              {chip}
            </span>
          ))}
        </div>

        {/* Real interview needs camera and mic */}
        {serious && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-left">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  devicesReady ? "bg-moss-light shadow-[0_0_0_4px_rgba(78,154,62,0.18)]" : "bg-beak"
                }`}
              />
              <span className="text-sm font-medium text-ink">
                {devicesReady ? "Camera and mic ready" : "Camera and mic needed"}
              </span>
            </div>
            {devicesReady ? (
              <span className="flex h-4 items-end gap-0.5" aria-label="Microphone level">
                {[0.5, 0.8, 1, 0.7].map((k, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-moss-light transition-[height] duration-75"
                    style={{ height: `${Math.max(3, Math.round(16 * Math.min(1, micLevel * k * 1.4)))}px` }}
                  />
                ))}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEnableMedia}
                disabled={requesting}
                className="whitespace-nowrap rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-cream disabled:opacity-60"
              >
                {requesting ? "Connecting…" : "Turn on"}
              </button>
            )}
          </div>
        )}

        {serious && cameraError && (
          <p role="alert" className="mt-2 rounded-xl border border-beak/30 bg-beak-soft p-2.5 text-left text-xs text-beak-deep">
            {cameraError}
          </p>
        )}

        <button
          type="button"
          onClick={() => onStartInterview(mode)}
          disabled={!canStart}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-cream transition-all duration-200 hover:-translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35 ${
            serious ? "bg-ink hover:bg-moss-deep" : "bg-moss hover:bg-moss-deep"
          }`}
        >
          {copy.start} <span aria-hidden="true">→</span>
        </button>
        <p className="mt-3 text-xs text-stone-soft">{copy.fine}</p>
      </div>
    </div>
  );
}
