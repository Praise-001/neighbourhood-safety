import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const clientToken = searchParams.get("client_token");

    // 1. Fetch ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (ticketErr) {
      return NextResponse.json({ error: ticketErr.message }, { status: 500 });
    }

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // 2. Fetch updates (timeline)
    const { data: updates } = await supabase
      .from("ticket_updates")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    // 3. Fetch comments
    const { data: comments } = await supabase
      .from("comments")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    // 4. Check if client token has already confirmed or flagged
    let hasConfirmed = false;
    let hasFlagged = false;

    if (clientToken) {
      const { data: confirmRecord } = await supabase
        .from("confirmations")
        .select("id")
        .eq("ticket_id", id)
        .eq("client_token", clientToken)
        .maybeSingle();

      hasConfirmed = !!confirmRecord;

      const { data: flagRecord } = await supabase
        .from("flags")
        .select("id")
        .eq("ticket_id", id)
        .eq("client_token", clientToken)
        .maybeSingle();

      hasFlagged = !!flagRecord;
    }

    return NextResponse.json({
      ticket,
      updates: updates || [],
      comments: comments || [],
      hasConfirmed,
      hasFlagged,
    });
  } catch (error) {
    console.error("GET /api/tickets/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
