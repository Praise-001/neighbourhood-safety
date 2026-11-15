"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, CATEGORIES, SEVERITIES } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

interface AdminTicket extends Ticket {
  ticket_private?: {
    exact_lat: number;
    exact_lng: number;
    reporter_email: string | null;
    reporter_email_hash: string | null;
  } | null;
}

export default function AdminPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      setAuthChecking(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAdmin(false);
        setAuthChecking(false);
        return;
      }

      setSessionToken(session.access_token);

      // Verify admin role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, banned")
        .eq("id", session.user.id)
        .single();

      if (profile && profile.role === "admin" && !profile.banned) {
        setIsAdmin(true);
        fetchReports(session.access_token);
      } else {
        setIsAdmin(false);
      }
      setAuthChecking(false);
    };

    initAuth();
  }, []);

  const fetchReports = async (token?: string) => {
    const activeToken = token || sessionToken;
    if (!activeToken) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/reports", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load moderation reports");
        return;
      }

      setTickets(data.tickets || []);
    } catch {
      setError("Network error fetching moderation reports");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "restore" | "remove" | "ban", ticket: AdminTicket) => {
    if (!sessionToken) return;

    setActionInProgress(ticket.id);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action,
          ticket_id: ticket.id,
          reporter_id: ticket.ticket_private?.reporter_email ? undefined : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to ${action} report.`);
        return;
      }

      setMessage(`Success: ${data.message || `Action ${action} completed.`}`);
      fetchReports();
    } catch {
      setError(`Network error executing ${action}.`);
    } finally {
      setActionInProgress(null);
    }
  };

  if (authChecking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-yellow/20 border-t-yellow rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl font-bold shadow-xs">
          🔒
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Administrator Access Required
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          The moderation queue and admin controls are restricted to authorized accounts. Sign in with an administrator email to continue.
        </p>
        <div className="pt-2 flex gap-3">
          <Link
            href="/auth"
            className="px-5 py-2.5 rounded-lg bg-yellow text-slate-950 font-bold text-xs sm:text-sm hover:bg-yellow-hover transition-all shadow-sm"
          >
            Sign In with Magic Link
          </Link>
          <Link
            href="/map"
            className="px-5 py-2.5 rounded-lg border border-border bg-card hover:bg-muted text-xs sm:text-sm font-semibold transition-colors"
          >
            Back to Map
          </Link>
        </div>
      </div>
    );
  }

  const flaggedCount = tickets.filter((t) => t.flag_count > 0).length;
  const hiddenCount = tickets.filter((t) => t.hidden).length;

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Moderation & Trust Administration
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Review community flagged reports, auto-hidden content, and manage user bans.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReports()}
          disabled={loading}
          className="px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-sm"
        >
          {loading ? "Refreshing..." : "↻ Refresh Queue"}
        </button>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Reports Under Review
          </span>
          <div className="text-2xl font-black text-foreground mt-1">{tickets.length}</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-yellow uppercase tracking-wider">
            Flagged by Community
          </span>
          <div className="text-2xl font-black text-yellow mt-1">{flaggedCount}</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
            Auto-Hidden (&ge;3 Flags)
          </span>
          <div className="text-2xl font-black text-red-500 mt-1">{hiddenCount}</div>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 text-xs font-semibold">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Reports Table / Card List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
          <h2 className="text-sm font-bold text-foreground">Flagged & Hidden Incident Queue</h2>
          <span className="text-xs text-muted-foreground">Threshold: Auto-hides at 3 flags</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Loading moderation queue...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm space-y-2">
            <span className="text-3xl block">🛡️</span>
            <p className="font-semibold text-foreground">Moderation Queue Clear</p>
            <p className="text-xs">No reports currently flagged or hidden.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((t) => {
              const cat = CATEGORIES.find((c) => c.value === t.category);
              const sev = SEVERITIES.find((s) => s.value === t.severity);
              const isWorking = actionInProgress === t.id;

              return (
                <div key={t.id} className="p-5 sm:p-6 space-y-4 hover:bg-muted/10 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{cat?.icon || "⚠️"}</span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-yellow">
                            {t.reference_code}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sev?.color}`}>
                            {sev?.label}
                          </span>
                          {t.hidden ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white">
                              Hidden from Public
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                              Active on Map
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                            Flags: {t.flag_count}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-foreground mt-1">{t.title}</h3>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleAction("restore", t)}
                        disabled={isWorking}
                        className="px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-xs font-bold transition-colors shadow-sm"
                      >
                        Restore Report
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction("remove", t)}
                        disabled={isWorking}
                        className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-xs font-bold transition-colors shadow-sm"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction("ban", t)}
                        disabled={isWorking}
                        className="px-3 py-1.5 rounded-md border border-red-500 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-50 text-xs font-bold transition-colors"
                      >
                        Ban Reporter
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-foreground bg-muted/40 p-3 rounded-md leading-relaxed whitespace-pre-wrap">
                    {t.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <div>
                      <span>Location: </span>
                      <strong className="text-foreground">
                        {t.location_name || `${t.public_lat}, ${t.public_lng}`}
                      </strong>
                    </div>
                    <div>
                      <span>Reporter Email: </span>
                      <strong className="text-foreground">
                        {t.ticket_private?.reporter_email || "Anonymous (No email)"}
                      </strong>
                    </div>
                    <div>
                      <span>Reported At: </span>
                      <strong className="text-foreground">
                        {new Date(t.created_at).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2 text-center">
        <Link
          href="/map"
          className="text-xs text-yellow font-semibold hover:underline"
        >
          ← Return to Live Map
        </Link>
      </div>
    </div>
  );
}
