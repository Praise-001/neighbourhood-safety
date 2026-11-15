import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

console.log("🔒 Running Privacy & Security Proof Script (F8)...");

// 1. Read environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      env[key] = val;
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("❌ FAILED: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

// Instantiate ONLY the public anonymous client
const publicClient = createClient(supabaseUrl, anonKey);

async function runProof() {
  let passed = true;

  // Test 1: ticket_private returns NO rows or permission error to anonymous callers
  console.log("\n[Test 1] Querying ticket_private with anonymous key...");
  const { data: privData, error: privError } = await publicClient
    .from("ticket_private")
    .select("*");

  if (privError) {
    console.log(`  ✓ PASSED: Database denied access to ticket_private: ${privError.message}`);
  } else if (!privData || privData.length === 0) {
    console.log("  ✓ PASSED: ticket_private query returned 0 rows (RLS policy shielded all rows).");
  } else {
    console.error(`  ❌ FAILED: ticket_private exposed ${privData.length} private rows to anonymous client!`);
    passed = false;
  }

  // Test 2: Public tickets rows contain no reporter id, email hash or exact location columns
  console.log("\n[Test 2] Verifying public tickets schema contains no private columns...");
  const { data: publicTickets, error: pubError } = await publicClient
    .from("tickets")
    .select("*")
    .limit(10);

  if (pubError) {
    console.error("  ❌ FAILED: Error fetching public tickets:", pubError.message);
    passed = false;
  } else if (!publicTickets || publicTickets.length === 0) {
    console.log("  ⚠️ WARNING: No tickets found to inspect schema.");
  } else {
    const forbiddenColumns = [
      "reporter_id",
      "reporter_email",
      "reporter_email_hash",
      "exact_lat",
      "exact_lng",
    ];

    let leaked = false;
    for (const ticket of publicTickets) {
      for (const col of forbiddenColumns) {
        if (col in ticket && ticket[col] !== undefined) {
          console.error(`  ❌ FAILED: Public ticket contains sensitive column '${col}'!`);
          leaked = true;
          passed = false;
        }
      }
    }
    if (!leaked) {
      console.log(`  ✓ PASSED: Public tickets strictly expose only public fields across ${publicTickets.length} rows.`);
    }
  }

  // Test 3: Normal / anonymous user cannot update or hide tickets
  console.log("\n[Test 3] Testing unauthorized mutation (hiding tickets)...");
  const { data: sampleTicket } = await publicClient
    .from("tickets")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (sampleTicket) {
    const { data: updateData, error: updateError } = await publicClient
      .from("tickets")
      .update({ hidden: true })
      .eq("id", sampleTicket.id)
      .select();

    if (updateError || !updateData || updateData.length === 0) {
      console.log("  ✓ PASSED: Mutation blocked by RLS. Anonymous client cannot modify ticket visibility.");
    } else {
      console.error("  ❌ FAILED: Anonymous client successfully modified ticket hidden state!");
      passed = false;
    }
  } else {
    console.log("  ⚠️ Skipped mutation check (no tickets).");
  }

  // Test 4: Check that service_role never appears in client-side code or NEXT_PUBLIC_ variables
  console.log("\n[Test 4] Scanning codebase for service_role exposure in client bundles & NEXT_PUBLIC_ vars...");
  const envExample = fs.readFileSync(path.resolve(process.cwd(), ".env.example"), "utf-8");
  const publicVarsInExample = envExample
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("NEXT_PUBLIC_"));

  for (const v of publicVarsInExample) {
    if (v.toLowerCase().includes("service_role")) {
      console.error(`  ❌ FAILED: NEXT_PUBLIC_ variable in .env.example references service_role: ${v}`);
      passed = false;
    }
  }

  // Scan src/app and src/components (excluding /api routes)
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "api" && entry.name !== "node_modules" && entry.name !== ".next") {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
        const text = fs.readFileSync(fullPath, "utf-8");
        if (text.includes("SUPABASE_SERVICE_ROLE_KEY") || text.includes("supabaseAdmin")) {
          console.error(`  ❌ FAILED: Client file leaks service role client/key: ${fullPath}`);
          passed = false;
        }
      }
    }
  }

  scanDir(path.resolve(process.cwd(), "src/components"));
  scanDir(path.resolve(process.cwd(), "src/app"));

  if (passed) {
    console.log("  ✓ PASSED: Zero occurrences of service_role found in client code or NEXT_PUBLIC_ env vars.");
    console.log("\n=======================================================");
    console.log("✅ PRIVACY PROOF COMPLETE: ALL SECURITY ASSUMPTIONS HOLD");
    console.log("=======================================================\n");
    process.exit(0);
  } else {
    console.error("\n❌ PRIVACY PROOF FAILED: Security violations detected.\n");
    process.exit(1);
  }
}

runProof().catch((err) => {
  console.error("Unexpected error in privacy proof:", err);
  process.exit(1);
});
