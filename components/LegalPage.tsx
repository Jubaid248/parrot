import type { ReactNode } from "react";

/** Shared layout for the Privacy and Terms pages. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl text-ink">{title}</h1>
      <p className="mt-2 text-sm text-stone-muted">Last updated {updated}</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink/90 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
