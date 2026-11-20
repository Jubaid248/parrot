/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { getPromptLabel, relevanceOutOf10 } from "@/components/FeedbackCard";
import { BodyLanguageAnswerPanel, BodyLanguageReportCard } from "@/components/BodyLanguageReport";
import { Board, ScoreRing, FillerTally, PaceRuler, AnswerPath, Sticky, StarChain, MarkedTranscript, EyeDoodles } from "@/components/report/Whiteboard";
import { MARKER, markerFor, RoughBox } from "@/components/report/rough";
import { handFont } from "@/components/report/fonts";
import { friendlyError, requestErrorFrom } from "@/lib/friendlyError";
import { IPerAnswerFeedback } from "@/lib/models/FeedbackReport";

interface ReportData {
  session: {
    sessionId: string;
    jobDescription: string;
    resumeText: string;
    questions: string[];
    questionDetails?: any[];
    track?: string;
    status: string;
    createdAt: string;
  };
  answers: {
    questionIndex: number;
    questionText: string;
    answerTranscript: string;
    audioDuration: number;
    followUpText: string | null;
    followUpTranscript: string | null;
    followUpAudioDuration: number | null;
    timestamp: string;
  }[];
  report: {
    perAnswerFeedback: IPerAnswerFeedback[];
    totalFillerWordCount: number;
    avgPace: number;
    overallSummary: string;
    overallBand?: number;
    avgEyeContactPercent?: number | null;
    overallMovementScore?: "low" | "moderate" | "high" | null;
    bodyLanguageReport?: any;
  } | null;
}

const IELTS_CRITERIA = [
  { label: "Fluency", key: "fluencyCoherence" },
  { label: "Vocabulary", key: "lexicalResource" },
  { label: "Grammar", key: "grammaticalRange" },
  { label: "Pronunciation", key: "pronunciation" },
] as const;

/** One decimal place, without a trailing ".0". */
const tidy = (n: number) => Math.round(n * 10) / 10;

function scoreCaption(ratio: number) {
  if (ratio >= 0.8) return "Strong all round.";
  if (ratio >= 0.65) return "Solid, with a few gaps to close.";
  if (ratio >= 0.5) return "Getting there. Some answers need work.";
  return "Plenty to work on. Keep practising.";
}

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/interview/${sessionId}`);
        if (!res.ok) throw await requestErrorFrom(res);
        setData(await res.json());
      } catch (err) {
        setError(friendlyError("load-report", err));
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4 glass-card p-8 rounded-3xl border border-line">
          <svg className="animate-spin h-10 w-10 text-moss" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-ink/80 text-sm font-semibold">Loading your report…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto mt-12 px-4">
        <div className="glass-card border border-beak/30 rounded-3xl p-8 text-center space-y-4">
          <p className="text-ink font-medium">{error || "We can't find this report. The practice session may have expired."}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-moss hover:bg-moss-deep text-cream text-sm font-semibold transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => router.push("/mock-interview")}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-cream border border-line text-ink text-sm font-semibold transition-colors"
            >
              Start a new one
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state: the session exists but nothing has been answered yet
  if (!data.report && data.answers.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-12 px-4">
        <div className="rounded-3xl bg-paper border border-line p-8 text-center space-y-4">
          <h1 className="font-serif text-4xl text-ink">No answers yet</h1>
          <p className="text-sm text-stone-muted">Answer at least one question to get feedback.</p>
          <button
            onClick={() => router.push(`/interview/${sessionId}`)}
            className="px-5 py-2.5 rounded-xl bg-moss hover:bg-moss-deep text-cream text-sm font-semibold transition-colors"
          >
            Back to practice
          </button>
        </div>
      </div>
    );
  }

  const { report, answers } = data;
  const track = data.session.track;
  const isIelts = track === "ielts-speaking";
  const isDebate = track === "debate-practice";
  const isCommBuilder = track === "communication-builder";
  const isNegotiation = track === "negotiation-practice";
  const details = data.session.questionDetails || [];

  const context = isDebate ? details[0]?.motion : isNegotiation ? details[0]?.scenarioTitle : null;
  const unit = isIelts ? "prompt" : isDebate || isNegotiation ? "round" : "question";

  const header = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/mock-interview")}
          className="inline-flex items-center gap-1.5 text-sm text-stone-muted hover:text-ink transition-colors"
        >
          ← Start a new interview
        </button>
        <span className="text-xs text-stone-soft">Session {sessionId.slice(0, 8)}</span>
      </div>
      <h1 className="font-serif font-normal text-5xl sm:text-6xl leading-[1.02] text-ink pt-4">
        {isIelts
          ? "Your speaking, scored."
          : isDebate
          ? "How your case held up."
          : isNegotiation
          ? "How your deal came together."
          : isCommBuilder
          ? "How you came across."
          : "Here’s how you did."}
      </h1>
      <p className="text-[15px] text-stone-muted leading-relaxed max-w-[60ch]">
        {context || `The big picture first, then every ${unit} broken down underneath.`}
      </p>
    </div>
  );

  if (!report) {
    // Feedback isn't ready yet, so just show what was said
    return (
      <div className="max-w-3xl mx-auto space-y-8 px-4 sm:px-6 pt-10 sm:pt-14 pb-16">
        {header}
        <div className="glass-card rounded-3xl px-5 sm:px-6">
          {answers.map((answer, idx) => (
            <div key={idx} className="space-y-2 border-t border-line py-4 first:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">
                  {idx + 1}. {answer.questionText}
                </p>
                <span className="text-xs font-mono text-stone-muted">{answer.audioDuration}s</span>
              </div>
              <p className="text-sm text-ink/80 leading-relaxed">{answer.answerTranscript}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const feedback = report.perAnswerFeedback;
  const maxScore = isIelts ? 9 : 10;
  const answerScore = (fb: IPerAnswerFeedback): number | null =>
    isIelts ? (typeof fb.overallBand === "number" ? fb.overallBand : null) : relevanceOutOf10(fb.relevanceScore);
  const scored = feedback.map(answerScore).filter((s): s is number => s !== null);
  const overall = isIelts
    ? report.overallBand ?? (scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 2) / 2 : null)
    : scored.length
    ? tidy(scored.reduce((a, b) => a + b, 0) / scored.length)
    : null;

  // Strongest answers' "what worked" and weakest answers' "what to improve" become the sticky notes
  const byScore = feedback.map((fb, i) => ({ fb, i, s: answerScore(fb) ?? 0 }));
  const keepDoing = [...byScore].sort((a, b) => b.s - a.s).map((x) => x.fb.whatWorked).filter((s): s is string => !!s).slice(0, 3);
  const workOnNext = [...byScore].sort((a, b) => a.s - b.s).map((x) => x.fb.whatToImprove).filter((s): s is string => !!s).slice(0, 3);

  const labelFor = (i: number) => {
    const raw = getPromptLabel(i + 1, track, details[i]);
    // IELTS labels carry the topic too; the path only has room for the part
    return isIelts && raw ? raw.split(" · ").slice(0, 2).join(" · ") : raw || undefined;
  };
  const eyeFor = (fb: any): number | null =>
    typeof fb.bodyLanguage?.stats?.eyeContactPercent === "number"
      ? fb.bodyLanguage.stats.eyeContactPercent
      : typeof fb.eyeContactPercent === "number"
      ? fb.eyeContactPercent
      : null;
  const eyeRows = feedback.map((fb, i) => ({ q: i + 1, label: labelFor(i), percent: eyeFor(fb) })).filter((r): r is { q: number; label: string | undefined; percent: number } => r.percent !== null);
  const hasBodyLanguage = !!report.bodyLanguageReport || typeof report.avgEyeContactPercent === "number" || !!report.overallMovementScore;

  // Open the weakest answer first: that's where the most useful feedback is
  const weakest = [...byScore].sort((a, b) => a.s - b.s)[0]?.i ?? 0;
  const current = selected ?? weakest;
  const fb = feedback[current];
  const score = fb ? answerScore(fb) : null;
  const eye = fb ? eyeFor(fb) : null;
  const star = fb?.starAnalysis;
  const showStar = !isIelts && !!star && Object.values(star).some((v) => typeof v === "string" && v.trim());

  const choose = (i: number) => {
    setSelected(i);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className={`${handFont.variable} max-w-5xl mx-auto space-y-8 px-4 sm:px-6 pt-10 sm:pt-14 pb-16`}>
      {header}

      {/* Board 1: the big picture */}
      <Board>
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[220px_1fr_250px]">
          {overall !== null ? (
            <div>
              <ScoreRing value={overall} max={maxScore} caption={isIelts ? "Estimated band" : scoreCaption(overall / maxScore)} />
              {isIelts && <p className="mt-1 text-center text-xs text-amber-800">Practice estimate, not an official IELTS score</p>}
            </div>
          ) : (
            <div />
          )}

          {report.overallSummary ? (
            <div className="flex items-start gap-3.5">
              <Image
                src="/totapakhi-perched-parrot.png"
                alt=""
                width={58}
                height={58}
                className="mt-1 h-[58px] w-[58px] shrink-0 rounded-full object-cover shadow-[0_0_0_3px_#FDFCF8,0_0_0_5px_#2E9F9C]"
              />
              <RoughBox tail className="flex-1" options={{ stroke: MARKER.teal, strokeWidth: 2, roughness: 1.4 }} delay={300}>
                <div className="px-[18px] py-4">
                  <p className="mb-1.5 font-hand text-[22px] font-bold leading-none text-tealbird">Tota says</p>
                  <p className="text-[15.5px] leading-relaxed text-ink">{report.overallSummary}</p>
                </div>
              </RoughBox>
            </div>
          ) : (
            <div />
          )}

          <div className="grid gap-6 sm:grid-cols-2 md:col-span-2 lg:col-span-1 lg:grid-cols-1">
            <div>
              <p className="font-hand text-2xl font-bold leading-none text-ink">Filler words: {report.totalFillerWordCount}</p>
              {report.totalFillerWordCount > 0 && <FillerTally count={report.totalFillerWordCount} />}
              <p className="mt-0.5 text-[12.5px] text-stone-muted">
                {report.totalFillerWordCount <= 5 ? "Nicely clean. Under 6 sounds confident." : "Words like “um” and “like”. Under 6 sounds confident."}
              </p>
            </div>
            {report.avgPace > 0 && (
              <div>
                <p className="font-hand text-2xl font-bold leading-none text-ink">Pace: {report.avgPace} wpm</p>
                <PaceRuler wpm={report.avgPace} />
                <p className="text-[12.5px] text-stone-muted">
                  {report.avgPace > 160 ? "A little fast." : report.avgPace < 120 ? "A little slow." : "Right in the zone."} The green zone is 120 to 160.
                </p>
              </div>
            )}
          </div>
        </div>

        {isIelts && (
          <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-3">
            {IELTS_CRITERIA.map(({ label, key }) => {
              const vals = feedback.map((f: any) => f[key]).filter((v: any) => typeof v === "number");
              const avg = vals.length ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 2) / 2 : null;
              return (
                <div key={key} className="text-center">
                  <b className="block font-hand text-3xl leading-none" style={{ color: avg === null ? MARKER.faint : markerFor(avg / 9) }}>
                    {avg ?? "–"}
                  </b>
                  <span className="text-xs text-stone-muted">{label}</span>
                </div>
              );
            })}
          </div>
        )}

        <h2 className="mt-9 font-hand text-[32px] font-bold leading-none text-ink">
          {isIelts ? "Prompt by prompt" : isDebate || isNegotiation ? "Round by round" : "The interview, start to finish"}
        </h2>
        <p className="mb-5 mt-1.5 text-[13.5px] text-stone-muted">
          Each circle is one {unit}. Fuller circles scored higher. Pick one to open it below.
        </p>
        <AnswerPath
          stops={feedback.map((f, i) => ({ label: labelFor(i) || `${unit[0].toUpperCase()}${unit.slice(1)} ${i + 1}`, question: f.questionText, score: answerScore(f), max: maxScore }))}
          selected={current}
          onSelect={choose}
        />

        {(keepDoing.length > 0 || workOnNext.length > 0) && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {keepDoing.length > 0 && <Sticky title="Keep doing" items={keepDoing} tone="mint" />}
            {workOnNext.length > 0 && <Sticky title="Work on next" items={workOnNext} tone="yellow" />}
          </div>
        )}

        {!hasBodyLanguage && (
          <p className="mt-8 rounded-2xl border border-dashed border-line bg-white/50 p-4 text-sm text-stone-muted">
            Turn on your camera next time to get feedback on eye contact, posture and body language.
          </p>
        )}
      </Board>

      {/* Board 2: one answer at a time */}
      {fb && (
        <div ref={detailRef} className="scroll-mt-24">
          <Board>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0 flex-1">
                <p className="font-hand text-2xl leading-none text-tealbird">
                  {`${unit[0].toUpperCase()}${unit.slice(1)} ${current + 1}`}
                  {labelFor(current) ? ` · ${labelFor(current)}` : ""}
                </p>
                <h2 className="mt-1.5 max-w-[32ch] font-serif text-[26px] leading-tight text-ink sm:text-[34px]">{fb.questionText}</h2>
              </div>
              <div className="flex flex-wrap gap-5 pt-1.5">
                {[
                  score !== null && { v: isIelts ? `Band ${score}` : `${score}/10`, l: isIelts ? "Band" : "Answer score", c: markerFor(score / maxScore) },
                  fb.speakingPace > 0 && { v: String(fb.speakingPace), l: "Words / min", c: fb.speakingPace > 160 || fb.speakingPace < 120 ? MARKER.beak : MARKER.ink },
                  { v: String(fb.fillerWordCount), l: "Filler words", c: fb.fillerWordCount > 3 ? MARKER.beak : MARKER.ink },
                  eye !== null && { v: `${eye}%`, l: "Eye contact", c: eye >= 70 ? MARKER.moss : eye >= 55 ? MARKER.amber : MARKER.beak },
                ]
                  .filter((x): x is { v: string; l: string; c: string } => !!x)
                  .map((chip, i) => (
                    <RoughBox key={chip.l} animateKey={current} delay={i * 80} options={{ stroke: MARKER.ink, strokeWidth: 1.4, roughness: 1.6, seed: 50 + i }}>
                      <div className="min-w-[88px] px-3 py-1.5 text-center">
                        <b className="block font-hand text-[28px] leading-none" style={{ color: chip.c }}>
                          {chip.v}
                        </b>
                        <span className="text-xs text-stone-muted">{chip.l}</span>
                      </div>
                    </RoughBox>
                  ))}
              </div>
            </div>

            {(fb.whatWorked || fb.whatToImprove) && (
              <div className="mt-6 grid grid-cols-1 gap-3 text-sm leading-relaxed sm:grid-cols-2 sm:gap-8">
                {fb.whatWorked && (
                  <p>
                    <span className="font-hand text-xl font-bold text-moss">Worked: </span>
                    {fb.whatWorked}
                  </p>
                )}
                {fb.whatToImprove && (
                  <p>
                    <span className="font-hand text-xl font-bold text-beak-deep">Fix: </span>
                    {fb.whatToImprove}
                  </p>
                )}
              </div>
            )}

            {isIelts && (
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-stone-muted">
                {IELTS_CRITERIA.map(({ label, key }) => (
                  <span key={key}>
                    {label} <b className="font-hand text-2xl text-ink">{typeof (fb as any)[key] === "number" ? (fb as any)[key] : "–"}</b>
                  </span>
                ))}
              </div>
            )}

            {showStar && star && <StarChain star={star} animateKey={current} />}

            <div className={`${showStar ? "mt-16" : "mt-10"} grid grid-cols-1 gap-9 lg:grid-cols-[1.15fr_1fr]`}>
              <div>
                <p className="mb-2.5 flex items-baseline gap-2.5 font-hand text-[26px] font-bold leading-none text-ink">
                  What you said
                  <small className="font-sans text-[12.5px] font-normal text-stone-muted">
                    {fb.fillerWords?.length ? `${fb.fillerWords.length} filler word${fb.fillerWords.length > 1 ? "s" : ""} circled` : "no filler words"}
                  </small>
                </p>
                <MarkedTranscript key={current} text={fb.answerTranscript} fillerWords={fb.fillerWords} animateKey={current} />
                {fb.followUpText && (
                  <div className="mt-6 border-l-[3px] border-line pl-4 text-sm leading-relaxed text-stone-muted">
                    <span className="font-semibold text-ink">Follow-up:</span> {fb.followUpText}
                    {fb.followUpTranscript && <span className="mt-1 block text-ink/80">{fb.followUpTranscript}</span>}
                  </div>
                )}
              </div>
              {fb.rewrittenExample && (
                <div>
                  <p className="mb-2.5 font-hand text-[26px] font-bold leading-none text-ink">{isIelts ? "A band 8+ version" : "A stronger version"}</p>
                  <div className="relative rotate-[.6deg] bg-white px-5 pb-[22px] pt-5 shadow-[0_14px_20px_-16px_rgba(23,34,26,.4)]">
                    <span aria-hidden="true" className="absolute -top-2.5 left-[18px] h-5 w-16 -rotate-6 bg-tealbird/20" />
                    <span aria-hidden="true" className="absolute -top-2.5 right-[18px] h-5 w-16 rotate-[5deg] bg-tealbird/20" />
                    <p className="text-[15px] leading-relaxed text-ink">{fb.rewrittenExample}</p>
                  </div>
                </div>
              )}
            </div>

            {(fb as any).bodyLanguage && (
              <div className="mt-10">
                <p className="mb-3 font-hand text-[26px] font-bold leading-none text-ink">On camera for this {unit}</p>
                <BodyLanguageAnswerPanel data={(fb as any).bodyLanguage} />
              </div>
            )}

            {eyeRows.length > 1 && (
              <div className="mt-10">
                <p className="font-hand text-[32px] font-bold leading-none text-ink">Eye contact by {unit}</p>
                <p className="mb-4 mt-1.5 text-[13.5px] text-stone-muted">How much of each {unit} you spent looking at the camera. Aim for 70% or more.</p>
                <EyeDoodles rows={eyeRows} selected={current} />
              </div>
            )}

            <div className="mt-10 flex justify-between gap-3 text-sm font-semibold">
              <button
                disabled={current === 0}
                onClick={() => choose(current - 1)}
                className="rounded-xl px-4 py-2.5 text-moss hover:bg-moss/10 disabled:invisible"
              >
                ← Previous {unit}
              </button>
              <button
                disabled={current === feedback.length - 1}
                onClick={() => choose(current + 1)}
                className="rounded-xl px-4 py-2.5 text-moss hover:bg-moss/10 disabled:invisible"
              >
                Next {unit} →
              </button>
            </div>
          </Board>
        </div>
      )}

      {/* Full camera breakdown stays as its own card under the boards */}
      {report.bodyLanguageReport ? (
        <BodyLanguageReportCard
          report={report.bodyLanguageReport}
          perQuestion={feedback
            .map((f: any, i: number) => ({ q: i + 1, label: labelFor(i), data: f.bodyLanguage }))
            .filter((row: any) => row.data)}
        />
      ) : (
        // Older sessions only stored average eye contact and head movement
        hasBodyLanguage && (
          <div className="grid grid-cols-2 gap-3">
            {typeof report.avgEyeContactPercent === "number" && (
              <Stat
                label="Eye contact"
                value={`${report.avgEyeContactPercent}%`}
                color={report.avgEyeContactPercent >= 70 ? "text-moss" : report.avgEyeContactPercent >= 50 ? "text-amber-800" : "text-beak-deep"}
              />
            )}
            {report.overallMovementScore && (
              <Stat label="Head movement" value={report.overallMovementScore} color={report.overallMovementScore === "high" ? "text-amber-800" : "text-ink"} />
            )}
          </div>
        )
      )}

      <div className="flex justify-center pt-2">
        <button
          onClick={() => router.push("/mock-interview")}
          className="rounded-2xl bg-moss px-6 py-3.5 text-[15px] font-semibold text-cream transition-colors hover:bg-moss-deep"
        >
          Practice again
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, color = "text-ink" }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <div className="glass-card rounded-2xl p-3 sm:p-4">
      <p className="text-xs text-stone-muted">{label}</p>
      <p className={`font-serif text-2xl sm:text-3xl whitespace-nowrap capitalize ${color}`}>{value}</p>
      {hint && <p className="text-[11px] text-stone-soft">{hint}</p>}
    </div>
  );
}
