import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

const commentSchema = z.object({
  author_name: z.string().trim().max(50).optional(),
  content: z
    .string()
    .trim()
    .min(2, "Comment must be at least 2 characters.")
    .max(500, "Comment cannot exceed 500 characters."),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = commentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { author_name, content } = result.data;

    // Check ticket exists and is visible
    const { data: ticket } = await supabaseAdmin
      .from("tickets")
      .select("id, hidden, expires_at")
      .eq("id", id)
      .maybeSingle();

    if (!ticket || ticket.hidden) {
      return NextResponse.json({ error: "Cannot comment on this incident" }, { status: 404 });
    }

    const { data: comment, error } = await supabaseAdmin
      .from("comments")
      .insert({
        ticket_id: id,
        author_name: author_name && author_name.trim() ? author_name.trim() : "Neighbour",
        content,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Comment insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error("Comment error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
