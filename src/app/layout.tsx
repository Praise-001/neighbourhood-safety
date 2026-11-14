import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Neighbourhood Safety | Community Incident Reporting",
  description:
    "Report incidents quickly, view local community alerts on an interactive map, and stay informed.",
};

const themeScript = `
  (function() {
    try {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (_) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-yellow selection:text-navy`}
      >
        <DisclaimerBanner />
        <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-yellow font-black border border-yellow/30 text-base shadow-sm">
                !
              </span>
              <span className="tracking-tight">
                Neighbourhood<span className="text-yellow font-extrabold">Safety</span>
              </span>
            </Link>

            <nav className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/report"
                className="text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-md bg-yellow text-slate-950 hover:bg-yellow-hover transition-colors shadow-sm"
              >
                + Report Incident
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>

        <footer className="border-t border-border bg-card py-6 text-center text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto px-4">
            Neighbourhood Safety Academic Prototype · Zero-cost architecture · Synthetic data only
          </div>
        </footer>
      </body>
    </html>
  );
}
