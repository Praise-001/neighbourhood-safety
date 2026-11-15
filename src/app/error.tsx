"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled runtime error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950 text-red-600 text-2xl flex items-center justify-center font-bold">
        ⚠️
      </div>
      <h2 className="text-xl font-extrabold text-foreground">Something went wrong</h2>
      <p className="text-xs text-muted-foreground max-w-sm">
        An unexpected error occurred while loading this page. Please try again.
      </p>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-yellow text-slate-950 font-bold text-xs hover:bg-yellow-hover transition-colors shadow-sm"
        >
          Try Again
        </button>
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
