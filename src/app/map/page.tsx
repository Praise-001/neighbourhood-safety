"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import { Ticket, CATEGORIES, SEVERITIES, IncidentCategory } from "@/lib/types";
import { OSM_RASTER_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/map-style";
import { calculateDistanceMeters, formatDistance } from "@/lib/geo";

export default function MapAndFeedPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [timeRangeHours, setTimeRangeHours] = useState<string>("72"); // Default past 3 days
  const [viewMode, setViewMode] = useState<"map" | "feed">("map");

  // User location for distance calculation
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Selected ticket for preview card
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Request user location for distance calculations
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
          // Geolocation declined, use default Manchester coords for distance
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

  // Transform tickets to GeoJSON FeatureCollection
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

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_RASTER_STYLE,
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
            "#f59e0b", // yellow < 5
            5,
            "#f97316", // orange 5-15
            15,
            "#ef4444", // red > 15
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
          "circle-stroke-width": 2,
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
        },
        paint: {
          "text-color": "#0f172a",
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
            "#d97706",
            "#2563eb", // default low
          ],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Click on cluster to zoom in
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

      // Click on individual incident marker
      map.on("click", "unclustered-point", (e: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered-point"] });
        if (!features.length) return;
        const props = features[0].properties;
        const matched = tickets.find((t) => t.id === props.id);
        if (matched) {
          setSelectedTicket(matched);
        }
      });

      // Pointer cursors
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

  // Update GeoJSON source data when tickets change
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource("incidents") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }
  }, [geojson]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4.5rem)]">
      {/* Top Filter and View Bar */}
      <div className="border-b border-border bg-card p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-sm z-10">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-xs sm:text-sm font-medium focus:ring-2 focus:ring-yellow"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>

          {/* Time Filter */}
          <select
            value={timeRangeHours}
            onChange={(e) => setTimeRangeHours(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-xs sm:text-sm font-medium focus:ring-2 focus:ring-yellow"
          >
            <option value="24">Past 24 Hours</option>
            <option value="72">Past 3 Days</option>
            <option value="168">Past 7 Days</option>
            <option value="all">All Active Reports</option>
          </select>

          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
            Showing <strong>{tickets.length}</strong> incidents
          </span>
        </div>

        {/* View Switcher (Map vs Feed) */}
        <div className="flex items-center rounded-lg border border-border bg-muted p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`px-3 py-1 rounded-md transition-colors ${
              viewMode === "map"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🗺️ Map View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("feed")}
            className={`px-3 py-1 rounded-md transition-colors ${
              viewMode === "feed"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 Feed List
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 text-xs text-center border-b border-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Map View */}
        <div
          className={`flex-1 relative ${viewMode === "map" ? "block" : "hidden sm:block sm:w-1/2 lg:w-3/5"}`}
        >
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-md text-xs space-y-1">
            <span className="font-bold text-foreground">Severity Key</span>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow inline-block" /> Med</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" /> High</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Crit</span>
            </div>
          </div>

          {/* Selected Incident Popup Card */}
          {selectedTicket && (
            <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-card border border-border rounded-xl p-4 shadow-xl space-y-3 z-20">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {CATEGORIES.find((c) => c.value === selectedTicket.category)?.icon || "⚠️"}
                  </span>
                  <div>
                    <span className="text-[11px] font-mono font-bold text-yellow">
                      {selectedTicket.reference_code}
                    </span>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">
                      {selectedTicket.title}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {selectedTicket.description}
              </p>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                <span className="text-muted-foreground truncate max-w-[150px]">
                  {selectedTicket.location_name || "Manchester"}
                </span>
                <Link
                  href={`/tickets/${selectedTicket.id}`}
                  className="px-3 py-1 rounded bg-yellow text-slate-950 font-bold hover:bg-yellow-hover text-xs transition-colors"
                >
                  View Details →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Feed List View (S3-02: Newest first, with distance) */}
        <div
          className={`overflow-y-auto p-4 space-y-3 ${
            viewMode === "feed"
              ? "w-full"
              : "hidden sm:block sm:w-1/2 lg:w-2/5 border-l border-border bg-background"
          }`}
        >
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">
              Incident Feed ({tickets.length})
            </h2>
            <span className="text-xs text-muted-foreground">Newest first</span>
          </div>

          {loading && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Loading incidents...
            </div>
          )}

          {!loading && tickets.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
              <p>No incidents match the selected filter criteria.</p>
              <Link
                href="/report"
                className="text-xs font-semibold text-yellow hover:underline"
              >
                + Report a new incident
              </Link>
            </div>
          )}

          {tickets.map((item) => {
            const cat = CATEGORIES.find((c) => c.value === item.category);
            const sev = SEVERITIES.find((s) => s.value === item.severity);

            // Compute distance if coordinates available
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
                className="p-4 rounded-lg border border-border bg-card hover:border-yellow/50 transition-all space-y-2 shadow-sm"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat?.icon || "⚠️"}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-yellow">
                          {item.reference_code}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sev?.color}`}>
                          {sev?.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {distanceStr && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                      📍 {distanceStr}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>
                      {item.location_name ? item.location_name.split(",")[0] : "Local area"}
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
                      <>
                        <span>·</span>
                        <span className="font-semibold text-yellow">
                          👍 {item.confirmation_count}
                        </span>
                      </>
                    )}
                  </div>

                  <Link
                    href={`/tickets/${item.id}`}
                    className="text-xs font-semibold text-yellow hover:underline"
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
