import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

const alertSchema = z.object({
  client_token: z.string().min(1),
  home_lat: z.number().min(-90).max(90),
  home_lng: z.number().min(-180).max(180),
  radius_meters: z.union([z.literal(500), z.literal(1000), z.literal(5000)]),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientToken = searchParams.get("client_token");

    if (!clientToken) {
      return NextResponse.json({ error: "Client token required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("alert_settings")
      .select("*")
      .eq("client_token", clientToken)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error("GET /api/alerts error:", error);
    return NextResponse.json({ error: "Failed to load alerts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = alertSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { client_token, home_lat, home_lng, radius_meters } = result.data;

    const { data, error } = await supabaseAdmin
      .from("alert_settings")
      .upsert(
        {
          client_token,
          home_lat,
          home_lng,
          radius_meters,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_token" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Alert settings save error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    console.error("POST /api/alerts error:", error);
    return NextResponse.json({ error: "Failed to save alert settings" }, { status: 500 });
  }
}
