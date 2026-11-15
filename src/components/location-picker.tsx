"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { OSM_RASTER_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM, MAP_ATTRIBUTION } from "@/lib/map-style";

interface LocationPickerProps {
  lat: number;
  lng: number;
  locationName?: string;
  onChange: (data: { lat: number; lng: number; locationName?: string }) => void;
}

interface GeocodeResult {
  display_name: string;
  lat: number;
  lng: number;
}

export function LocationPicker({
  lat,
  lng,
  locationName = "",
  onChange,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      lng && lat ? [lng, lat] : DEFAULT_CENTER;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_RASTER_STYLE,
      center: initialCenter,
      zoom: DEFAULT_ZOOM,
      attributionControl: { customAttribution: MAP_ATTRIBUTION },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // Draggable marker
    const marker = new maplibregl.Marker({
      draggable: true,
      color: "#f59e0b",
    })
      .setLngLat(initialCenter)
      .addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      onChange({
        lat: Number(pos.lat.toFixed(6)),
        lng: Number(pos.lng.toFixed(6)),
      });
    });

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      marker.setLngLat(e.lngLat);
      onChange({
        lat: Number(e.lngLat.lat.toFixed(6)),
        lng: Number(e.lngLat.lng.toFixed(6)),
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

  // Sync external coordinates
  useEffect(() => {
    if (markerRef.current && mapRef.current && lat && lng) {
      const cur = markerRef.current.getLngLat();
      if (Math.abs(cur.lat - lat) > 0.00001 || Math.abs(cur.lng - lng) > 0.00001) {
        markerRef.current.setLngLat([lng, lat]);
        mapRef.current.panTo([lng, lat]);
      }
    }
  }, [lat, lng]);

  // Handle GPS location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocationStatus("Acquiring GPS location...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLocationStatus(null);
        const userLat = Number(pos.coords.latitude.toFixed(6));
        const userLng = Number(pos.coords.longitude.toFixed(6));

        onChange({
          lat: userLat,
          lng: userLng,
          locationName: "Current GPS Location",
        });

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLngLat([userLng, userLat]);
          mapRef.current.flyTo({ center: [userLng, userLat], zoom: 15 });
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationStatus(`Could not get GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Address search on button press only (S2-02)
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchError("Please enter at least 3 characters to search.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || "Address search failed.");
        return;
      }

      if (!data.results || data.results.length === 0) {
        setSearchError("No locations found. Try a different street or postcode.");
        return;
      }

      setSearchResults(data.results);
    } catch {
      setSearchError("Network error while searching address.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (item: GeocodeResult) => {
    const newLat = Number(item.lat.toFixed(6));
    const newLng = Number(item.lng.toFixed(6));

    onChange({
      lat: newLat,
      lng: newLng,
      locationName: item.display_name.split(",").slice(0, 3).join(",").trim(),
    });

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat([newLng, newLat]);
      mapRef.current.flyTo({ center: [newLng, newLat], zoom: 15 });
    }

    setSearchResults([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Incident Location <span className="text-red-500">*</span>
          </label>
          <span className="text-[11px] text-muted-foreground">
            Pin the exact location on the map. Drag pin or search address below.
          </span>
        </div>

        <button
          type="button"
          onClick={handleGetLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-card border border-border text-foreground hover:bg-muted transition-colors shadow-2xs disabled:opacity-50"
        >
          <span className="text-yellow text-sm">📍</span>
          <span>{isLocating ? "Acquiring GPS..." : "Use My GPS"}</span>
        </button>
      </div>

      {locationStatus && (
        <p className="text-xs text-yellow font-medium">{locationStatus}</p>
      )}

      {/* Address Search on Button Press Only */}
      <form onSubmit={handleAddressSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address, street name, or postcode..."
            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow shadow-2xs"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="px-4 py-2 text-xs sm:text-sm font-bold rounded-lg bg-yellow text-slate-950 hover:bg-yellow-hover disabled:opacity-50 transition-colors shadow-2xs whitespace-nowrap"
        >
          {isSearching ? "Searching..." : "Find"}
        </button>
      </form>

      {searchError && (
        <p className="text-xs text-red-500 font-medium">{searchError}</p>
      )}

      {searchResults.length > 0 && (
        <ul className="border border-border rounded-xl bg-card divide-y divide-border overflow-hidden text-xs shadow-lg max-h-48 overflow-y-auto z-10">
          {searchResults.map((item, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-muted/60 transition-colors flex items-center justify-between gap-2"
              >
                <span className="truncate text-foreground font-medium">{item.display_name}</span>
                <span className="text-yellow font-bold text-[11px] whitespace-nowrap">Select →</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Draggable Map Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-border shadow-inner">
        <div
          ref={mapContainerRef}
          className="w-full h-64 sm:h-72 bg-slate-200 dark:bg-slate-900"
        />
        <div className="absolute bottom-2.5 left-2.5 bg-card/90 backdrop-blur-md px-3 py-1 rounded-lg text-[11px] font-semibold border border-border shadow-sm text-foreground flex items-center gap-1.5">
          <span>🎯</span>
          <span>Drag yellow marker or click anywhere to adjust location</span>
        </div>
      </div>

      {/* Coordinate & Area Details Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground bg-card/60 p-3 rounded-xl border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <span>Lat: <strong className="text-foreground font-mono">{lat.toFixed(5)}</strong></span>
          <span>Lng: <strong className="text-foreground font-mono">{lng.toFixed(5)}</strong></span>
        </div>
        {locationName && (
          <div className="truncate max-w-xs font-semibold text-foreground flex items-center gap-1">
            <span>📌</span>
            <span>{locationName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
