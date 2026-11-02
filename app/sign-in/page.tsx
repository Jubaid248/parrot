"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import ParrotLogo from "@/components/ParrotLogo";

function SignInCard() {
  const params = useSearchParams();
  // Only return to paths on this site
  const raw = params.get("callbackUrl") || "/mock-interview";
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/mock-interview";
  const failed = Boolean(params.get("error"));

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6 rounded-3xl border border-line bg-white p-8 text-center shadow-sm">
      <ParrotLogo className="mx-auto h-14 w-14" />
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-ink">Sign in to practice</h1>
        <p className="text-sm text-stone-muted">Your sessions and reports stay private to your account.</p>
      </div>
      {failed && (
        <p role="alert" className="rounded-xl border border-beak/30 bg-beak-soft px-3 py-2 text-sm text-ink">
          Sign-in didn&apos;t work. Try again.
        </p>
      )}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-cream"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.54 0 9.2-3.9 9.2-9.38 0-.63-.07-1.11-.15-1.6H12z" />
        </svg>
        Continue with Google
      </button>
      <p className="text-xs text-stone-muted">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">Privacy Policy</Link>.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="px-4 pb-16">
      <Suspense>
        <SignInCard />
      </Suspense>
    </div>
  );
}
