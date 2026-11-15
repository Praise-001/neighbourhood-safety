import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-yellow/20 text-yellow text-3xl flex items-center justify-center font-bold">
        404
      </div>
      <h1 className="text-2xl font-extrabold text-foreground">Page Not Found</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        The safety report or page you are looking for does not exist or has expired.
      </p>
      <div className="pt-2 flex gap-3">
        <Link
          href="/map"
          className="px-4 py-2 rounded-lg bg-yellow text-slate-950 font-bold text-xs hover:bg-yellow-hover transition-colors shadow-sm"
        >
          Explore Live Map
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border border-border bg-card text-foreground font-semibold text-xs hover:bg-muted transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
