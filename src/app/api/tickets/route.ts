import { NextRequest, NextResponse } from "next/server";
import { reportSchema } from "@/lib/validation";
import { checkReportAbuseLimit } from "@/lib/rate-limit";
import { getPublicCoordinates } from "@/lib/geo";
import { generateReferenceCode } from "@/lib/reference";
import { CATEGORIES, IncidentCategory } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase/client";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = reportSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = result.data;

    // Check abuse limit (max 5 reports per hour per email/reporter)
    const rateCheck = await checkReportAbuseLimit({
      email: data.email || null,
    });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: rateCheck.message },
        { status: 429 }
      );
    }

    // Determine expiry duration
    const catConfig = CATEGORIES.find((c) => c.value === data.category);
    const expiryDays = catConfig ? catConfig.defaultExpiryDays : 7;
    const now = new Date();
    const incidentTime = data.incident_time ? new Date(data.incident_time) : now;
    const expiresAt = new Date(incidentTime.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    // Compute public vs exact coordinates (S2-03 Privacy Rounding)
    const { public_lat, public_lng } = getPublicCoordinates(
      data.lat,
      data.lng,
      data.category as IncidentCategory
    );

    // Generate unique reference code
    let referenceCode = generateReferenceCode();
    // Ensure uniqueness
    for (let attempts = 0; attempts < 3; attempts++) {
      const { data: existing } = await supabaseAdmin
        .from("tickets")
        .select("id")
        .eq("reference_code", referenceCode)
        .maybeSingle();

      if (!existing) break;
      referenceCode = generateReferenceCode();
    }

    // Email hash for abuse limit tracking
    const emailHash = data.email && data.email.trim()
      ? crypto.createHash("sha256").update(data.email.toLowerCase().trim()).digest("hex")
      : null;

    // 1. Insert into public tickets table (ADR-0004: public columns only)
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .insert({
        reference_code: referenceCode,
        category: data.category,
        severity: data.severity,
        title: data.title,
        description: data.description,
        status: "open",
        location_name: data.location_name || null,
        public_lat,
        public_lng,
        photo_url: data.photo_url || null,
        is_anonymous: data.is_anonymous,
        flag_count: 0,
        confirmation_count: 0,
        hidden: false,
        incident_time: incidentTime.toISOString(),
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id, reference_code, created_at")
      .single();

    if (ticketError) {
      console.error("Error inserting ticket:", ticketError);
      return NextResponse.json(
        { error: "Failed to create incident report. Please try again." },
        { status: 500 }
      );
    }

    // 2. Insert into private table (exact location and reporter info)
    const { error: privateError } = await supabaseAdmin
      .from("ticket_private")
      .insert({
        ticket_id: ticket.id,
        exact_lat: data.lat,
        exact_lng: data.lng,
        reporter_email: data.is_anonymous ? null : data.email || null,
        reporter_email_hash: emailHash,
        created_at: now.toISOString(),
      });

    if (privateError) {
      console.error("Error inserting private ticket data:", privateError);
    }

    return NextResponse.json(
      {
        success: true,
        reference_code: ticket.reference_code,
        ticket_id: ticket.id,
        message: "Incident report submitted successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unhandled error in POST /api/tickets:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your report." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const sinceHours = searchParams.get("sinceHours");
    const bounds = searchParams.get("bounds"); // minLng,minLat,maxLng,maxLat
    const radius = searchParams.get("radius"); // lat,lng,radiusMeters
    const code = searchParams.get("code");

    // Single ticket lookup by reference code (S2-05)
    if (code) {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("reference_code", code.trim().toUpperCase())
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      return NextResponse.json({ ticket: data });
    }

    let sinceTime: string | null = null;
    if (sinceHours) {
      const hours = parseInt(sinceHours, 10);
      if (!isNaN(hours) && hours > 0) {
        sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      }
    }

    // Radius search via PostGIS RPC
    if (radius) {
      const [rLat, rLng, rMeters] = radius.split(",").map(Number);
      if (!isNaN(rLat) && !isNaN(rLng)) {
        const { data, error } = await supabase.rpc("get_nearby_tickets", {
          search_lat: rLat,
          search_lng: rLng,
          radius_meters: rMeters || 50000,
          filter_category: category || null,
          since_time: sinceTime,
        });

        if (error) {
          console.error("Radius RPC error:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ tickets: data });
      }
    }

    // Viewport bounds search via PostGIS RPC
    if (bounds) {
      const [minLng, minLat, maxLng, maxLat] = bounds.split(",").map(Number);
      if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
        const { data, error } = await supabase.rpc("get_tickets_in_bounds", {
          min_lng: minLng,
          min_lat: minLat,
          max_lng: maxLng,
          max_lat: maxLat,
          filter_category: category || null,
          since_time: sinceTime,
        });

        if (error) {
          console.error("Bounds RPC error:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ tickets: data });
      }
    }

    // Default query: public visible tickets
    let query = supabase
      .from("tickets")
      .select("*")
      .eq("hidden", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (sinceTime) {
      query = query.gte("created_at", sinceTime);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tickets: data });
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}
