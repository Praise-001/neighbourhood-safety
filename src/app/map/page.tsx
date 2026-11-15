"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import { Ticket, CATEGORIES, SEVERITIES } from "@/lib/types";
import { DEFAULT_CENTER, DEFAULT_ZOOM, createMapInstance } from "@/lib/map-style";
import { calculateDistanceMeters, formatDistance } from "@/lib/geo";

export default function MapAndFeedPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [timeRangeHours, setTimeRangeHours] = useState<string>("72");
  const [viewMode, setViewMode] = useState<"map" | "feed">("map");

  // User location for distance
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Selected ticket for preview card
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Request user location for distance calculation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setUserCoords({ lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] });
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Fetch tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      if (timeRangeHours && timeRangeHours !== "all") {
        params.append("sinceHours", timeRangeHours);
      }

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load incidents");
        return;
      }

      setTickets(data.tickets || []);
    } catch {
      setError("Network error fetching incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [selectedCategory, timeRangeHours]);

  // GeoJSON data
  const geojson = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: tickets.map((t) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [t.public_lng, t.public_lat] as [number, number],
        },
        properties: {
          id: t.id,
          code: t.reference_code,
          category: t.category,
          severity: t.severity,
          title: t.title,
          description: t.description,
          location_name: t.location_name || "",
          confirmations: t.confirmation_count,
          created_at: t.created_at,
        },
      })),
    };
  }, [tickets]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = createMapInstance({
      container: mapContainerRef.current,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // Add clustered GeoJSON source
      map.addSource("incidents", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "incidents",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#f59e0b",
            5,
            "#f97316",
            15,
            "#ef4444",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18,
            5,
            24,
            15,
            30,
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Cluster count text
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "incidents",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["Open Sans Bold"],
        },
        paint: {
          "text-color": "#090e17",
        },
      });

      // Unclustered individual points
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "incidents",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "severity"],
            "critical",
            "#dc2626",
            "high",
            "#ea580c",
            "medium",
            "#f59e0b",
            "#2563eb",
          ],
          "circle-radius": 8,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Click on cluster
      map.on("click", "clusters", async (e: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        const source = map.getSource("incidents") as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const geometry = features[0].geometry as { type: string; coordinates: [number, number] };
        map.easeTo({
          center: geometry.coordinates,
          zoom,
        });
      });

      // Click on individual marker
      map.on("click", "unclustered-point", (e: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered-point"] });
        if (!features.length) return;
        const props = features[0].properties;
        const matched = tickets.find((t) => t.id === props.id);
        if (matched) {
          setSelectedTicket(matched);
        }
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "unclustered-point", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "unclustered-point", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update source
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource("incidents") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }
  }, [geojson]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden min-h-0 min-w-0">
      {/* Top Filter Bar */}
      <div className="border-b border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-xs z-10 flex flex-wrap items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-yellow text-slate-950 shadow-2xs"
                : "bg-background border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Reports ({tickets.length})
          </button>

          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setSelectedCategory(c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === c.value
                  ? "bg-yellow text-slate-950 shadow-2xs"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label.split("/")[0].trim()}</span>
            </button>
          ))}
        </div>

        {/* Right Filter & Mode Controls */}
        <div className="flex items-center gap-2">
          {/* Time Filter */}
          <select
            value={timeRangeHours}
            onChange={(e) => setTimeRangeHours(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold focus:ring-2 focus:ring-yellow"
          >
            <option value="24">Past 24 Hours</option>
            <option value="72">Past 3 Days</option>
            <option value="168">Past 7 Days</option>
            <option value="all">All Active</option>
          </select>

          {/* Mobile View Toggle */}
          <div className="flex sm:hidden rounded-lg border border-border bg-muted p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === "map" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode("feed")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === "feed" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              Feed
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 text-xs text-center border-b border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Main Dual Pane Canvas */}
      <div className="flex-1 relative flex overflow-hidden min-h-0 min-w-0">
        {/* Map View */}
        <div
          className={`flex-1 relative h-full min-h-0 min-w-0 overflow-hidden ${
            viewMode === "map" ? "block" : "hidden sm:block sm:w-1/2 lg:w-3/5"
          }`}
        >
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full min-h-0 min-w-0" />

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-border shadow-lg text-xs space-y-1.5 z-10">
            <span className="font-bold text-foreground text-[11px] uppercase tracking-wider block">
              Severity Indicator
            </span>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-semibold">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow inline-block shadow-2xs" /> Med</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block shadow-2xs" /> High</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-2xs" /> Crit</span>
            </div>
          </div>

          {/* Selected Incident Floating Card */}
          {selectedTicket && (
            <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-2xl space-y-3 z-20 animate-fade-in">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {CATEGORIES.find((c) => c.value === selectedTicket.category)?.icon || "⚠️"}
                  </span>
                  <div>
                    <span className="text-[11px] font-mono font-bold text-yellow bg-navy px-1.5 py-0.5 rounded">
                      {selectedTicket.reference_code}
                    </span>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">
                      {selectedTicket.title}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {selectedTicket.description}
              </p>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground font-medium truncate max-w-[150px]">
                  📍 {selectedTicket.location_name ? selectedTicket.location_name.split(",")[0] : "Local Area"}
                </span>
                <Link
                  href={`/tickets/${selectedTicket.id}`}
                  className="px-3.5 py-1.5 rounded-lg bg-yellow text-slate-950 font-bold hover:bg-yellow-hover text-xs transition-colors shadow-2xs"
                >
                  View Details →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Live Feed List Pane */}
        <div
          className={`overflow-y-auto p-4 space-y-3.5 ${
            viewMode === "feed"
              ? "w-full"
              : "hidden sm:block sm:w-1/2 lg:w-2/5 border-l border-border bg-background/50"
          }`}
        >
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-foreground">
                Live Incident Feed
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-yellow/20 text-yellow text-[10px] font-black">
                {tickets.length}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Newest First</span>
          </div>

          {loading && (
            <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
              <div className="w-8 h-8 border-2 border-yellow border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Fetching community reports...</p>
            </div>
          )}

          {!loading && tickets.length === 0 && (
            <div className="py-16 text-center text-muted-foreground text-xs space-y-3 bg-card rounded-2xl border border-border p-6">
              <span className="text-3xl block">🛡️</span>
              <p className="font-bold text-foreground">No incidents in this view.</p>
              <p>Adjust your category filter or time range above.</p>
              <Link
                href="/report"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-yellow text-slate-950 font-bold text-xs"
              >
                + Report New Incident
              </Link>
            </div>
          )}

          {tickets.map((item) => {
            const cat = CATEGORIES.find((c) => c.value === item.category);
            const sev = SEVERITIES.find((s) => s.value === item.severity);

            let distanceStr: string | null = null;
            if (userCoords) {
              const meters = calculateDistanceMeters(
                userCoords.lat,
                userCoords.lng,
                item.public_lat,
                item.public_lng
              );
              distanceStr = formatDistance(meters);
            }

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-border bg-card hover:border-yellow/50 transition-all space-y-2.5 shadow-2xs hover:shadow-xs group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-2xl mt-0.5">{cat?.icon || "⚠️"}</span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-yellow bg-navy px-1.5 py-0.5 rounded">
                          {item.reference_code}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sev?.color}`}>
                          {sev?.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground mt-1 line-clamp-1 group-hover:text-yellow transition-colors">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {distanceStr && (
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-muted text-foreground border border-border/50 whitespace-nowrap">
                      📍 {distanceStr}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {item.location_name ? item.location_name.split(",")[0] : "Local Area"}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(item.incident_time).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {item.confirmation_count > 0 && (
                      <span className="text-yellow font-bold">
                        👍 {item.confirmation_count}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/tickets/${item.id}`}
                    className="text-xs font-bold text-yellow hover:underline flex items-center gap-1"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
