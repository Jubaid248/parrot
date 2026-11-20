"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FlyingParrot from "@/components/FlyingParrot";

interface InterviewStageProps {
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
  /** Word Tota is saying right now, from speech boundary events (-1 when the voice doesn't report them). */
  spokenWordIndex?: number;
  /** Small label at the top, e.g. "Question 1 of 8". */
  label: ReactNode;
  /** Controls shown at the top right (hear again, read aloud). */
  controls?: ReactNode;
  /** What Tota says before the question, e.g. a greeting. Shown small, above the question. */
  lead?: string;
  /** The question Tota asks. It appears in the speech bubble word by word as Tota speaks. */
  question: string;
  /** Context shown above the stage scene (debate motion, negotiation brief). */
  before?: ReactNode;
  /** Extras shown under the speech bubble (cue card bullets, framework hints). */
  children?: ReactNode;
}

// Browser speech synthesis has no reliable word timings, so the beak follows a
// syllable-like rhythm while Tota speaks.
function useTalkingMouth(active: boolean) {
  const [mouth, setMouth] = useState(0);
  useEffect(() => {
    if (!active) {
      setMouth(0);
      return;
    }
    let syllable = 0;
    const id = setInterval(() => {
      syllable += 1;
      if (syllable % (3 + Math.floor(Math.random() * 3)) === 0) setMouth(0.05);
      else setMouth(0.35 + Math.random() * 0.65);
    }, 95);
    return () => clearInterval(id);
  }, [active]);
  return mouth;
}

// Roughly how long Tota takes to say a word, used when the voice gives no word timings.
function wordDuration(word: string) {
  return 190 + word.length * 30 + (/[,;:]$/.test(word) ? 260 : 0) + (/[.?!]$/.test(word) ? 420 : 0);
}

type Phase = "wait" | "speak" | "all";

/**
 * How many words of the bubble are showing. While Tota speaks, words appear in step
 * with the voice (boundary events when available, otherwise a speech-like pace).
 * Without speech, or once it stops, the rest appear in a quick cascade.
 */
function useWordReveal(textKey: string, words: string[], isSpeaking: boolean, spokenWordIndex: number) {
  const [key, setKey] = useState(textKey);
  const [phase, setPhase] = useState<Phase>(isSpeaking ? "speak" : "wait");
  const [shown, setShown] = useState(0);
  const [settleFrom, setSettleFrom] = useState(0);
  const shownRef = useRef(0);
  shownRef.current = shown;
  const wasSpeaking = useRef(isSpeaking);

  // New question: start over before the first paint so the old text never flashes.
  if (key !== textKey) {
    setKey(textKey);
    setShown(0);
    setSettleFrom(0);
    setPhase(isSpeaking ? "speak" : "wait");
  }

  useEffect(() => {
    const rising = isSpeaking && !wasSpeaking.current;
    wasSpeaking.current = isSpeaking;
    if (rising) {
      // Replays ("hear again") stream the question again
      setShown(0);
      setPhase("speak");
      return;
    }
    if (phase === "wait") {
      if (isSpeaking) {
        setPhase("speak");
        return;
      }
      // Audio is off: give the bubble a beat, then cascade the words in
      const id = setTimeout(() => {
        setSettleFrom(shownRef.current);
        setPhase("all");
      }, 450);
      return () => clearTimeout(id);
    }
    if (phase === "speak" && !isSpeaking) {
      setSettleFrom(shownRef.current);
      setPhase("all");
    }
  }, [phase, isSpeaking]);

  const hasBoundaries = spokenWordIndex >= 0;

  // Voice reports word timings: follow it exactly
  useEffect(() => {
    if (phase === "speak" && spokenWordIndex >= 0) {
      setShown((s) => Math.min(words.length, Math.max(s, spokenWordIndex + 1)));
    }
  }, [phase, spokenWordIndex, words.length]);

  // No word timings: pace the words like speech
  useEffect(() => {
    if (phase !== "speak" || hasBoundaries) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 220;
    for (let i = shownRef.current; i < words.length; i++) {
      const next = i + 1;
      timers.push(setTimeout(() => setShown((s) => Math.max(s, next)), t));
      t += wordDuration(words[i]);
    }
    return () => timers.forEach(clearTimeout);
  }, [phase, hasBoundaries, words, key]);

  return { phase, shown: phase === "all" ? words.length : shown, settleFrom };
}

/** Center stage: Tota asks the question in a speech bubble that fills in word by word. */
export default function InterviewStage({
  isSpeaking,
  isListening,
  isProcessing,
  spokenWordIndex = -1,
  label,
  controls,
  lead,
  question,
  before,
  children,
}: InterviewStageProps) {
  const mouth = useTalkingMouth(isSpeaking);

  const leadWords = useMemo(() => (lead ? lead.trim().split(/\s+/).filter(Boolean) : []), [lead]);
  const questionWords = useMemo(() => question.trim().split(/\s+/).filter(Boolean), [question]);
  const words = useMemo(() => [...leadWords, ...questionWords], [leadWords, questionWords]);
  const textKey = `${lead ?? ""}\u0000${question}`;

  const { phase, shown, settleFrom } = useWordReveal(textKey, words, isSpeaking, spokenWordIndex);

  // Each new word gives the voice ring a small swell
  const [swell, setSwell] = useState(false);
  useEffect(() => {
    if (phase !== "speak" || shown === 0) return;
    setSwell(true);
    const id = setTimeout(() => setSwell(false), 160);
    return () => clearTimeout(id);
  }, [shown, phase]);

  const status = useMemo(() => {
    if (isProcessing) return { label: "Thinking", flap: 0.6, mode: "thinking" as const };
    if (isSpeaking) return { label: "Speaking", flap: 0.8, mode: "speaking" as const };
    if (isListening) return { label: "Listening", flap: 1.2, mode: "listening" as const };
    return { label: "Your turn", flap: 1.1, mode: "idle" as const };
  }, [isProcessing, isSpeaking, isListening]);

  const finished = phase === "all";
  const current = phase === "speak" ? shown - 1 : -1;

  const renderWord = (word: string, i: number) => {
    const visible = i < shown;
    const delay = phase === "all" && i >= settleFrom ? Math.min(600, (i - settleFrom) * 28) : 0;
    return (
      <span
        key={i}
        className={`tota-word${visible ? " is-in" : ""}${i === current ? " is-now" : ""}`}
        style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      >
        {word}
      </span>
    );
  };

  // Words joined with real spaces so they wrap like normal text
  const renderWords = (list: string[], offset: number) =>
    list.flatMap((w, j) => (j === 0 ? [renderWord(w, offset)] : [" ", renderWord(w, offset + j)]));

  return (
    <section
      data-tota={status.mode}
      className="tota-stage relative overflow-hidden rounded-[2rem] border border-line px-4 pb-6 pt-4 sm:px-8 sm:pb-9"
    >
      {/* Top bar: status, turn label, audio controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-full border border-line bg-paper/90 px-3 py-1.5 text-xs font-medium text-ink">
          <span className="tota-eq" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          Tota · {status.label}
        </div>
        <div className="order-3 flex w-full flex-wrap items-center justify-center gap-2 sm:order-none sm:w-auto">{label}</div>
        <div className="flex items-center gap-2">{controls}</div>
      </div>

      {before && <div className="relative z-10 mx-auto mt-4 max-w-3xl text-center">{before}</div>}

      {/* Scene: speech bubble on the left, Tota on the right facing it */}
      <div className="relative mx-auto mt-4 grid max-w-4xl grid-cols-1 items-center justify-items-center gap-3 md:grid-cols-[1fr_auto] md:gap-4">
        <div className="relative order-2 w-full md:order-1 md:justify-self-end">
          <div key={textKey} className="tota-bubble relative mx-auto w-full max-w-2xl rounded-[1.6rem] border border-line bg-white px-5 py-5 sm:px-8 sm:py-6">
            <p className="sr-only" aria-live="polite">
              {lead ? `${lead} ` : ""}
              {question}
            </p>

            <div aria-hidden="true" className="relative">
              {leadWords.length > 0 && (
                <p className="mb-2 text-sm leading-relaxed text-stone-muted">{renderWords(leadWords, 0)}</p>
              )}
              <h2 className="min-h-[2.6em] font-serif text-2xl font-normal leading-snug text-ink sm:text-[2rem]">
                {renderWords(questionWords, leadWords.length)}
              </h2>
              {phase !== "all" && shown === 0 && (
                <span className="tota-typing absolute left-0 top-1" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </div>

            <p className={`tota-hint ${finished && !isSpeaking ? "is-in" : ""}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-tealbird" aria-hidden="true" />
              {isListening ? "Tota is listening." : isProcessing ? "Tota is thinking about your answer." : "Your turn. Answer when you're ready."}
            </p>
          </div>
        </div>

        {/* Tota with calm voice rings */}
        <div className="relative order-1 h-40 w-40 shrink-0 sm:h-48 sm:w-48 md:order-2 md:h-56 md:w-56">
          <div className="absolute inset-0" aria-hidden="true">
            <div
              className="tota-halo absolute inset-[12%] rounded-full"
              style={{ transform: swell ? "scale(1.07)" : "scale(1)" }}
            />
            <div className="tota-ripple absolute inset-[16%] rounded-full" />
            <div className="tota-ripple absolute inset-[16%] rounded-full" />
            <div className="tota-ripple absolute inset-[16%] rounded-full" />
            <div
              className="tota-voice absolute inset-[16%] rounded-full"
              style={{ transform: swell ? "scale(1.09)" : "scale(1)" }}
            />
          </div>
          <FlyingParrot
            mouth={mouth}
            speaking={isSpeaking}
            flapSeconds={status.flap}
            className="absolute inset-0 h-full w-full drop-shadow-[0_14px_16px_rgba(23,34,26,0.16)]"
          />
        </div>
      </div>

      {children && <div className="relative z-10 mx-auto mt-5 max-w-3xl space-y-4 text-center">{children}</div>}
    </section>
  );
}
