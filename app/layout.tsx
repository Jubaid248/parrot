import type { Metadata } from "next";
import Link from "next/link";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import SiteNav from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Parrot — AI Interview Prep",
  description:
    "Ace your next job interview with real-time AI feedback on your spoken answers and body language.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased text-ink bg-cream min-h-screen relative selection:bg-moss/20 selection:text-moss-deep">
        <SessionProvider>
          {/* Floating Nav */}
          <SiteNav />

          {/* Main Content */}
          <main className="relative z-10">
            {children}
          </main>

          <footer className="relative z-10 mx-auto max-w-6xl px-4 py-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-stone-muted">
            <span>© {new Date().getFullYear()} Parrot</span>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
