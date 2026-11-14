import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-center">
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-light text-yellow-900 border border-yellow/30">
          <span className="w-2 h-2 rounded-full bg-yellow" />
          Real-time Community Alerts
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
          Safe neighbourhoods,{" "}
          <span className="text-yellow">built together.</span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Report safety incidents in under a minute, track verified updates in real-time,
          and receive instant local alerts when something happens near your home.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/report"
            className="px-6 py-3 rounded-lg bg-yellow text-slate-950 font-bold hover:bg-yellow-hover shadow-md transition-all text-sm sm:text-base"
          >
            Report an Incident
          </Link>
          <Link
            href="/map"
            className="px-6 py-3 rounded-lg border border-border bg-card text-foreground font-semibold hover:bg-muted shadow-sm transition-all text-sm sm:text-base"
          >
            Explore Live Map
          </Link>
        </div>

        <div className="pt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="text-yellow">✓</span> Anonymous toggle
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-yellow">✓</span> No account required
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-yellow">✓</span> Zero card / free tier
          </div>
        </div>
      </div>
    </div>
  );
}
