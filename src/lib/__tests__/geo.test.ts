import { describe, it, expect } from "vitest";
import {
  isSensitiveCategory,
  getPublicCoordinates,
  calculateDistanceMeters,
  formatDistance,
} from "../geo";

describe("Geo and Privacy Rounding (S2-03)", () => {
  it("identifies sensitive categories correctly", () => {
    expect(isSensitiveCategory("missing_person")).toBe(true);
    expect(isSensitiveCategory("suspicious_activity")).toBe(true);
    expect(isSensitiveCategory("theft")).toBe(false);
    expect(isSensitiveCategory("fire")).toBe(false);
    expect(isSensitiveCategory("accident")).toBe(false);
    expect(isSensitiveCategory("flooding")).toBe(false);
    expect(isSensitiveCategory("other")).toBe(false);
  });

  it("rounds coordinates to 2 decimal places for sensitive categories", () => {
    const lat = 53.480759;
    const lng = -2.242631;

    const roundedMissing = getPublicCoordinates(lat, lng, "missing_person");
    expect(roundedMissing.public_lat).toBe(53.48);
    expect(roundedMissing.public_lng).toBe(-2.24);

    const roundedSuspicious = getPublicCoordinates(lat, lng, "suspicious_activity");
    expect(roundedSuspicious.public_lat).toBe(53.48);
    expect(roundedSuspicious.public_lng).toBe(-2.24);
  });

  it("preserves high precision for non-sensitive categories", () => {
    const lat = 53.480759;
    const lng = -2.242631;

    const publicTheft = getPublicCoordinates(lat, lng, "theft");
    expect(publicTheft.public_lat).toBe(53.480759);
    expect(publicTheft.public_lng).toBe(-2.242631);

    const publicFire = getPublicCoordinates(lat, lng, "fire");
    expect(publicFire.public_lat).toBe(53.480759);
    expect(publicFire.public_lng).toBe(-2.242631);
  });

  it("calculates distance between points accurately", () => {
    // Manchester Piccadilly to Manchester Victoria ~1.3 km
    const piccadilly = { lat: 53.4774, lng: -2.2312 };
    const victoria = { lat: 53.4875, lng: -2.2422 };

    const distance = calculateDistanceMeters(
      piccadilly.lat,
      piccadilly.lng,
      victoria.lat,
      victoria.lng
    );

    expect(distance).toBeGreaterThan(1200);
    expect(distance).toBeLessThan(1500);
  });

  it("formats distances correctly in meters and km", () => {
    expect(formatDistance(350)).toBe("350 m");
    expect(formatDistance(999)).toBe("999 m");
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(2450)).toBe("2.5 km");
  });
});
