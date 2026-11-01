import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Use — Parrot" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="November 2, 2026">
      <p>By creating an account or using Parrot, you agree to these terms.</p>

      <h2>What Parrot is</h2>
      <p>
        Parrot is a practice tool. Tota, our AI interviewer, gives feedback that is generated automatically and can be
        wrong. Scores such as IELTS band estimates are for practice only and are not official results. Parrot does not
        guarantee any job offer, exam score or other outcome.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You need an account to practice. Keep your sign-in details secure.</li>
        <li>You must be at least 13 years old to use Parrot.</li>
        <li>You&apos;re responsible for what you upload, such as your résumé.</li>
      </ul>

      <h2>Fair use</h2>
      <p>To keep Parrot available for everyone, you agree not to:</p>
      <ul>
        <li>use bots or scripts to start sessions or send answers,</li>
        <li>try to get around usage limits, or access other people&apos;s sessions,</li>
        <li>upload anything illegal, harmful, or that you don&apos;t have the right to share,</li>
        <li>use Parrot to cheat in a real exam or interview.</li>
      </ul>
      <p>We may limit or suspend accounts that break these rules.</p>

      <h2>Your content</h2>
      <p>
        You own what you upload and say. You let us process it only to run the service, as described in our{" "}
        <Link href="/privacy" className="text-moss underline underline-offset-2">Privacy Policy</Link>.
      </p>

      <h2>Availability</h2>
      <p>
        Parrot is provided &quot;as is&quot;. We work to keep it running, but it may sometimes be unavailable, and
        features may change. To the extent the law allows, we aren&apos;t liable for indirect losses from using it.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If the changes matter, we&apos;ll update the date above and tell signed-in users.</p>
    </LegalPage>
  );
}
