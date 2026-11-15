import * as maplibregl from "maplibre-gl";

export const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// Retained alias for backwards compatibility
export const OSM_RASTER_STYLE = DEFAULT_MAP_STYLE;

export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

// Default center: Lagos, Nigeria (Yaba / Lagos Mainland / Island)
export const DEFAULT_CITY = "Lagos, Nigeria";
export const DEFAULT_CENTER: [number, number] = [3.3792, 6.5244];
export const DEFAULT_ZOOM = 13;

/**
 * Configure MapLibre Web Worker URL to the locally served static worker bundle.
 * This prevents Next.js / Turbopack chunk URL mismatch and module MIME errors.
 */
export function ensureMapWorkerConfigured() {
  if (typeof window !== "undefined") {
    maplibregl.setWorkerUrl("/maplibre-gl-worker.js");
  }
}

// Auto-initialize worker URL when imported in client bundles
if (typeof window !== "undefined") {
  ensureMapWorkerConfigured();
}

/**
 * Factory helper to initialize a MapLibre Map with consistent options,
 * worker configuration, attribution, and bounded container setup.
 */
export function createMapInstance(options: maplibregl.MapOptions): maplibregl.Map {
  ensureMapWorkerConfigured();
  return new maplibregl.Map({
    style: DEFAULT_MAP_STYLE,
    attributionControl: { customAttribution: MAP_ATTRIBUTION },
    ...options,
  });
}
