import { describe, it, expect } from "vitest";
import { calculateDistanceMeters } from "../geo";

describe("Alert Radius & Realtime Perimeter Logic (S4-02 & S4-03)", () => {
  const homeLocation = { lat: 53.4808, lng: -2.2426 }; // Manchester City Centre

  it("detects incidents within 500m perimeter", () => {
    // Incident 170m away on Market Street
    const nearbyIncident = { lat: 53.482, lng: -2.241 };
    const distance = calculateDistanceMeters(
      homeLocation.lat,
      homeLocation.lng,
      nearbyIncident.lat,
      nearbyIncident.lng
    );

    expect(distance).toBeLessThan(500);
    const triggers500m = distance <= 500;
    expect(triggers500m).toBe(true);
  });

  it("filters out incidents outside 500m perimeter but within 1km", () => {
    // Incident 750m away in Ancoats
    const intermediateIncident = { lat: 53.4855, lng: -2.235 };
    const distance = calculateDistanceMeters(
      homeLocation.lat,
      homeLocation.lng,
      intermediateIncident.lat,
      intermediateIncident.lng
    );

    expect(distance).toBeGreaterThan(500);
    expect(distance).toBeLessThan(1000);

    const triggers500m = distance <= 500;
    const triggers1000m = distance <= 1000;

    expect(triggers500m).toBe(false); // Ignored by 500m perimeter
    expect(triggers1000m).toBe(true); // Triggers 1km perimeter
  });

  it("strictly suppresses incidents outside selected 5km perimeter", () => {
    // Incident in Salford / Trafford ~6.5km away
    const farIncident = { lat: 53.435, lng: -2.295 };
    const distance = calculateDistanceMeters(
      homeLocation.lat,
      homeLocation.lng,
      farIncident.lat,
      farIncident.lng
    );

    expect(distance).toBeGreaterThan(5000);
    const triggers5km = distance <= 5000;
    expect(triggers5km).toBe(false);
  });
});
