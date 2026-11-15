"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import { Ticket, TicketUpdate, Comment, CATEGORIES, SEVERITIES } from "@/lib/types";
import { OSM_RASTER_STYLE } from "@/lib/map-style";
import { getOrCreateClientToken } from "@/lib/client-token";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TicketDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [updates, setUpdates] = useState<TicketUpdate[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User action states
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [hasFlagged, setHasFlagged] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("false_report");

  // Comment input
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Mini map
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Fetch ticket details
  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getOrCreateClientToken();

      const res = await fetch(`/api/tickets/${id}?client_token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Incident report not found.");
        return;
      }

      setTicket(data.ticket);
      setUpdates(data.updates || []);
      setComments(data.comments || []);
      setHasConfirmed(data.hasConfirmed);
      setHasFlagged(data.hasFlagged);
      setConfirmCount(data.ticket.confirmation_count);
    } catch {
      setError("Network error fetching report details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Initialize mini map once ticket is loaded
  useEffect(() => {
    if (!ticket || !mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_RASTER_STYLE,
      center: [ticket.public_lng, ticket.public_lat],
      zoom: 14,
      interactive: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    new maplibregl.Marker({ color: "#f59e0b" })
      .setLngLat([ticket.public_lng, ticket.public_lat])
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [ticket]);

  // Handle "I see this too" button (atomic confirmation)
  const handleConfirm = async () => {
    if (hasConfirmed || confirming) return;
    setConfirming(true);

    try {
      const token = getOrCreateClientToken();
      const res = await fetch(`/api/tickets/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_token: token }),
      });

      const data = await res.json();
      if (res.ok) {
        setHasConfirmed(true);
        setConfirmCount(data.confirmation_count);
      }
    } catch {
      console.error("Failed to confirm incident");
    } finally {
      setConfirming(false);
    }
  };

  // Handle Flag as false (S5-01)
  const handleFlag = async () => {
    if (hasFlagged || flagging) return;
    setFlagging(true);

    try {
      const token = getOrCreateClientToken();
      const res = await fetch(`/api/tickets/${id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_token: token, reason: flagReason }),
      });

      if (res.ok) {
        setHasFlagged(true);
        setShowFlagModal(false);
        const data = await res.json();
        if (data.hidden) {
          setError("This report has received multiple community flags and is now under review.");
        }
      }
    } catch {
      console.error("Failed to flag report");
    } finally {
      setFlagging(false);
    }
  };

  // Handle comment submit
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const res = await fetch(`/api/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: commentName.trim() || undefined,
          content: commentText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.error || "Failed to post comment.");
        return;
      }

      setComments((prev) => [...prev, data.comment]);
      setCommentText("");
    } catch {
      setCommentError("Network error posting comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 max-w-4xl mx-auto p-8 text-center text-muted-foreground text-sm">
        Loading incident details...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex-1 max-w-2xl mx-auto p-8 text-center space-y-4">
        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 text-sm">
          ⚠️ {error || "Incident report could not be found."}
        </div>
        <Link
          href="/map"
          className="inline-block px-4 py-2 rounded-lg bg-yellow text-slate-950 font-bold text-xs"
        >
          Return to Live Map
        </Link>
      </div>
    );
  }

  const catConfig = CATEGORIES.find((c) => c.value === ticket.category);
  const sevConfig = SEVERITIES.find((s) => s.value === ticket.severity);

  return (
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/map" className="hover:text-foreground">
          Map
        </Link>
        <span>/</span>
        <span className="font-mono text-yellow font-bold">{ticket.reference_code}</span>
      </div>

      {/* Main Header Card */}
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">{catConfig?.icon || "⚠️"}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-yellow bg-navy px-2 py-0.5 rounded">
                  {ticket.reference_code}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${sevConfig?.color}`}>
                  {sevConfig?.label} Severity
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-muted text-foreground border border-border">
                  {ticket.status}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground mt-1">
                {ticket.title}
              </h1>
            </div>
          </div>

          {/* Action Buttons: Confirm & Flag */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={hasConfirmed || confirming}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
                hasConfirmed
                  ? "bg-green-600 text-white cursor-default"
                  : "bg-yellow text-slate-950 hover:bg-yellow-hover disabled:opacity-50"
              }`}
            >
              <span>{hasConfirmed ? "✓" : "👍"}</span>
              <span>
                {hasConfirmed
                  ? `Confirmed (${confirmCount})`
                  : `I see this too (${confirmCount})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowFlagModal(true)}
              disabled={hasFlagged}
              className={`px-3 py-2 rounded-lg text-xs font-medium border border-border transition-colors ${
                hasFlagged
                  ? "bg-muted text-muted-foreground cursor-default"
                  : "bg-card text-muted-foreground hover:text-red-500 hover:border-red-300"
              }`}
            >
              {hasFlagged ? "Flagged" : "Flag as False"}
            </button>
          </div>
        </div>

        {/* Flag Modal */}
        {showFlagModal && (
          <div className="p-4 rounded-lg bg-muted border border-border space-y-3">
            <h4 className="text-xs font-bold text-foreground">
              Flag Report as False or Inaccurate
            </h4>
            <p className="text-xs text-muted-foreground">
              Community safety reports that receive 3 flags are automatically hidden from the public map for administrator review.
            </p>
            <div className="flex gap-2">
              <select
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="px-2.5 py-1 text-xs rounded border border-border bg-card text-foreground"
              >
                <option value="false_report">False or fabricated report</option>
                <option value="already_resolved">Already resolved</option>
                <option value="duplicate">Duplicate incident</option>
                <option value="spam">Spam or irrelevant</option>
              </select>
              <button
                type="button"
                onClick={handleFlag}
                disabled={flagging}
                className="px-3 py-1 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {flagging ? "Flagging..." : "Confirm Flag"}
              </button>
              <button
                type="button"
                onClick={() => setShowFlagModal(false)}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Incident Description */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Incident Description
          </h2>
          <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>

        {/* Attached Photo */}
        {ticket.photo_url && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Incident Photo
            </h3>
            <div className="rounded-lg overflow-hidden border border-border bg-black/10 max-h-96 w-full">
              <img
                src={ticket.photo_url}
                alt={ticket.title}
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>
          </div>
        )}

        {/* Details Grid & Mini Map */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground">Location: </span>
              <span className="font-semibold text-foreground">
                {ticket.location_name || "Manchester Area"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Incident Time: </span>
              <span className="font-medium text-foreground">
                {new Date(ticket.incident_time).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Reported: </span>
              <span className="font-medium text-foreground">
                {new Date(ticket.created_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Expires: </span>
              <span className="font-medium text-foreground">
                {new Date(ticket.expires_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Reporter Identity: </span>
              <span className="font-medium text-foreground">
                {ticket.is_anonymous ? "Anonymous (Protected)" : "Verified Resident"}
              </span>
            </div>
            {catConfig?.sensitive && (
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
                🛡️ Coordinates rounded to ~1.1 km for {catConfig.label} to protect privacy.
              </div>
            )}
          </div>

          {/* Mini Map */}
          <div className="rounded-lg overflow-hidden border border-border h-48 sm:h-56 relative shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 bg-card/90 px-2 py-0.5 rounded text-[10px] font-medium border border-border">
              📍 Public Location
            </div>
          </div>
        </div>
      </div>

      {/* Official Timeline Updates (ticket_updates) */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span>📜</span>
          <span>Official Timeline & Status Updates ({updates.length})</span>
        </h3>

        {updates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No official updates yet. Status remains <strong>{ticket.status}</strong>.
          </p>
        ) : (
          <div className="space-y-3 border-l-2 border-yellow ml-2 pl-4">
            {updates.map((up) => (
              <div key={up.id} className="space-y-1 relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-yellow border-2 border-card" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {up.author_role === "admin" ? "Emergency / Council Response" : "Reporter"}
                  </span>
                  <span>·</span>
                  <span>{new Date(up.created_at).toLocaleString()}</span>
                  {up.status_change && (
                    <span className="px-1.5 py-0.2 rounded bg-muted text-foreground text-[10px] font-bold uppercase">
                      Status: {up.status_change}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground">{up.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Comments Discussion */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span>💬</span>
          <span>Community Discussion ({comments.length})</span>
        </h3>

        {/* Existing Comments */}
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No comments yet. Have you seen this or have relevant info? Share an update below.
          </p>
        ) : (
          <div className="space-y-3 divide-y divide-border">
            {comments.map((c) => (
              <div key={c.id} className="pt-3 first:pt-0 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-foreground">
                    {c.author_name || "Neighbour"}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-foreground whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Post Comment Form */}
        <form onSubmit={handlePostComment} className="pt-4 border-t border-border space-y-3">
          <h4 className="text-xs font-semibold text-foreground">Add a Comment</h4>

          {commentError && (
            <p className="text-xs text-red-500 font-medium">{commentError}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="Your name or handle (optional)"
              maxLength={50}
              className="px-3 py-2 text-xs rounded-md border border-border bg-background text-foreground sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-yellow"
            />
            <input
              type="text"
              required
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share an update, observation, or question..."
              maxLength={500}
              className="flex-1 px-3 py-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-yellow"
            />
            <button
              type="submit"
              disabled={commentSubmitting || !commentText.trim()}
              className="px-4 py-2 rounded-md bg-yellow text-slate-950 font-bold hover:bg-yellow-hover disabled:opacity-50 text-xs transition-colors shadow-sm"
            >
              {commentSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
