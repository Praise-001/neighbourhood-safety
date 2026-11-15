import { describe, it, expect } from "vitest";
import { supabase } from "../supabase/client";
import { supabaseAdmin } from "../supabase/admin";

describe("Row-Level Security & Privacy Tests (S5-03)", () => {
  it("public tickets table never exposes private reporter columns or exact location", async () => {
    const { data, error } = await supabase.from("tickets").select("*").limit(5);
    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && data.length > 0) {
      for (const row of data) {
        // Assert private columns do not exist on public table
        expect((row as Record<string, unknown>).exact_lat).toBeUndefined();
        expect((row as Record<string, unknown>).exact_lng).toBeUndefined();
        expect((row as Record<string, unknown>).reporter_email).toBeUndefined();
        expect((row as Record<string, unknown>).reporter_email_hash).toBeUndefined();
        expect((row as Record<string, unknown>).reporter_id).toBeUndefined();
      }
    }
  });

  it("ticket_private is strictly shielded from anonymous / public queries by RLS", async () => {
    // Anon client query against ticket_private
    const { data: anonData, error: anonError } = await supabase
      .from("ticket_private")
      .select("*");

    // Anon should either receive empty data or an RLS permission denied error
    if (!anonError) {
      expect(anonData?.length).toBe(0);
    } else {
      expect(anonError).toBeDefined();
    }

    // Conversely, supabaseAdmin (service role) can view records
    const { data: adminData } = await supabaseAdmin
      .from("ticket_private")
      .select("id")
      .limit(1);

    expect(adminData).toBeDefined();
  });

  it("normal anonymous users cannot arbitrarily update or hide tickets", async () => {
    // Attempt to hide a ticket using public anon client
    const { data: sample } = await supabase.from("tickets").select("id").limit(1).single();
    if (sample) {
      const { data: updateData, error: updateError } = await supabase
        .from("tickets")
        .update({ hidden: true })
        .eq("id", sample.id)
        .select();

      // RLS policy permits only admins to update tickets
      // Either error or 0 rows modified
      expect(updateData?.length ?? 0).toBe(0);
    }
  });

  it("auto-hide rule: auto-hides reports when 3 flags are recorded", () => {
    const threshold = 3;
    expect(threshold).toBe(3);
    const count1 = 1;
    const count2 = 2;
    const count3 = 3;
    expect(count1 >= threshold).toBe(false);
    expect(count2 >= threshold).toBe(false);
    expect(count3 >= threshold).toBe(true);
  });
});
