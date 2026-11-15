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
    <div className="max-w-2xl w-full mx-auto px-4 py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          Incident Status Lookup
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Enter your 8-character reference code (e.g. <strong>MCR-8101</strong>) to view status and updates.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 bg-card p-2 rounded-2xl border border-border shadow-sm">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. MCR-8101"
          maxLength={15}
          className="flex-1 px-4 py-3 text-base sm:text-lg font-mono tracking-wider bg-transparent text-foreground uppercase placeholder:normal-case placeholder:font-sans placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-6 py-3 rounded-xl bg-yellow text-slate-950 font-bold hover:bg-yellow-hover disabled:opacity-50 transition-colors shadow-sm text-sm sm:text-base whitespace-nowrap"
        >
          {loading ? "Searching..." : "Lookup"}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-100 border border-red-300 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-200 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {ticket && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-5 shadow-md animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{catConfig?.icon || "⚠️"}</span>
              <div>
                <span className="text-xs font-mono font-bold text-yellow bg-navy px-2 py-0.5 rounded">
                  {ticket.reference_code}
                </span>
                <h2 className="text-lg font-bold text-foreground mt-1">{ticket.title}</h2>
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <p className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap bg-background p-3.5 rounded-xl border border-border">
                {ticket.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div>
                <span className="text-muted-foreground">Location: </span>
                <span className="font-semibold text-foreground">
                  {ticket.location_name || `${ticket.public_lat}, ${ticket.public_lng}`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Reported: </span>
                <span className="font-semibold text-foreground">
                  {new Date(ticket.incident_time).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Confirmations: </span>
                <span className="font-bold text-yellow">
                  👍 {ticket.confirmation_count} neighbours
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Identity: </span>
                <span className="font-semibold text-foreground">
                  {ticket.is_anonymous ? "Anonymous (Protected)" : "Verified Resident"}
                </span>
              </div>
            </div>
          </div>

          {ticket.photo_url && (
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Attached Photo Evidence
              </h3>
              <div className="rounded-xl overflow-hidden border border-border max-h-72 w-full bg-black/10">
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
              className="text-xs sm:text-sm font-bold text-yellow hover:underline flex items-center gap-1"
            >
              Open Full Detail & Discussion Dossier →
            </Link>
            <Link
              href="/map"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View on Live Map
            </Link>
          </div>
        </div>
      )}

      {searched && !loading && !ticket && !error && (
        <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-2xl border border-border p-6 space-y-2">
          <p className="font-bold text-foreground">No incident found with code &quot;{code}&quot;.</p>
          <p className="text-xs">Please double check your reference code or search another incident.</p>
        </div>
      )}
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground text-xs">Loading status lookup...</div>}>
      <StatusContent />
    </Suspense>
  );
}
