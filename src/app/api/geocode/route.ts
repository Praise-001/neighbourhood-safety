import { NextRequest, NextResponse } from "next/server";

let lastGeocodeRequestTime = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      { error: "Query must be at least 3 characters" },
      { status: 400 }
    );
  }

  // Rate-limit: max 1 request per second per Nominatim policy
  const now = Date.now();
  const timeSinceLast = now - lastGeocodeRequestTime;
  if (timeSinceLast < 1000) {
    const waitMs = 1000 - timeSinceLast;
    await new Promise((r) => setTimeout(r, waitMs));
  }
  lastGeocodeRequestTime = Date.now();

  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encoded}`,
      {
        headers: {
          "User-Agent": "NeighbourhoodSafetyApp/1.0 (Academic prototype incident reporter)",
          "Accept-Language": "en",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding service unavailable" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const results = data.map((item: { display_name: string; lat: string; lon: string }) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json(
      { error: "Failed to search location" },
      { status: 500 }
    );
  }
}
