import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy — Parrot" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 2, 2026">
      <p>
        Parrot helps you practice interviews and speaking out loud. This page explains what we collect, why, who
        processes it, how long we keep it, and how you can delete it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your sign-in:</strong> you sign in with Google. We receive your name, email address and profile
          picture to show you who&apos;s signed in, and we store only Google&apos;s account id to link your practice
          sessions to you.
        </li>
        <li>
          <strong>What you give us to set up a practice:</strong> for mock interviews, the job description and the
          résumé text you upload or paste.
        </li>
        <li>
          <strong>Your answers as text:</strong> transcripts of what you said, the questions you were asked, and the
          feedback report Tota writes.
        </li>
        <li>
          <strong>Body-language summary (only if you turn on your camera):</strong> counts such as how often you looked
          at the camera or changed posture. Your video is analysed on your own device and is never uploaded or stored.
        </li>
      </ul>

      <h2>Your voice recordings</h2>
      <p>
        When you answer, your recording is sent to our server only so it can be turned into text, and then it is
        discarded. We do not store your audio. If your browser offers built-in speech recognition (for example
        Chrome), your browser may send audio to its own provider (such as Google) to produce live captions.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To run your practice: generating questions, follow-ups and your feedback report.</li>
        <li>To show you your past practice sessions.</li>
        <li>To keep the service safe and fair, for example limiting how many sessions one account can start.</li>
      </ul>
      <p>We do not sell your data, and we do not use it for advertising.</p>

      <h2>Who processes your data</h2>
      <p>We use these service providers to run Parrot. Each only receives what it needs for its job:</p>
      <ul>
        <li><strong>Google</strong>: signing you in.</li>
        <li><strong>Vercel</strong>: hosting the website and its servers.</li>
        <li><strong>MongoDB Atlas</strong> (stored in Mumbai, India): your sessions, transcripts and reports.</li>
        <li><strong>Groq</strong>: the AI that writes questions, follow-ups and feedback from your text.</li>
        <li><strong>Deepgram</strong>: turning recordings into text when live captions aren&apos;t available.</li>
        <li><strong>Upstash</strong>: counting requests per account for rate limiting.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Practice sessions, transcripts and reports are deleted automatically 90 days after they are created. We keep
        no separate account record.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>
          <strong>Delete your practice data</strong> at any time from{" "}
          <Link href="/account" className="text-moss underline underline-offset-2">My interviews</Link> → Delete my data.
        </li>
        <li>
          <strong>Disconnect Parrot from Google</strong> any time in your Google Account → Security → Third-party
          apps and services.
        </li>
        <li>You can also ask us for a copy of your data or to correct it.</li>
      </ul>

      <h2>Children</h2>
      <p>Parrot is not meant for children under 13, and we don&apos;t knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way, we&apos;ll update the date above and tell signed-in users.</p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Reach the Parrot team through the{" "}
        <Link href="/creators" className="text-moss underline underline-offset-2">Creators</Link> page.
      </p>
    </LegalPage>
  );
}
