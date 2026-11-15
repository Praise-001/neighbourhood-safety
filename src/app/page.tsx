import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-border/40 bg-gradient-to-b from-card/50 via-background to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Live Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-yellow/15 text-yellow border border-yellow/30 shadow-sm animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-yellow animate-ping" />
            <span>Live Community Incident Grid · Manchester Demo Active</span>
          </div>

          {/* Headline */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
              Safe communities,{" "}
              <span className="text-yellow underline decoration-yellow/30 underline-offset-8">
                built together.
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
              Report hazards in under a minute without an account. Explore community reports on a live interactive map, and receive instant perimeter alerts before danger reaches your street.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
            <Link
              href="/report"
              className="px-6 py-3.5 rounded-xl bg-yellow text-slate-950 font-bold hover:bg-yellow-hover transition-all shadow-md hover:shadow-lg text-sm sm:text-base flex items-center gap-2 group"
            >
              <span>+ Report an Incident</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>

            <Link
              href="/map"
              className="px-6 py-3.5 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted transition-all shadow-sm text-sm sm:text-base flex items-center gap-2"
            >
              <span>🗺️ Explore Live Map</span>
            </Link>

            <Link
              href="/status"
              className="px-5 py-3.5 rounded-xl border border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-sm font-medium"
            >
              Check Code Status
            </Link>
          </div>

          {/* Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-8 border-t border-border/60">
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs text-left">
              <span className="text-2xl font-black text-foreground">30+</span>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                Active Local Incidents
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs text-left">
              <span className="text-2xl font-black text-yellow">&lt; 60s</span>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                Fast Reporting Flow
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs text-left">
              <span className="text-2xl font-black text-foreground">100%</span>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                Privacy Stripping & Rounding
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs text-left">
              <span className="text-2xl font-black text-yellow">0 Cost</span>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                Open Academic Prototype
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Category Explorer */}
      <section className="py-12 border-b border-border/40 bg-card/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Incident Categories
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Click any category to explore related incidents on the live map.
              </p>
            </div>
            <Link
              href="/map"
              className="text-xs font-bold text-yellow hover:underline flex items-center gap-1"
            >
              View all on map →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/map?category=${cat.value}`}
                className="p-3.5 rounded-xl border border-border bg-card hover:border-yellow/60 hover:bg-muted/40 transition-all text-left flex flex-col justify-between group shadow-2xs hover:shadow-sm"
              >
                <div className="text-2xl group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-foreground block leading-tight">
                    {cat.label.split("/")[0].trim()}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    {cat.sensitive ? "🛡️ Privacy protected" : `Expires in ${cat.defaultExpiryDays}d`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Engineered for Privacy, Speed, and Community Action
            </h2>
            <p className="text-sm text-muted-foreground">
              Every detail is designed to maximize neighbourhood safety while keeping reporter identity strictly protected.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-3 hover:border-yellow/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-yellow/20 text-yellow text-xl flex items-center justify-center font-bold">
                🗺️
              </div>
              <h3 className="text-base font-bold text-foreground">
                Live Interactive Map & Clustering
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                MapLibre GL map powered by OpenStreetMap. Incidents group into dynamic clusters with color-coded severity markers, time range filters, and a distance-aware feed list.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-3 hover:border-yellow/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-yellow/20 text-yellow text-xl flex items-center justify-center font-bold">
                🔔
              </div>
              <h3 className="text-base font-bold text-foreground">
                Instant Realtime Perimeter Alerts
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Set a home pin and pick a 500 m, 1 km, or 5 km radius. New incidents within your perimeter trigger instant in-app notification banners via Supabase Realtime.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-3 hover:border-yellow/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-yellow/20 text-yellow text-xl flex items-center justify-center font-bold">
                🛡️
              </div>
              <h3 className="text-base font-bold text-foreground">
                Strict Privacy by Design
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Sensitive reports automatically round public coordinates to ~1.1 km to obscure exact house numbers. Attached photos have GPS and EXIF data stripped in your browser.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
