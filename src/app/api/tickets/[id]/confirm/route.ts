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

    if (!clientToken) {
      return NextResponse.json({ error: "Client token required" }, { status: 400 });
    }

    // Check if already confirmed
    const { data: existing } = await supabaseAdmin
      .from("confirmations")
      .select("id")
      .eq("ticket_id", id)
      .eq("client_token", clientToken)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: "Already confirmed", alreadyConfirmed: true });
    }

    // Insert confirmation (trigger updates confirmation_count on tickets atomically)
    const { error: insertErr } = await supabaseAdmin
      .from("confirmations")
      .insert({
        ticket_id: id,
        client_token: clientToken,
      });

    if (insertErr) {
      console.error("Confirmation error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Fetch updated count
    const { data: updatedTicket } = await supabaseAdmin
      .from("tickets")
      .select("confirmation_count")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      confirmation_count: updatedTicket?.confirmation_count || 1,
    });
  } catch (error) {
    console.error("Confirm POST error:", error);
    return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
  }
}
