"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { OSM_RASTER_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/map-style";

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

    // Also click anywhere on the map to place marker
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

  // Update marker position if external lat/lng changes
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

  // Handle Address Search (Only on button press, never as-you-type)
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
        setSearchError("No locations found. Try a different street, area, or postcode.");
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
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        <label className="text-sm font-semibold text-foreground">
          Incident Location <span className="text-red-500">*</span>
        </label>

        <button
          type="button"
          onClick={handleGetLocation}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-navy text-white hover:bg-navy-light transition-colors border border-border focus:ring-2 focus:ring-yellow disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5 text-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isLocating ? "Acquiring GPS..." : "Use Current GPS"}
        </button>
      </div>

      {locationStatus && (
        <p className="text-xs text-muted-foreground">{locationStatus}</p>
      )}

      {/* Address Search on Button Press Only (S2-02) */}
      <form onSubmit={handleAddressSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search street, neighbourhood, or postcode..."
          className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-md bg-yellow text-slate-950 hover:bg-yellow-hover disabled:opacity-50 transition-colors shadow-sm"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </form>

      {searchError && (
        <p className="text-xs text-red-500 font-medium">{searchError}</p>
      )}

      {searchResults.length > 0 && (
        <ul className="border border-border rounded-md bg-card divide-y divide-border overflow-hidden text-xs shadow-md">
          {searchResults.map((item, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span className="truncate pr-2">{item.display_name}</span>
                <span className="text-yellow text-xs font-bold">Select</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Draggable Map */}
      <div className="relative rounded-lg overflow-hidden border border-border shadow-inner">
        <div
          ref={mapContainerRef}
          className="w-full h-64 sm:h-72 bg-slate-200 dark:bg-slate-800"
        />
        <div className="absolute bottom-2 left-2 bg-card/90 backdrop-blur px-2.5 py-1 rounded text-[11px] font-medium border border-border shadow-sm text-foreground">
          📍 Drag pin or click map to adjust location
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-md border border-border">
        <div>
          <span>Lat: <strong>{lat.toFixed(5)}</strong></span>
          <span className="ml-3">Lng: <strong>{lng.toFixed(5)}</strong></span>
        </div>
        {locationName && (
          <div className="truncate max-w-xs font-medium text-foreground">
            {locationName}
          </div>
        )}
      </div>
    </div>
  );
}
