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

  // Mini map
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

  // "I see this too"
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

  // Flag as false
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
          setError("This report has reached the community flag threshold and is now hidden under moderation review.");
        }
      }
    } catch {
      console.error("Failed to flag report");
    } finally {
      setFlagging(false);
    }
  };

  // Post comment
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
      <div className="flex-1 max-w-4xl mx-auto p-16 text-center text-muted-foreground text-sm space-y-3">
        <div className="w-8 h-8 border-2 border-yellow border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading incident dossier...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex-1 max-w-xl mx-auto p-8 text-center space-y-4">
        <div className="p-5 rounded-2xl bg-card border border-border text-foreground text-sm shadow-sm space-y-2">
          <span className="text-3xl block">⚠️</span>
          <p className="font-bold">{error || "Incident report could not be found."}</p>
        </div>
        <Link
          href="/map"
          className="inline-block px-5 py-2.5 rounded-xl bg-yellow text-slate-950 font-bold text-xs shadow-sm hover:bg-yellow-hover transition-colors"
        >
          Return to Live Map
        </Link>
      </div>
    );
  }

  const catConfig = CATEGORIES.find((c) => c.value === ticket.category);
  const sevConfig = SEVERITIES.find((s) => s.value === ticket.severity);

  return (
    <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/map" className="hover:text-foreground transition-colors">
          Live Map
        </Link>
        <span>/</span>
        <span className="font-mono text-yellow font-bold">{ticket.reference_code}</span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border">
          <div className="flex items-start gap-4">
            <span className="text-4xl p-2.5 rounded-2xl bg-muted/60 border border-border">
              {catConfig?.icon || "⚠️"}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
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
              <h1 className="text-xl sm:text-2xl font-black text-foreground mt-2">
                {ticket.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={hasConfirmed || confirming}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                hasConfirmed
                  ? "bg-green-600 text-white cursor-default"
                  : "bg-yellow text-slate-950 hover:bg-yellow-hover disabled:opacity-50"
              }`}
            >
              <span>{hasConfirmed ? "✓" : "👍"}</span>
              <span>
                {hasConfirmed ? `Confirmed (${confirmCount})` : `I see this too (${confirmCount})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowFlagModal(true)}
              disabled={hasFlagged}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold border border-border transition-colors ${
                hasFlagged
                  ? "bg-muted text-muted-foreground"
                  : "bg-card text-muted-foreground hover:text-red-500 hover:border-red-300"
              }`}
            >
              {hasFlagged ? "Flagged" : "Flag"}
            </button>
          </div>
        </div>

        {/* Flag Modal */}
        {showFlagModal && (
          <div className="p-4 rounded-xl bg-muted border border-border space-y-3 animate-fade-in">
            <h4 className="text-xs font-bold text-foreground">
              Flag Report as False or Inaccurate
            </h4>
            <p className="text-xs text-muted-foreground">
              Community safety reports that receive 3 flags are automatically hidden from the public map for moderator review.
            </p>
            <div className="flex flex-wrap gap-2">
              <select
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground"
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
                className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {flagging ? "Flagging..." : "Confirm Flag"}
              </button>
              <button
                type="button"
                onClick={() => setShowFlagModal(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Dossier Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Left Column: Details, Photo, Timeline, Comments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Incident Description
              </h2>
              <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border border-border">
                {ticket.description}
              </p>
            </div>

            {/* Photo Attachment */}
            {ticket.photo_url && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Attached Photo Evidence
                </h3>
                <div className="rounded-2xl overflow-hidden border border-border bg-black/10 max-h-96 w-full shadow-inner">
                  <img
                    src={ticket.photo_url}
                    alt={ticket.title}
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              </div>
            )}

            {/* Official Timeline Updates */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>📜</span>
                <span>Official Timeline Updates ({updates.length})</span>
              </h3>

              {updates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No official updates posted yet. Current status: <strong>{ticket.status}</strong>.
                </p>
              ) : (
                <div className="space-y-3 border-l-2 border-yellow ml-2 pl-4">
                  {updates.map((up) => (
                    <div key={up.id} className="space-y-1 relative">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-yellow border-2 border-card" />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <strong className="text-foreground">
                          {up.author_role === "admin" ? "Emergency / Council Dispatch" : "Reporter"}
                        </strong>
                        <span>·</span>
                        <span>{new Date(up.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-foreground bg-background p-2.5 rounded-lg border border-border/60">
                        {up.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Community Comments */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-5 shadow-2xs">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>💬</span>
                <span>Community Discussion ({comments.length})</span>
              </h3>

              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No community comments yet. Share any relevant sightings or updates below.
                </p>
              ) : (
                <div className="space-y-3 divide-y divide-border/60">
                  {comments.map((c) => (
                    <div key={c.id} className="pt-3 first:pt-0 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-foreground">
                          {c.author_name || "Neighbour"}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment */}
              <form onSubmit={handlePostComment} className="pt-4 border-t border-border space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Post an Update</h4>

                {commentError && (
                  <p className="text-xs text-red-500 font-medium">{commentError}</p>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Your name or handle"
                    maxLength={50}
                    className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground sm:w-1/3 focus:ring-2 focus:ring-yellow"
                  />
                  <input
                    type="text"
                    required
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share observations or notes..."
                    maxLength={500}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-yellow"
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting || !commentText.trim()}
                    className="px-4 py-2 rounded-lg bg-yellow text-slate-950 font-bold hover:bg-yellow-hover disabled:opacity-50 text-xs transition-colors shadow-2xs"
                  >
                    {commentSubmitting ? "Posting..." : "Post"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Mini Map & Quick Info Card */}
          <div className="space-y-6">
            {/* Location & Map Card */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Location & Pin
              </h3>
              <div className="rounded-xl overflow-hidden border border-border h-48 relative shadow-inner">
                <div ref={mapContainerRef} className="w-full h-full" />
                <div className="absolute bottom-2 left-2 bg-card/90 px-2 py-0.5 rounded text-[10px] font-bold border border-border">
                  📍 Public Location
                </div>
              </div>

              <div className="text-xs space-y-1.5 pt-1 text-muted-foreground">
                <p>
                  <span>Area: </span>
                  <strong className="text-foreground">
                    {ticket.location_name || "Manchester Area"}
                  </strong>
                </p>
                <p>
                  <span>Coords: </span>
                  <strong className="text-foreground font-mono">
                    {ticket.public_lat.toFixed(4)}, {ticket.public_lng.toFixed(4)}
                  </strong>
                </p>
                {catConfig?.sensitive && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-tight mt-2">
                    🛡️ Public coordinates rounded to ~1.1 km to protect privacy.
                  </div>
                )}
              </div>
            </div>

            {/* Incident Metadata Card */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-2xs text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Report Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Occurred</span>
                  <span className="font-semibold text-foreground">
                    {new Date(ticket.incident_time).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Reported</span>
                  <span className="font-semibold text-foreground">
                    {new Date(ticket.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-semibold text-foreground">
                    {new Date(ticket.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Reporter</span>
                  <span className="font-semibold text-foreground">
                    {ticket.is_anonymous ? "Anonymous (Protected)" : "Verified Resident"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Confirmations</span>
                  <span className="font-bold text-yellow">
                    👍 {confirmCount} neighbours
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
