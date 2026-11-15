"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { OSM_RASTER_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/map-style";
import { getOrCreateClientToken } from "@/lib/client-token";

export default function AlertSettingsPage() {
  const [homeLat, setHomeLat] = useState<number>(DEFAULT_CENTER[1]);
  const [homeLng, setHomeLng] = useState<number>(DEFAULT_CENTER[0]);
  const [radiusMeters, setRadiusMeters] = useState<500 | 1000 | 5000>(1000);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Helper to generate circle GeoJSON
  const createGeoJSONCircle = (center: [number, number], radiusInMeters: number, points = 64) => {
    const coords = [];
    const km = radiusInMeters / 1000;
    const distanceX = km / (111.32 * Math.cos((center[1] * Math.PI) / 180));
    const distanceY = km / 110.574;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      coords.push([center[0] + x, center[1] + y]);
    }
    coords.push(coords[0]);

    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [coords],
      },
      properties: {},
    };
  };

  // Load existing alert settings
  useEffect(() => {
    const cached = localStorage.getItem("ns_alert_settings");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.home_lat && parsed.home_lng) {
          setHomeLat(parsed.home_lat);
          setHomeLng(parsed.home_lng);
        }
        if (parsed.radius_meters) {
          setRadiusMeters(parsed.radius_meters);
        }
      } catch {}
    }

    const token = getOrCreateClientToken();
    fetch(`/api/alerts?client_token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setHomeLat(data.settings.home_lat);
          setHomeLng(data.settings.home_lng);
          setRadiusMeters(data.settings.radius_meters);
          localStorage.setItem("ns_alert_settings", JSON.stringify(data.settings));
        }
      })
      .catch(() => {});
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_RASTER_STYLE,
      center: [homeLng, homeLat],
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const marker = new maplibregl.Marker({
      draggable: true,
      color: "#f59e0b",
    })
      .setLngLat([homeLng, homeLat])
      .addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      setHomeLat(Number(pos.lat.toFixed(6)));
      setHomeLng(Number(pos.lng.toFixed(6)));
    });

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      marker.setLngLat(e.lngLat);
      setHomeLat(Number(e.lngLat.lat.toFixed(6)));
      setHomeLng(Number(e.lngLat.lng.toFixed(6)));
    });

    map.on("load", () => {
      const circleData = createGeoJSONCircle([homeLng, homeLat], radiusMeters);

      map.addSource("radius-circle", {
        type: "geojson",
        data: circleData,
      });

      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius-circle",
        paint: {
          "fill-color": "#f59e0b",
          "fill-opacity": 0.15,
        },
      });

      map.addLayer({
        id: "radius-outline",
        type: "line",
        source: "radius-circle",
        paint: {
          "line-color": "#d97706",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update circle and marker
  useEffect(() => {
    if (mapRef.current) {
      const source = mapRef.current.getSource("radius-circle") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(createGeoJSONCircle([homeLng, homeLat], radiusMeters));
      }
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([homeLng, homeLat]);
    }
  }, [homeLat, homeLng, radiusMeters]);

  // GPS
  const handleUseGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setHomeLat(lat);
        setHomeLng(lng);
        if (mapRef.current && markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
          mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
        }
      },
      (err) => {
        setErrorMsg(`GPS error: ${err.message}`);
      }
    );
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    setErrorMsg(null);

    const token = getOrCreateClientToken();
    const payload = {
      client_token: token,
      home_lat: homeLat,
      home_lng: homeLng,
      radius_meters: radiusMeters,
    };

    localStorage.setItem("ns_alert_settings", JSON.stringify(payload));
    window.dispatchEvent(new Event("ns_alert_settings_updated"));

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to persist alert settings to server.");
        return;
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch {
      setSavedSuccess(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Simulate alert test
  const handleSimulateAlert = () => {
    const simulated = {
      id: "sim-" + Date.now(),
      reference_code: "DEMO-991",
      category: "fire",
      severity: "critical",
      title: "Simulated Critical Hazard in Your Perimeter",
      description: "This is a demonstration of the live Realtime banner that triggers when an incident occurs inside your radius.",
      status: "investigating",
      location_name: "Near your home pin",
      public_lat: homeLat + 0.001,
      public_lng: homeLng + 0.001,
      confirmation_count: 4,
      flag_count: 0,
      hidden: false,
      incident_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      is_anonymous: false,
      photo_url: null,
    };
    window.dispatchEvent(new CustomEvent("simulate_alert", { detail: simulated }));
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Perimeter Alert Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure your home coordinates and alert radius. When incidents happen inside, you will receive an in-app banner.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSimulateAlert}
          className="px-3.5 py-1.5 rounded-xl border border-yellow/50 bg-yellow/10 text-yellow text-xs font-bold hover:bg-yellow hover:text-slate-950 transition-all shadow-2xs whitespace-nowrap"
        >
          ⚡ Test Live Alert Banner
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span>✓</span>
          <span>Alert perimeter saved. Live Realtime monitoring active for your radius!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 text-xs">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
        {/* Radius Choice */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            1. Alert Perimeter Radius
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[500, 1000, 5000].map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRadiusMeters(r as 500 | 1000 | 5000)}
                className={`py-3.5 px-4 rounded-xl border text-center transition-all ${
                  radiusMeters === r
                    ? "border-yellow bg-yellow/10 ring-2 ring-yellow text-foreground font-black shadow-xs"
                    : "border-border bg-background hover:bg-muted text-muted-foreground font-medium"
                }`}
              >
                <div className="text-base sm:text-lg">
                  {r === 500 ? "500 m" : r === 1000 ? "1 km" : "5 km"}
                </div>
                <div className="text-[11px] opacity-75 mt-0.5">
                  {r === 500 ? "Immediate Street" : r === 1000 ? "Neighbourhood" : "Wider District"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Map Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              2. Home Location Pin
            </label>
            <p className="text-xs text-muted-foreground">
              Drag the golden marker or click on the map to set your home center.
            </p>
          </div>

          <button
            type="button"
            onClick={handleUseGPS}
            className="px-3.5 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs font-bold hover:bg-muted transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span>📍</span>
            <span>Use My GPS</span>
          </button>
        </div>

        {/* Interactive Map */}
        <div className="rounded-xl overflow-hidden border border-border h-72 sm:h-80 relative shadow-inner">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute bottom-2.5 left-2.5 bg-card/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-semibold border border-border shadow-sm text-foreground">
            Perimeter: <strong>{radiusMeters < 1000 ? `${radiusMeters} m` : `${radiusMeters / 1000} km`}</strong> radius
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <span>Center: </span>
            <strong className="text-foreground font-mono">{homeLat.toFixed(5)}, {homeLng.toFixed(5)}</strong>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-yellow text-slate-950 font-black hover:bg-yellow-hover disabled:opacity-50 text-sm transition-all shadow-md text-center"
          >
            {isSaving ? "Saving Perimeter..." : "Save Alert Perimeter"}
          </button>
        </div>
      </div>
    </div>
  );
}
