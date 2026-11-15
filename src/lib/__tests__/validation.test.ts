import { describe, it, expect } from "vitest";
import { reportSchema } from "../validation";
import { generateReferenceCode } from "../reference";

describe("Report Validation (S2-01)", () => {
  it("validates valid incident payload", () => {
    const valid = {
      category: "theft",
      severity: "medium",
      title: "Bicycle stolen from bike rack",
      description: "Trek mountain bike with red lock cable cut outside coffee shop.",
      lat: 53.4808,
      lng: -2.2426,
      location_name: "Market Street, Manchester",
      is_anonymous: false,
      email: "reporter@example.com",
    };

    const result = reportSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("fails if category is invalid", () => {
    const invalid = {
      category: "spaceship_crash",
      severity: "low",
      title: "Valid title",
      description: "Valid description here with enough text.",
      lat: 53.48,
      lng: -2.24,
    };

    const result = reportSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("fails if description is too short (< 10 chars)", () => {
    const shortDesc = {
      category: "accident",
      severity: "high",
      title: "Car crash",
      description: "crash",
      lat: 53.48,
      lng: -2.24,
    };

    const result = reportSchema.safeParse(shortDesc);
    expect(result.success).toBe(false);
  });

  it("allows anonymous reports without email", () => {
    const anon = {
      category: "suspicious_activity",
      severity: "low",
      title: "Suspicious vehicle parked in alley",
      description: "Black estate car has been idling for 45 minutes with headlights off.",
      lat: 53.48,
      lng: -2.24,
      is_anonymous: true,
    };

    const result = reportSchema.safeParse(anon);
    expect(result.success).toBe(true);
  });
});

describe("Reference Code Generator (S2-05)", () => {
  it("generates correctly formatted reference code", () => {
    const code = generateReferenceCode("MCR");
    expect(code).toMatch(/^MCR-\d{4}$/);
  });

  it("generates unique codes on successive calls", () => {
    const code1 = generateReferenceCode();
    const code2 = generateReferenceCode();
    // They are randomly generated
    expect(code1.length).toBeGreaterThan(5);
    expect(code2.length).toBeGreaterThan(5);
  });
});
