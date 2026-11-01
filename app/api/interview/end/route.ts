/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import {
  updateInterviewSession,
  getAnswersForSession,
} from "@/lib/store";
import { generateFeedbackReport } from "@/lib/ai/llm";
import { requireUser, requireOwnedSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

// AI calls can be slow; give Vercel functions up to 60s instead of the default
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;
    const limited = await rateLimit(user.value, "end");
    if (limited) return limited;

    const { sessionId, track = "mock-interview" } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required." },
        { status: 400 }
      );
    }

    const owned = await requireOwnedSession(sessionId, user.value);
    if (!owned.ok) return owned.response;
    const session = owned.value;

    const answers = await getAnswersForSession(sessionId);
    if (answers.length === 0) {
      return NextResponse.json(
        { error: "No answers found for this session." },
        { status: 400 }
      );
    }

    // Call generateFeedbackReport which calculates metrics, calls Groq LLM, merges, and saves to Mongo
    const effectiveTrack = session.track || track || "mock-interview";
    const report = await generateFeedbackReport(effectiveTrack, {
      sessionId: session.sessionId,
      jobDescription: session.jobDescription,
      resumeText: session.resumeText,
      answers,
    });

    await updateInterviewSession(sessionId, { status: "completed" });

    return NextResponse.json({
      sessionId,
      report,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[/api/interview/end] Error:", error);
    return NextResponse.json(
      { error: `Failed to generate feedback report: ${errMsg}` },
      { status: 500 }
    );
  }
}
