"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Ticket, CATEGORIES } from "@/lib/types";
import { calculateDistanceMeters, formatDistance } from "@/lib/geo";

interface ActiveAlert {
  ticket: Ticket;
  distanceMeters: number;
}

export function RealtimeAlertsProvider({ children }: { children: React.ReactNode }) {
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);

  useEffect(() => {
    const handleIncomingTicket = (ticket: Ticket) => {
      // 1. Check if user has alert settings configured in localStorage
      let homeLat: number | null = null;
      let homeLng: number | null = null;
      let radiusMeters = 5000; // default 5km

      const raw = localStorage.getItem("ns_alert_settings");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.home_lat && parsed.home_lng) {
            homeLat = parsed.home_lat;
            homeLng = parsed.home_lng;
          }
          if (parsed.radius_meters) {
            radiusMeters = parsed.radius_meters;
          }
        } catch {}
      }

      if (homeLat === null || homeLng === null) {
        // No home configured yet; don't trigger radius alert
        return;
      }

      const distance = calculateDistanceMeters(
        homeLat,
        homeLng,
        ticket.public_lat,
        ticket.public_lng
      );

      // Check if ticket is within alert perimeter
      if (distance <= radiusMeters) {
        setActiveAlert({
          ticket,
          distanceMeters: distance,
        });

        // Auto dismiss after 15 seconds if not critical
        if (ticket.severity !== "critical") {
          setTimeout(() => {
            setActiveAlert((cur) => (cur?.ticket.id === ticket.id ? null : cur));
          }, 15000);
        }
      }
    };

    // 2. Subscribe to Supabase Realtime channel on tickets INSERT
    const channel = supabase
      .channel("realtime:public-tickets")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          if (payload.new) {
            handleIncomingTicket(payload.new as Ticket);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Connected to Supabase Realtime
        }
      });

    // 3. Listener for testing or simulation
    const handleSimulatedAlert = (e: Event) => {
      const custom = e as CustomEvent<Ticket>;
      if (custom.detail) {
        handleIncomingTicket(custom.detail);
      }
    };
    window.addEventListener("simulate_alert", handleSimulatedAlert);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("simulate_alert", handleSimulatedAlert);
    };
  }, []);

  const cat = activeAlert ? CATEGORIES.find((c) => c.value === activeAlert.ticket.category) : null;
  const isCritical = activeAlert?.ticket.severity === "critical";

  return (
    <>
      {activeAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed top-16 left-0 right-0 z-50 p-4 transition-all duration-300 shadow-2xl ${
            isCritical
              ? "bg-red-700 text-white border-b-4 border-yellow animate-pulse"
              : "bg-navy text-white border-b-2 border-yellow"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">
                {isCritical ? "🚨" : cat?.icon || "⚠️"}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      isCritical
                        ? "bg-white text-red-700 font-extrabold"
                        : "bg-yellow text-slate-950 font-bold"
                    }`}
                  >
                    {isCritical ? "CRITICAL INCIDENT ALERT" : "NEARBY INCIDENT ALERT"}
                  </span>
                  <span className="text-xs text-yellow font-bold font-mono">
                    {activeAlert.ticket.reference_code}
                  </span>
                  <span className="text-xs opacity-90">
                    📍 {formatDistance(activeAlert.distanceMeters)} from your home
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold mt-0.5 text-white">
                  {activeAlert.ticket.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Link
                href={`/tickets/${activeAlert.ticket.id}`}
                onClick={() => setActiveAlert(null)}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm ${
                  isCritical
                    ? "bg-white text-red-700 hover:bg-slate-100"
                    : "bg-yellow text-slate-950 hover:bg-yellow-hover"
                }`}
              >
                View Incident →
              </Link>
              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                aria-label="Dismiss alert"
                className="p-2 text-white/80 hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
