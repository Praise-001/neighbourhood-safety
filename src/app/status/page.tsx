"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Ticket, CATEGORIES, SEVERITIES } from "@/lib/types";

function StatusContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [code, setCode] = useState(initialCode);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const fetchTicket = async (codeToFetch: string) => {
    const cleanCode = codeToFetch.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/tickets?code=${encodeURIComponent(cleanCode)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Report not found with this reference code.");
        setTicket(null);
        return;
      }

      setTicket(data.ticket);
    } catch {
      setError("Failed to fetch report status. Please check your connection.");
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchTicket(initialCode);
    }
  }, [initialCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTicket(code);
  };

  const catConfig = ticket ? CATEGORIES.find((c) => c.value === ticket.category) : null;
  const sevConfig = ticket ? SEVERITIES.find((s) => s.value === ticket.severity) : null;

  return (
    <div className="max-w-2xl w-full mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Incident Status Lookup
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your reference code to view the live status and verified community updates.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. MCR-8101"
          maxLength={15}
          className="flex-1 px-4 py-3 text-base sm:text-lg font-mono tracking-wider rounded-lg border border-border bg-card text-foreground uppercase placeholder:normal-case placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-6 py-3 rounded-lg bg-yellow text-slate-950 font-bold hover:bg-yellow-hover disabled:opacity-50 transition-colors shadow-md text-sm sm:text-base"
        >
          {loading ? "Searching..." : "Lookup"}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}

      {ticket && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{catConfig?.icon || "⚠️"}</span>
              <div>
                <span className="text-xs font-mono font-bold text-yellow">
                  {ticket.reference_code}
                </span>
                <h2 className="text-lg font-bold text-foreground">{ticket.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-bold ${sevConfig?.color}`}>
                {sevConfig?.label} Severity
              </span>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                  ticket.status === "resolved"
                    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                    : ticket.status === "investigating"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300"
                }`}
              >
                {ticket.status}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <p className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div>
                <span className="text-muted-foreground">Location: </span>
                <span className="font-medium text-foreground">
                  {ticket.location_name || `${ticket.public_lat}, ${ticket.public_lng}`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Reported: </span>
                <span className="font-medium text-foreground">
                  {new Date(ticket.incident_time).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Community confirmations: </span>
                <span className="font-bold text-foreground">
                  {ticket.confirmation_count} neighbours
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Anonymous: </span>
                <span className="font-medium text-foreground">
                  {ticket.is_anonymous ? "Yes (Protected)" : "No"}
                </span>
              </div>
            </div>
          </div>

          {ticket.photo_url && (
            <div className="pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Attached Photo
              </h3>
              <div className="rounded-lg overflow-hidden border border-border max-h-72 w-full bg-black/10">
                <img
                  src={ticket.photo_url}
                  alt={ticket.title}
                  className="w-full h-auto max-h-72 object-contain"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-between items-center">
            <Link
              href={`/tickets/${ticket.id}`}
              className="text-xs sm:text-sm font-semibold text-yellow hover:underline flex items-center gap-1"
            >
              Open Full Detail & Discussion Page →
            </Link>
            <Link
              href="/map"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View on Map
            </Link>
          </div>
        </div>
      )}

      {searched && !loading && !ticket && !error && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No report found with code <strong>{code}</strong>.
        </div>
      )}
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading status page...</div>}>
      <StatusContent />
    </Suspense>
  );
}
