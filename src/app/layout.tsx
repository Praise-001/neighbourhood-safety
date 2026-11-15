import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { RealtimeAlertsProvider } from "@/components/realtime-alerts-provider";
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
  title: "Neighbourhood Safety | Community Incident Reporting & Realtime Map",
  description:
    "Report safety incidents in seconds, explore verified community reports on a live map, and get instant radius alerts before danger reaches your street.",
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-yellow selection:text-slate-950`}
      >
        <DisclaimerBanner />

        {/* Global Navigation Header */}
        <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold text-lg text-foreground group transition-all"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-yellow shadow-md border border-yellow/30 group-hover:scale-105 transition-transform">
                <svg
                  className="w-5 h-5 text-yellow"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 8v4m0 4h.01"
                  />
                </svg>
              </span>
              <div className="flex flex-col">
                <span className="tracking-tight text-base sm:text-lg font-black leading-none text-foreground">
                  Neighbourhood<span className="text-yellow">Safety</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-0.5">
                  Community Network
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/map"
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <span>🗺️</span>
                <span className="hidden sm:inline">Live Map</span>
              </Link>
              <Link
                href="/alerts"
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <span>🔔</span>
                <span className="hidden sm:inline">Alerts</span>
              </Link>
              <Link
                href="/status"
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <span>🔍</span>
                <span className="hidden sm:inline">Lookup</span>
              </Link>
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors hidden md:flex items-center gap-1.5"
              >
                <span>🛡️</span>
                <span>Moderation</span>
              </Link>

              <div className="h-4 w-px bg-border mx-1" />

              <Link
                href="/report"
                className="px-3.5 py-1.5 rounded-lg bg-yellow text-slate-950 font-bold text-xs sm:text-sm hover:bg-yellow-hover transition-all shadow-sm flex items-center gap-1.5 hover:shadow-md"
              >
                <span>+</span>
                <span>Report</span>
              </Link>

              <ThemeToggle />
            </nav>
          </div>
        </header>

        {/* Realtime Alert Provider & Page Children */}
        <RealtimeAlertsProvider>
          <main className="flex-1 flex flex-col">{children}</main>
        </RealtimeAlertsProvider>

        {/* Polished Footer */}
        <footer className="border-t border-border bg-card/60 backdrop-blur py-8 text-xs text-muted-foreground mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">NeighbourhoodSafety</span>
              <span>·</span>
              <span>Academic Prototype</span>
              <span>·</span>
              <span className="text-yellow">Synthetic Data Only</span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <Link href="/map" className="hover:text-foreground transition-colors">
                Map View
              </Link>
              <Link href="/alerts" className="hover:text-foreground transition-colors">
                Perimeter Alerts
              </Link>
              <Link href="/status" className="hover:text-foreground transition-colors">
                Status Lookup
              </Link>
              <Link href="/admin" className="hover:text-foreground transition-colors">
                Admin Queue
              </Link>
              <Link href="/auth" className="hover:text-foreground transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
