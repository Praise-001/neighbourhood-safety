import { supabaseAdmin } from "./supabase/admin";
import crypto from "node:crypto";

export interface RateLimitResult {
  allowed: boolean;
  message?: string;
}

/**
 * Enforces S2-06 abuse limit: max 5 reports per hour per email or reporter ID.
 */
export async function checkReportAbuseLimit(params: {
  email?: string | null;
  reporterId?: string | null;
}): Promise<RateLimitResult> {
  const { email, reporterId } = params;

  // If no identifier provided, allow
  if (!email && !reporterId) {
    return { allowed: true };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  let emailHash: string | null = null;
  if (email && email.trim()) {
    emailHash = crypto
      .createHash("sha256")
      .update(email.toLowerCase().trim())
      .digest("hex");
  }

  try {
    let query = supabaseAdmin
      .from("ticket_private")
      .select("id", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);

    if (emailHash && reporterId) {
      query = query.or(`reporter_email_hash.eq.${emailHash},reporter_id.eq.${reporterId}`);
    } else if (emailHash) {
      query = query.eq("reporter_email_hash", emailHash);
    } else if (reporterId) {
      query = query.eq("reporter_id", reporterId);
    }

    const { count, error } = await query;

    if (error) {
      console.warn("Rate limit check error:", error.message);
      // Fail open to avoid blocking legitimate users on lookup glitch
      return { allowed: true };
    }

    if (count !== null && count >= 5) {
      return {
        allowed: false,
        message: "You have reached the maximum limit of 5 reports per hour. Please try again later.",
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("Abuse limit check failed:", err);
    return { allowed: true };
  }
}
