/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import {
  updateInterviewSession,
  createAnswerRecord,
  updateAnswerRecord,
  getAnswersForSession,
  findAnswerRecord,
} from "@/lib/store";
import { sanitizeTally } from "@/lib/bodyLanguage/metrics";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { requireUser, requireOwnedSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { generateFollowUp } from "@/lib/ai/llm";
import type { FollowUpStyle } from "@/lib/config/sessionScript";

/**
 * Which follow-up (if any) Tota asks after a main answer. Scripted tracks set
 * followUpStyle per question; mock interviews probe once on every question
 * except the opening introduction, which sets followUpStyle to null.
 */
function resolveFollowUpStyle(track: string, detail: any): FollowUpStyle | null {
  if (detail && "followUpStyle" in detail) return detail.followUpStyle ?? null;
  if (track === "ielts-speaking") return null;
  return "interview";
}

const MOVEMENT_SCORES = new Set(["low", "moderate", "high"]);

// Role-plays where the counterpart must remember what was already said
const CONVERSATIONAL_TRACKS = new Set(["negotiation-practice"]);

function formatHistory(answers: any[]): string {
  return [...answers]
    .sort((a, b) => a.questionIndex - b.questionIndex)
    .map((a) =>
      [
        `Tota: ${a.questionText}`,
        `User: ${a.answerTranscript || "(no answer)"}`,
        a.followUpText ? `Tota: ${a.followUpText}` : "",
        a.followUpTranscript ? `User: ${a.followUpTranscript}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");
}

// AI calls can be slow; give Vercel functions up to 60s instead of the default
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;
    const limited = await rateLimit(user.value, "answer");
    if (limited) return limited;

    const {
      sessionId,
      audioBase64,
      audioDuration,
      questionIndex: clientQuestionIndex,
      isFollowUp: clientIsFollowUp,
      liveText,
      track = "mock-interview",
      eyeContactPercent,
      movementScore,
      bodyLanguage,
    } = await req.json();

    const blData = {
      eyeContactPercent:
        typeof eyeContactPercent === "number" && Number.isFinite(eyeContactPercent)
          ? Math.min(100, Math.max(0, eyeContactPercent))
          : null,
      movementScore: MOVEMENT_SCORES.has(movementScore) ? (movementScore as "low" | "moderate" | "high") : null,
    };
    // Full eye-movement and posture tally for this recording (counts only, never video).
    // It comes from the browser, so only known numeric fields and a capped list of moments are kept.
    const blTally = sanitizeTally(bodyLanguage);
    const duration =
      typeof audioDuration === "number" && Number.isFinite(audioDuration) ? Math.min(3600, Math.max(0, audioDuration)) : 0;

    if (typeof sessionId !== "string" || !sessionId || typeof audioBase64 !== "string" || !audioBase64) {
      return NextResponse.json(
        { error: "sessionId and audioBase64 are required." },
        { status: 400 }
      );
    }

    // Find the session; only its owner may answer
    const owned = await requireOwnedSession(sessionId, user.value);
    if (!owned.ok) return owned.response;
    const session = owned.value;

    // The server's copy of the session decides which question this answer belongs to.
    // A retry that arrives after the session already moved on is rejected rather than
    // being saved against the wrong question.
    const idx: number = session.currentQuestionIndex;
    const totalQuestions: number = session.questions.length;
    if (session.status === "completed" || idx >= totalQuestions) {
      return NextResponse.json(
        { error: "This practice session is already finished.", resync: true },
        { status: 409 }
      );
    }
    const isFollowUp = Boolean(session.awaitingFollowUp);
    if (
      (typeof clientQuestionIndex === "number" && clientQuestionIndex !== idx) ||
      (typeof clientIsFollowUp === "boolean" && clientIsFollowUp !== isFollowUp)
    ) {
      return NextResponse.json(
        { error: "This answer was already received.", resync: true },
        { status: 409 }
      );
    }

    let questionText: string = session.questions[idx];
    if (isFollowUp) {
      const record = await findAnswerRecord(sessionId, idx);
      if (!record?.followUpText) {
        return NextResponse.json(
          { error: "This answer was already received.", resync: true },
          { status: 409 }
        );
      }
      questionText = record.followUpText;
    }

    // Transcribe the audio (use live speech-to-text transcript if provided, with safe fallback)
    let transcript = "";
    if (typeof liveText === "string" && liveText.trim().length > 0) {
      // Several minutes of speech is well under this; it only stops oversized payloads
      transcript = liveText.trim().slice(0, 20_000);
    } else {
      try {
        const trResult = await transcribeAudio(audioBase64);
        transcript = trResult.text || "";
      } catch (err) {
        console.warn("[Answer API] transcribeAudio failed, using fallback:", err);
        transcript = "No response detected.";
      }
    }

    const effectiveTrack = session.track || track || "mock-interview";

    const isConversational = CONVERSATIONAL_TRACKS.has(effectiveTrack);
    const loadHistory = async () =>
      isConversational ? formatHistory(await getAnswersForSession(sessionId)) : undefined;

    // Moves the session to the next scripted question, or marks it complete
    const advance = async (lastLineSaid: string) => {
      const nextIndex = idx + 1;

      if (nextIndex >= totalQuestions) {
        await updateInterviewSession(sessionId, { currentQuestionIndex: nextIndex, awaitingFollowUp: false });
        return NextResponse.json({
          transcript,
          isComplete: true,
          message: "All questions answered. Ready to generate feedback.",
        });
      }

      // Mid-role-play beats are written live so they fit what has already been said;
      // the scripted line stays as a fallback
      let nextQuestion: string = session.questions[nextIndex];
      const nextDetail = session.questionDetails?.[nextIndex];
      const updates: Record<string, any> = { currentQuestionIndex: nextIndex, awaitingFollowUp: false };
      if (nextDetail?.beat) {
        const result = await generateFollowUp(effectiveTrack, lastLineSaid, transcript, {
          detail: { ...nextDetail, followUpStyle: "negotiation-beat" },
          history: await loadHistory(),
        });
        if (result.followUpQuestion) {
          nextQuestion = result.followUpQuestion;
          const questions = [...session.questions];
          questions[nextIndex] = nextQuestion;
          updates.questions = questions;
        } else {
          console.warn("[Answer API] Beat generation failed, using scripted line:", result.error);
        }
      }

      await updateInterviewSession(sessionId, updates);

      return NextResponse.json({
        transcript,
        nextQuestion,
        questionIndex: nextIndex,
        totalQuestions,
        isFollowUp: false,
      });
    };

    if (isFollowUp) {
      // Follow-up answer — update existing answer record
      await updateAnswerRecord(sessionId, idx, {
        followUpTranscript: transcript,
        followUpAudioDuration: duration,
        ...(blData.eyeContactPercent !== null ? { eyeContactPercent: blData.eyeContactPercent } : {}),
        ...(blData.movementScore !== null ? { movementScore: blData.movementScore } : {}),
        ...(blTally ? { followUpBodyLanguage: blTally } : {}),
      } as any);
      return advance(questionText);
    }

    const detail = session.questionDetails?.[idx];
    const style = resolveFollowUpStyle(effectiveTrack, detail);

    let followUpQuestion: string | null = null;
    if (style) {
      // Mock interviews also give the interviewer the CV and JD so it can verify claims
      const result = await generateFollowUp(effectiveTrack, questionText, transcript, {
        detail,
        history: await loadHistory(),
        ...(effectiveTrack === "mock-interview"
          ? { resumeText: session.resumeText, jobDescription: session.jobDescription }
          : {}),
      });
      if (result.followUpQuestion) {
        followUpQuestion = result.followUpQuestion;
      } else {
        // Keep the conversation moving rather than stopping the session on an LLM hiccup
        console.warn("[Answer API] Follow-up generation failed, moving on:", result.error);
      }
    }

    await createAnswerRecord({
      sessionId,
      questionIndex: idx,
      questionText,
      answerTranscript: transcript,
      audioDuration: duration,
      ...(followUpQuestion ? { followUpText: followUpQuestion } : {}),
      ...blData,
      bodyLanguage: blTally as unknown as Record<string, unknown> | null,
    });

    if (!followUpQuestion) return advance(questionText);

    await updateInterviewSession(sessionId, { awaitingFollowUp: true });

    return NextResponse.json({
      transcript,
      followUpQuestion,
      questionIndex: idx,
      totalQuestions,
      isFollowUp: true,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[/api/interview/answer] Error:", error);
    return NextResponse.json(
      { error: `Failed to process answer: ${errMsg}` },
      { status: 500 }
    );
  }
}
