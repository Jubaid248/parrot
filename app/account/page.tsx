"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { friendlyError, requestErrorFrom } from "@/lib/friendlyError";

const TRACK_TITLES: Record<string, string> = {
  "mock-interview": "Mock interview",
  "ielts-speaking": "IELTS Speaking",
  "communication-builder": "Communication practice",
  "debate-practice": "Debate practice",
  "negotiation-practice": "Negotiation practice",
};

interface SessionRow {
  sessionId: string;
  track: string;
  status: "in_progress" | "completed";
  questionCount: number;
  createdAt: string;
}

export default function AccountPage() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletedNote, setDeletedNote] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/account", { cache: "no-store" });
      if (!res.ok) throw await requestErrorFrom(res);
      setSessions((await res.json()).sessions);
    } catch (err) {
      setError(friendlyError("load-session", err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw await requestErrorFrom(res);
      const { deleted } = await res.json();
      localStorage.removeItem("sessionHistory");
      localStorage.removeItem("currentSessionId");
      setSessions([]);
      setDeletedNote(`Deleted ${deleted} practice session${deleted === 1 ? "" : "s"} and all their answers and reports.`);
    } catch (err) {
      setError(friendlyError("load-session", err));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-2">
        <h1 className="font-serif text-4xl text-ink">My interviews</h1>
        <p className="text-sm text-stone-muted">
          Your practice sessions from the last 90 days. Older ones are deleted automatically.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-beak/30 bg-beak-soft px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-3xl border border-line bg-white">
        {sessions === null && !error && <p className="p-6 text-sm text-stone-muted">Loading…</p>}

        {sessions?.length === 0 && (
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-stone-muted">{deletedNote || "No practice sessions yet."}</p>
            <Link
              href="/mock-interview"
              className="inline-block rounded-xl bg-moss px-5 py-2.5 text-sm font-semibold text-cream hover:bg-moss-deep"
            >
              Start practicing
            </Link>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <ul className="divide-y divide-line">
            {sessions.map((s) => {
              const done = s.status === "completed";
              return (
                <li key={s.sessionId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{TRACK_TITLES[s.track] || "Practice"}</p>
                    <p className="text-xs text-stone-muted">
                      {new Date(s.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {s.questionCount} questions
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        done ? "border-moss-light/30 bg-moss-light/15 text-moss" : "border-line bg-cream text-stone-muted"
                      }`}
                    >
                      {done ? "Completed" : "In progress"}
                    </span>
                    <Link
                      href={done ? `/report/${s.sessionId}` : `/interview/${s.sessionId}`}
                      className="rounded-xl border border-line bg-white px-3 py-1.5 text-sm text-ink hover:bg-cream"
                    >
                      {done ? "View report" : "Continue"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-3xl border border-line bg-paper p-6">
        <h2 className="font-semibold text-ink">Delete my data</h2>
        <p className="text-sm text-stone-muted">
          Permanently deletes all your practice sessions, transcripts and reports. This can&apos;t be undone. Parrot
          keeps nothing else about you, and your Google account isn&apos;t affected.
        </p>
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-beak px-4 py-2 text-sm font-semibold text-white hover:bg-beak-deep disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm text-ink hover:bg-cream"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-xl border border-beak/40 bg-white px-4 py-2 text-sm font-semibold text-beak-deep hover:bg-beak-soft"
          >
            Delete my data
          </button>
        )}
      </section>
    </div>
  );
}
