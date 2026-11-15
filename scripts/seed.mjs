// scripts/seed.mjs: Inserts 30 synthetic incidents around Lagos, Nigeria.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local not found. Please create it first.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const idx = trimmed.indexOf("=");
    env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Privacy rounding helper matching src/lib/geo.ts
function getPublicCoords(lat, lng, category) {
  if (category === "suspicious_activity" || category === "missing_person") {
    return {
      public_lat: Math.round(lat * 100) / 100,
      public_lng: Math.round(lng * 100) / 100,
    };
  }
  return {
    public_lat: Math.round(lat * 1000000) / 1000000,
    public_lng: Math.round(lng * 1000000) / 1000000,
  };
}

// Expiry days by category
const EXPIRY_DAYS = {
  theft: 7,
  fire: 2,
  accident: 2,
  suspicious_activity: 5,
  flooding: 3,
  missing_person: 14,
  other: 7,
};

// 30 Synthetic Incidents around Lagos, Nigeria
const INCIDENTS = [
  {
    code: "LOS-8101",
    category: "theft",
    severity: "medium",
    title: "Stolen laptop bag from parked vehicle",
    description: "Rear passenger window smashed while vehicle was parked near pharmacy. Black backpack containing work laptop taken.",
    location_name: "Admiralty Way, Lekki Phase 1",
    lat: 6.4474,
    lng: 3.4725,
    hoursAgo: 3,
    status: "open",
    anonymous: false,
    reporterEmail: "resident1@example.com",
    confirmations: 2,
  },
  {
    code: "LOS-8102",
    category: "suspicious_activity",
    severity: "low",
    title: "Individuals loitering near residential gates",
    description: "Three young men loitering near gated residential entrance checking padlocks and observing resident movement.",
    location_name: "Bourdillon Road, Ikoyi",
    lat: 6.4510,
    lng: 3.4420,
    hoursAgo: 5,
    status: "investigating",
    anonymous: true,
    reporterEmail: null,
    confirmations: 4,
  },
  {
    code: "LOS-8103",
    category: "flooding",
    severity: "high",
    title: "Heavy flash flooding blocking main carriageway",
    description: "Deep standing water across both lanes following afternoon downpour. Small sedans turning back; drainage canal overflowing.",
    location_name: "Ozumba Mbadiwe Avenue, Victoria Island",
    lat: 6.4320,
    lng: 3.4280,
    hoursAgo: 2,
    status: "open",
    anonymous: false,
    reporterEmail: "commuter@example.com",
    confirmations: 6,
  },
  {
    code: "LOS-8104",
    category: "accident",
    severity: "medium",
    title: "Two-vehicle collision causing gridlock",
    description: "Commercial mini-bus (Danfo) collided with sedan at intersection. No severe casualties, but westbound traffic is completely stalled.",
    location_name: "Herbert Macaulay Way by Commercial Ave, Yaba",
    lat: 6.5098,
    lng: 3.3789,
    hoursAgo: 1,
    status: "investigating",
    anonymous: false,
    reporterEmail: "yaba_resident@example.com",
    confirmations: 5,
  },
  {
    code: "LOS-8105",
    category: "missing_person",
    severity: "high",
    title: "Missing 74-year-old grandmother with memory loss",
    description: "Mama Folake, 74, wearing green Ankara dress and purple headscarf. Last seen walking towards the market at 10:00 AM.",
    location_name: "Tejuosho Ultra Modern Market, Yaba",
    lat: 6.5050,
    lng: 3.3660,
    hoursAgo: 6,
    status: "open",
    anonymous: false,
    reporterEmail: "family_lagos@example.com",
    confirmations: 8,
  },
  {
    code: "LOS-8106",
    category: "fire",
    severity: "critical",
    title: "Diesel generator enclosure fire behind commercial bank",
    description: "Thick black smoke and visible flames from backup diesel generator casing. Fire service alert dispatched.",
    location_name: "Allen Avenue near Toyin St, Ikeja",
    lat: 6.6012,
    lng: 3.3515,
    hoursAgo: 1,
    status: "investigating",
    anonymous: false,
    reporterEmail: "security_ikeja@example.com",
    confirmations: 7,
  },
  {
    code: "LOS-8107",
    category: "theft",
    severity: "low",
    title: "Side mirror theft from parked SUV",
    description: "Both electric side mirrors removed from Toyota Prado parked outside grocery store within 20 minutes.",
    location_name: "Isaac John Street, GRA Ikeja",
    lat: 6.5890,
    lng: 3.3580,
    hoursAgo: 4,
    status: "open",
    anonymous: false,
    reporterEmail: "carowner@example.com",
    confirmations: 3,
  },
  {
    code: "LOS-8108",
    category: "other",
    severity: "medium",
    title: "Fallen telecoms transmission cable hanging low",
    description: "Overhead telecom cable detached from pole and hanging across street at chest height, posing hazard to motorcyclists.",
    location_name: "Adeniran Ogunsanya Street, Surulere",
    lat: 6.4975,
    lng: 3.3582,
    hoursAgo: 7,
    status: "open",
    anonymous: false,
    reporterEmail: "cyclist_s@example.com",
    confirmations: 2,
  },
  {
    code: "LOS-8109",
    category: "flooding",
    severity: "medium",
    title: "Blocked storm drain causing knee-deep water on walkway",
    description: "Plastic debris has completely blocked the street culvert; water backing up onto pedestrian pavement and residential frontages.",
    location_name: "Fola Osibo Street, Lekki Phase 1",
    lat: 6.4440,
    lng: 3.4790,
    hoursAgo: 3,
    status: "open",
    anonymous: false,
    reporterEmail: "lekki_watch@example.com",
    confirmations: 4,
  },
  {
    code: "LOS-8110",
    category: "suspicious_activity",
    severity: "medium",
    title: "Suspicious unmarked van parked near primary school",
    description: "Dark tinted white van parked with engine running near school drop-off zone for over two hours with no driver visible.",
    location_name: "University Road, Akoka",
    lat: 6.5185,
    lng: 3.3965,
    hoursAgo: 2,
    status: "investigating",
    anonymous: true,
    reporterEmail: null,
    confirmations: 5,
  },
  {
    code: "LOS-8111",
    category: "accident",
    severity: "low",
    title: "Broken down articulated truck obstructing inner lane",
    description: "Container truck broke axle and is stationary on the incline, narrowing road to a single lane.",
    location_name: "Odo-Olowu Bus Stop, Ikorodu Road, Anthony",
    lat: 6.5650,
    lng: 3.3690,
    hoursAgo: 3,
    status: "open",
    anonymous: false,
    reporterEmail: "driver_lag@example.com",
    confirmations: 3,
  },
  {
    code: "LOS-8112",
    category: "theft",
    severity: "high",
    title: "Phone snatching incident by motorcycle pillion",
    description: "Pedestrian walking with phone had device grabbed by passenger on unregistered motorcycle speeding towards expressway.",
    location_name: "Adeola Odeku Street, Victoria Island",
    lat: 6.4295,
    lng: 3.4215,
    hoursAgo: 4,
    status: "open",
    anonymous: false,
    reporterEmail: "resident_vi@example.com",
    confirmations: 6,
  },
  {
    code: "LOS-8113",
    category: "fire",
    severity: "medium",
    title: "Sparks and fire from roadside electricity transformer",
    description: "Loud explosive bang followed by persistent smoking and sparks from neighborhood distribution transformer.",
    location_name: "Bode Thomas Street, Surulere",
    lat: 6.4910,
    lng: 3.3520,
    hoursAgo: 2,
    status: "investigating",
    anonymous: false,
    reporterEmail: "community_st@example.com",
    confirmations: 8,
  },
  {
    code: "LOS-8114",
    category: "other",
    severity: "low",
    title: "Missing manhole cover on unlit pedestrian footpath",
    description: "Cast iron drain cover removed or collapsed leaving a 2-meter deep open hole directly along the walking route.",
    location_name: "Broad Street, Lagos Island",
    lat: 6.4535,
    lng: 3.3890,
    hoursAgo: 8,
    status: "open",
    anonymous: false,
    reporterEmail: "pedestrian_li@example.com",
    confirmations: 4,
  },
  {
    code: "LOS-8115",
    category: "theft",
    severity: "medium",
    title: "Car battery and ECU stolen overnight",
    description: "Vehicle parked inside unsecured estate compound had bonnet forced open; battery and ECU unit stolen.",
    location_name: "Ahmadu Bello Way, Victoria Island",
    lat: 6.4245,
    lng: 3.4095,
    hoursAgo: 10,
    status: "open",
    anonymous: false,
    reporterEmail: "victim_v@example.com",
    confirmations: 2,
  },
  {
    code: "LOS-8116",
    category: "suspicious_activity",
    severity: "low",
    title: "Fake utility inspectors requesting indoor access",
    description: "Two individuals without proper identification badges claiming to inspect water meters and demanding gate access.",
    location_name: "Glover Road, Ikoyi",
    lat: 6.4460,
    lng: 3.4505,
    hoursAgo: 5,
    status: "resolved",
    anonymous: true,
    reporterEmail: null,
    confirmations: 3,
  },
  {
    code: "LOS-8117",
    category: "flooding",
    severity: "high",
    title: "Canal overflow flooding access bridge",
    description: "Tidal surge and heavy rain causing canal water to crest over the access bridge. Impassable for light motor traffic.",
    location_name: "Freedom Way, Lekki Phase 1",
    lat: 6.4380,
    lng: 3.4900,
    hoursAgo: 4,
    status: "investigating",
    anonymous: false,
    reporterEmail: "lekki_comm@example.com",
    confirmations: 7,
  },
  {
    code: "LOS-8118",
    category: "accident",
    severity: "critical",
    title: "Multi-vehicle pileup on flyover descent",
    description: "Three vehicles involved in collision on bridge descent. Emergency response teams on scene; traffic diverted.",
    location_name: "Oshodi Interchange, Oshodi",
    lat: 6.5540,
    lng: 3.3480,
    hoursAgo: 1,
    status: "investigating",
    anonymous: false,
    reporterEmail: "eyewitness@example.com",
    confirmations: 9,
  },
  {
    code: "LOS-8119",
    category: "missing_person",
    severity: "medium",
    title: "Lost 9-year-old boy in school uniform",
    description: "Boy named Chidi, 9 years old, wearing white shirt and navy trousers with primary school crest. Separated from caregiver.",
    location_name: "Maryland Mall surroundings, Maryland",
    lat: 6.5710,
    lng: 3.3685,
    hoursAgo: 3,
    status: "open",
    anonymous: false,
    reporterEmail: "helper@example.com",
    confirmations: 6,
  },
  {
    code: "LOS-8120",
    category: "other",
    severity: "low",
    title: "Streetlight failure causing pitch black intersection",
    description: "Entire row of streetlights non-operational for three consecutive nights at busy pedestrian junction.",
    location_name: "Marina Promenade, Lagos Island",
    lat: 6.4510,
    lng: 3.3960,
    hoursAgo: 12,
    status: "open",
    anonymous: false,
    reporterEmail: "island_civic@example.com",
    confirmations: 3,
  },
  {
    code: "LOS-8121",
    category: "theft",
    severity: "low",
    title: "Shoplifting incident at electronics store",
    description: "Customer concealed two wireless headphones and exited through fire door onto service lane.",
    location_name: "Computer Village, Otigba Street, Ikeja",
    lat: 6.5980,
    lng: 3.3440,
    hoursAgo: 6,
    status: "resolved",
    anonymous: false,
    reporterEmail: "store_mgr@example.com",
    confirmations: 2,
  },
  {
    code: "LOS-8122",
    category: "suspicious_activity",
    severity: "medium",
    title: "Nighttime flashlight activity inside vacant construction site",
    description: "Trespassers observed using flashlights inside abandoned building site after midnight hours.",
    location_name: "Mobolaji Bank Anthony Way, Ikeja",
    lat: 6.5820,
    lng: 3.3590,
    hoursAgo: 8,
    status: "investigating",
    anonymous: true,
    reporterEmail: null,
    confirmations: 4,
  },
  {
    code: "LOS-8123",
    category: "fire",
    severity: "low",
    title: "Rubbish bonfire spreading near perimeter fence",
    description: "Refuse burning on empty plot left unattended and encroaching on dry wooden perimeter fence.",
    location_name: "Commercial Avenue, Sabo Yaba",
    lat: 6.5120,
    lng: 3.3760,
    hoursAgo: 2,
    status: "resolved",
    anonymous: false,
    reporterEmail: "neighbor_y@example.com",
    confirmations: 3,
  },
  {
    code: "LOS-8124",
    category: "accident",
    severity: "medium",
    title: "Motorcycle and pedestrian collision at zebra crossing",
    description: "Dispatch rider struck pedestrian crossing at marked zebra crossing. First aid administered on site.",
    location_name: "Town Planning Way, Ilupeju",
    lat: 6.5520,
    lng: 3.3650,
    hoursAgo: 4,
    status: "resolved",
    anonymous: false,
    reporterEmail: "firstaider@example.com",
    confirmations: 5,
  },
  {
    code: "LOS-8125",
    category: "flooding",
    severity: "low",
    title: "Standing pool of stagnant water near bus terminal",
    description: "Poor grading after road work leaving 15cm standing pool, creating severe splash hazard.",
    location_name: "Ojuelegba Underbridge, Surulere",
    lat: 6.5110,
    lng: 3.3620,
    hoursAgo: 14,
    status: "open",
    anonymous: false,
    reporterEmail: "transit_user@example.com",
    confirmations: 1,
  },
  {
    code: "LOS-8126",
    category: "theft",
    severity: "high",
    title: "Armed robbery at retail supermarket cash desk",
    description: "Two armed suspects entered supermarket just before closing, took register cash and staff mobile phones.",
    location_name: "Opebi Road, Ikeja",
    lat: 6.5910,
    lng: 3.3540,
    hoursAgo: 16,
    status: "investigating",
    anonymous: false,
    reporterEmail: "cashier@example.com",
    confirmations: 7,
  },
  {
    code: "LOS-8127",
    category: "missing_person",
    severity: "low",
    title: "Lost pet Golden Retriever with red collar",
    description: "Family dog 'Max' slipped leash near estate park. Very friendly, answers to whistle.",
    location_name: "Parkview Estate Entrance, Ikoyi",
    lat: 6.4550,
    lng: 3.4470,
    hoursAgo: 7,
    status: "open",
    anonymous: false,
    reporterEmail: "pet_owner@example.com",
    confirmations: 2,
  },
  {
    code: "LOS-8128",
    category: "suspicious_activity",
    severity: "high",
    title: "Attempted ATM skimming device discovered",
    description: "Suspicious false bezel and pinhole camera overlay found attached to cash dispenser slot at bank branch.",
    location_name: "Aromire Avenue, Ikeja",
    lat: 6.5970,
    lng: 3.3490,
    hoursAgo: 5,
    status: "resolved",
    anonymous: false,
    reporterEmail: "bank_tech@example.com",
    confirmations: 4,
  },
  {
    code: "LOS-8129",
    category: "other",
    severity: "high",
    title: "Open electrical cable sparking on wet pavement",
    description: "Severed armored power cable exposed on sidewalk spitting blue sparks near drainage channel.",
    location_name: "Aguda, Surulere",
    lat: 6.4880,
    lng: 3.3450,
    hoursAgo: 2,
    status: "open",
    anonymous: false,
    reporterEmail: "resident_ag@example.com",
    confirmations: 6,
  },
  {
    code: "LOS-8130",
    category: "accident",
    severity: "medium",
    title: "Overturned water delivery tanker blocking street",
    description: "Commercial water tanker overturned on sharp corner. Tank ruptured and road surface slick with silt.",
    location_name: "Chevron Drive, Lekki",
    lat: 6.4350,
    lng: 3.5250,
    hoursAgo: 3,
    status: "investigating",
    anonymous: false,
    reporterEmail: "driver_c@example.com",
    confirmations: 4,
  },
];

async function seed() {
  console.log("🌱 Starting synthetic database seed (30 incidents around Lagos, Nigeria)...");

  // Verify connection
  const { error: testErr } = await supabase.from("tickets").select("id").limit(1);
  if (testErr) {
    console.error("❌ Cannot query tickets table:", testErr.message);
    process.exit(1);
  }

  // Clean up previous Manchester synthetic data if present
  const { error: delErr } = await supabase.from("tickets").delete().ilike("reference_code", "MCR-%");
  if (delErr) {
    console.warn("⚠️ Note on cleaning old MCR records:", delErr.message);
  } else {
    console.log("🧹 Cleaned up old Manchester synthetic tickets (MCR-%).");
  }

  let insertedCount = 0;
  const now = new Date();

  for (const inc of INCIDENTS) {
    const incidentTime = new Date(now.getTime() - inc.hoursAgo * 60 * 60 * 1000);
    const expiryDays = EXPIRY_DAYS[inc.category] || 7;
    const expiresAt = new Date(incidentTime.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    const { public_lat, public_lng } = getPublicCoords(inc.lat, inc.lng, inc.category);

    // Compute email hash if email provided
    const emailHash = inc.reporterEmail
      ? crypto.createHash("sha256").update(inc.reporterEmail.toLowerCase().trim()).digest("hex")
      : null;

    // Check if ticket already exists
    const { data: existing } = await supabase
      .from("tickets")
      .select("id")
      .eq("reference_code", inc.code)
      .maybeSingle();

    let ticketId;

    if (!existing) {
      // 1. Insert public ticket
      const { data: ticket, error: tErr } = await supabase
        .from("tickets")
        .insert({
          reference_code: inc.code,
          category: inc.category,
          severity: inc.severity,
          title: inc.title,
          description: inc.description,
          status: inc.status,
          location_name: inc.location_name,
          public_lat,
          public_lng,
          is_anonymous: inc.anonymous,
          confirmation_count: inc.confirmations,
          flag_count: 0,
          hidden: false,
          incident_time: incidentTime.toISOString(),
          created_at: incidentTime.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select("id")
        .single();

      if (tErr) {
        console.error(`Failed to insert ticket ${inc.code}:`, tErr.message);
        continue;
      }

      ticketId = ticket.id;

      // 2. Insert private record (exact coordinates + reporter details)
      const { error: pErr } = await supabase.from("ticket_private").insert({
        ticket_id: ticketId,
        exact_lat: inc.lat,
        exact_lng: inc.lng,
        reporter_email: inc.reporterEmail,
        reporter_email_hash: emailHash,
        created_at: incidentTime.toISOString(),
      });

      if (pErr) {
        console.warn(`Private record error for ${inc.code}:`, pErr.message);
      }

      // 3. Add timeline update if investigating or resolved
      if (inc.status === "investigating" || inc.status === "resolved") {
        await supabase.from("ticket_updates").insert({
          ticket_id: ticketId,
          author_role: "admin",
          status_change: inc.status,
          message:
            inc.status === "resolved"
              ? "Local safety and municipal response teams have addressed this incident. Site is clear."
              : "Community safety patrol dispatched to inspect the area.",
          created_at: new Date(incidentTime.getTime() + 30 * 60 * 1000).toISOString(),
        });
      }

      // 4. Add a sample comment for community engagement
      if (inc.confirmations > 2) {
        await supabase.from("comments").insert({
          ticket_id: ticketId,
          author_name: "Neighbourhood Watch",
          content: "Thanks for reporting. Nearby residents have been notified to remain observant.",
          created_at: new Date(incidentTime.getTime() + 45 * 60 * 1000).toISOString(),
        });
      }

      insertedCount++;
    } else {
      ticketId = existing.id;
    }
  }

  console.log(`✅ Database seed finished. Inserted ${insertedCount} new incidents (total ${INCIDENTS.length} available).`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
