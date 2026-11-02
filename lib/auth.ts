/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getInterviewSession } from "./store";

type Guard<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

/** The signed-in user's id, or a 401 response for API routes to return. */
export async function requireUser(): Promise<Guard<string>> {
  const userId = (await auth())?.user?.id;
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Please sign in to continue." }, { status: 401 }),
    };
  }
  return { ok: true, value: userId };
}

/**
 * Loads a session only if it belongs to this user. Someone else's session looks
 * exactly like a missing one, so session ids can't be probed.
 */
export async function requireOwnedSession(sessionId: string, userId: string): Promise<Guard<any>> {
  const session = sessionId ? await getInterviewSession(sessionId) : null;
  if (!session || session.userId !== userId) {
    return { ok: false, response: NextResponse.json({ error: "Session not found." }, { status: 404 }) };
  }
  return { ok: true, value: session };
}
