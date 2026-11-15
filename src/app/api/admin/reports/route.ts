import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function verifyAdminAuth(req: NextRequest): Promise<{ authorized: true; userId: string } | { authorized: false; status: number; error: string }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authorized: false, status: 401, error: "Authentication required. Please sign in as an admin." };
  }

  const token = authHeader.substring(7).trim();
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return { authorized: false, status: 401, error: "Invalid or expired session. Please sign in again." };
  }

  // Verify role in profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, banned")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin" || profile.banned) {
    return { authorized: false, status: 403, error: "Access denied. Administrator privileges required." };
  }

  return { authorized: true, userId: user.id };
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // List flagged or hidden tickets
    const { data: tickets, error } = await supabaseAdmin
      .from("tickets")
      .select("*, ticket_private(exact_lat, exact_lng, reporter_email, reporter_email_hash)")
      .or("flag_count.gt.0,hidden.eq.true")
      .order("flag_count", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also get all banned emails/profiles for reference
    const { data: bannedProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, banned")
      .eq("banned", true);

    return NextResponse.json({
      tickets: tickets || [],
      bannedProfiles: bannedProfiles || [],
    });
  } catch (err) {
    console.error("GET /api/admin/reports error:", err);
    return NextResponse.json({ error: "Failed to load admin reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const { action, ticket_id, reporter_id } = body;

    if (!action || !ticket_id) {
      return NextResponse.json({ error: "Action and ticket_id are required" }, { status: 400 });
    }

    if (action === "restore") {
      // Restore ticket: set hidden to false and reset flag_count
      const { error } = await supabaseAdmin
        .from("tickets")
        .update({ hidden: false, flag_count: 0 })
        .eq("id", ticket_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Add official timeline update
      await supabaseAdmin.from("ticket_updates").insert({
        ticket_id,
        author_role: "admin",
        message: "Report was reviewed by community moderators and restored.",
      });

      return NextResponse.json({ success: true, message: "Report restored" });
    }

    if (action === "remove") {
      // Remove ticket permanently
      const { error } = await supabaseAdmin
        .from("tickets")
        .delete()
        .eq("id", ticket_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Report removed" });
    }

    if (action === "ban") {
      // Ban user or reporter
      if (reporter_id) {
        await supabaseAdmin
          .from("profiles")
          .update({ banned: true })
          .eq("id", reporter_id);
      }

      // Hide all tickets from this reporter
      const { data: priv } = await supabaseAdmin
        .from("ticket_private")
        .select("reporter_email_hash")
        .eq("ticket_id", ticket_id)
        .maybeSingle();

      if (priv?.reporter_email_hash) {
        const { data: userTickets } = await supabaseAdmin
          .from("ticket_private")
          .select("ticket_id")
          .eq("reporter_email_hash", priv.reporter_email_hash);

        if (userTickets && userTickets.length > 0) {
          const ids = userTickets.map((t) => t.ticket_id);
          await supabaseAdmin
            .from("tickets")
            .update({ hidden: true })
            .in("id", ids);
        }
      }

      return NextResponse.json({ success: true, message: "User banned and reports hidden" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/admin/reports error:", err);
    return NextResponse.json({ error: "Failed to process admin action" }, { status: 500 });
  }
}
