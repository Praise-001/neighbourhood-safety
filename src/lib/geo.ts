import { IncidentCategory } from "./types";

/**
 * Checks if an incident category requires privacy rounding.
 * According to ADR-0004: missing_person and suspicious_activity are sensitive.
 */
export function isSensitiveCategory(category: IncidentCategory): boolean {
  return category === "suspicious_activity" || category === "missing_person";
}

/**
 * Rounds coordinates to 2 decimal places (~1.1 km precision) for sensitive
 * incident categories to protect individual privacy, or retains high precision (6 decimals)
 * for non-sensitive categories.
 */
export function getPublicCoordinates(
  lat: number,
  lng: number,
  category: IncidentCategory
): { public_lat: number; public_lng: number } {
  if (isSensitiveCategory(category)) {
    // 2 decimal places ~1.1km grid precision
    return {
      public_lat: Math.round(lat * 100) / 100,
      public_lng: Math.round(lng * 100) / 100,
    };
  }

  // Non-sensitive: standard 6 decimal precision (~0.1m)
  return {
    public_lat: Math.round(lat * 1000000) / 1000000,
    public_lng: Math.round(lng * 1000000) / 1000000,
  };
}

/**
 * Haversine formula to compute great-circle distance between two points in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Formats distance in meters into human-readable string (e.g. "450 m" or "2.4 km").
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
