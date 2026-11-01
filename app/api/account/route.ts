import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { deleteUserData, listSessionsForUser } from "@/lib/store";

/** The signed-in user's practice sessions, newest first. */
export async function GET() {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;
    const sessions = await listSessionsForUser(user.value);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[/api/account GET] Error:", error);
    return NextResponse.json({ error: "Couldn't load your interviews." }, { status: 500 });
  }
}

/** Permanently deletes all of the user's sessions, answers and reports. */
export async function DELETE() {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;
    const deleted = await deleteUserData(user.value);
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[/api/account DELETE] Error:", error);
    return NextResponse.json({ error: "Couldn't delete your data. Try again." }, { status: 500 });
  }
}
