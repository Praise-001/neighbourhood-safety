import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const clientToken = body.client_token;
    const reason = body.reason || "false_report";

    if (!clientToken) {
      return NextResponse.json({ error: "Client token required" }, { status: 400 });
    }

    // Check if client already flagged
    const { data: existing } = await supabaseAdmin
      .from("flags")
      .select("id")
      .eq("ticket_id", id)
      .eq("client_token", clientToken)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: "Already flagged", alreadyFlagged: true });
    }

    const { error: insertErr } = await supabaseAdmin
      .from("flags")
      .insert({
        ticket_id: id,
        client_token: clientToken,
        reason,
      });

    if (insertErr) {
      console.error("Flag insert error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const { data: updatedTicket } = await supabaseAdmin
      .from("tickets")
      .select("flag_count, hidden")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      flag_count: updatedTicket?.flag_count || 1,
      hidden: updatedTicket?.hidden || false,
    });
  } catch (error) {
    console.error("Flag POST error:", error);
    return NextResponse.json({ error: "Failed to submit flag" }, { status: 500 });
  }
}
