// scripts/seed.mjs: Inserts ~30 synthetic incidents around Manchester, UK.
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

// 30 Synthetic Incidents around Manchester, UK
const INCIDENTS = [
  {
    code: "MCR-8101",
    category: "theft",
    severity: "medium",
    title: "Bicycle theft from outdoor rack",
    description: "Locked silver Trek hybrid bicycle taken between 14:00 and 15:30. U-lock was cut and left on the ground.",
    location_name: "Tib Street, Northern Quarter",
    lat: 53.4835,
    lng: -2.2355,
    hoursAgo: 4,
    status: "open",
    anonymous: false,
    reporterEmail: "resident1@example.com",
    confirmations: 2,
  },
  {
    code: "MCR-8102",
    category: "suspicious_activity",
    severity: "low",
    title: "Individuals testing car door handles",
    description: "Two people in dark hooded jackets seen checking vehicle door handles along the alleyway behind residential flats.",
    location_name: "Blossom Street, Ancoats",
    lat: 53.4851,
    lng: -2.2289,
    hoursAgo: 6,
    status: "investigating",
    anonymous: true,
    reporterEmail: null,
    confirmations: 3,
  },
  {
    code: "MCR-8103",
    category: "flooding",
    severity: "high",
    title: "Burst water main flooding roadway",
    description: "Deep standing water across both lanes. Vehicles struggling to pass; pedestrian footpath fully submerged.",
    location_name: "Great Ancoats Street near Redhill St",
    lat: 53.4842,
    lng: -2.2271,
    hoursAgo: 2,
    status: "open",
    anonymous: false,
    reporterEmail: "driver99@example.com",
    confirmations: 5,
  },
  {
    code: "MCR-8104",
    category: "accident",
    severity: "medium",
    title: "Two-car collision blocking tram tracks",
    description: "Minor collision at the junction. No critical injuries reported, but tram lines heading east are blocked.",
    location_name: "High Street & Church Street",
    lat: 53.4831,
    lng: -2.2392,
    hoursAgo: 1,
    status: "investigating",
    anonymous: false,
    reporterEmail: "commuter@example.com",
    confirmations: 4,
  },
  {
    code: "MCR-8105",
    category: "missing_person",
    severity: "high",
    title: "Missing elderly gentleman with dementia",
    description: "George, 78, wearing navy padded coat and beige cap. Last seen walking towards the canal path around 11:00 AM.",
    location_name: "Rochdale Canal Towpath, Castlefield",
    lat: 53.4752,
    lng: -2.2531,
    hoursAgo: 5,
    status: "open",
    anonymous: false,
    reporterEmail: "family@example.com",
    confirmations: 7,
  },
  {
    code: "MCR-8106",
    category: "fire",
    severity: "critical",
    title: "Commercial bin store fire with heavy smoke",
    description: "Large industrial wheelie bins on fire adjacent to residential building wall. Fire services have been contacted.",
    location_name: "Little Peter Street, Castlefield",
    lat: 53.4735,
    lng: -2.2498,
    hoursAgo: 1,
    status: "investigating",
    anonymous: false,
    reporterEmail: "safety-watch@example.com",
    confirmations: 6,
  },
  {
    code: "MCR-8107",
    category: "other",
    severity: "low",
    title: "Downed tree branch partially obstructing lane",
    description: "Large willow branch snapped during wind gust. Hangs over cycle lane and sidewalk.",
    location_name: "Oxford Road near University Place",
    lat: 53.4678,
    lng: -2.2335,
    hoursAgo: 8,
    status: "open",
    anonymous: false,
    reporterEmail: "student@example.com",
    confirmations: 1,
  },
  {
    code: "MCR-8108",
    category: "theft",
    severity: "medium",
    title: "Catalytic converter theft from parked hybrid",
    description: "Owner discovered exhaust cut and removed this morning. Car was parked on residential side street overnight.",
    location_name: "Wilmslow Road, Fallowfield",
    lat: 53.4441,
    lng: -2.2185,
    hoursAgo: 12,
    status: "open",
    anonymous: true,
    reporterEmail: null,
    confirmations: 1,
  },
  {
    code: "MCR-8109",
    category: "suspicious_activity",
    severity: "medium",
    title: "Fly-tipping hazardous building waste",
    description: "White unmarked van dumped broken asbestos sheeting and commercial rubble in the public park car park.",
    location_name: "Platt Fields Park, Fallowfield",
    lat: 53.4503,
    lng: -2.2217,
    hoursAgo: 10,
    status: "open",
    anonymous: false,
    reporterEmail: "parkrunner@example.com",
    confirmations: 3,
  },
  {
    code: "MCR-8110",
    category: "accident",
    severity: "low",
    title: "Cyclist collision with opening car door",
    description: "Cyclist doored while travelling southbound in the designated cycleway. Minor cuts; ambulance was declined.",
    location_name: "Chorlton Road, Hulme",
    lat: 53.4682,
    lng: -2.2539,
    hoursAgo: 3,
    status: "resolved",
    anonymous: false,
    reporterEmail: "biker@example.com",
    confirmations: 2,
  },
  {
    code: "MCR-8111",
    category: "theft",
    severity: "high",
    title: "Break-in at independent retail shop",
    description: "Front display glass smashed at approximately 03:30. Electronics and cash register taken.",
    location_name: "Barlow Moor Road, Chorlton",
    lat: 53.4412,
    lng: -2.2789,
    hoursAgo: 14,
    status: "investigating",
    anonymous: false,
    reporterEmail: "trader@example.com",
    confirmations: 5,
  },
  {
    code: "MCR-8112",
    category: "other",
    severity: "medium",
    title: "Exposed electrical cabling on construction hoardings",
    description: "Temporary power conduit damaged, leaving live wires exposed near school crossing.",
    location_name: "Salford Crescent near University",
    lat: 53.4867,
    lng: -2.2721,
    hoursAgo: 7,
    status: "open",
    anonymous: false,
    reporterEmail: "parent@example.com",
    confirmations: 4,
  },
  {
    code: "MCR-8113",
    category: "missing_person",
    severity: "medium",
    title: "Lost Golden Retriever 'Barnaby'",
    description: "Friendly 3-year-old retriever with red collar and tag. Ran off after being spooked by sirens.",
    location_name: "Didsbury Park, Wilmslow Rd",
    lat: 53.4172,
    lng: -2.2311,
    hoursAgo: 9,
    status: "open",
    anonymous: false,
    reporterEmail: "dogowner@example.com",
    confirmations: 3,
  },
  {
    code: "MCR-8114",
    category: "fire",
    severity: "medium",
    title: "Grass and rubbish fire on railway embankment",
    description: "Smouldering debris near trackside fence with visible flames approaching overhanging vegetation.",
    location_name: "Ordsall Lane, Salford",
    lat: 53.4731,
    lng: -2.2685,
    hoursAgo: 3,
    status: "resolved",
    anonymous: true,
    reporterEmail: null,
    confirmations: 2,
  },
  {
    code: "MCR-8115",
    category: "theft",
    severity: "low",
    title: "Package stolen from residential doorstep",
    description: "Courier left delivery on front porch at 12:15. Ring doorbell captured suspect taking it at 12:42.",
    location_name: "Burton Road, West Didsbury",
    lat: 53.4251,
    lng: -2.2429,
    hoursAgo: 8,
    status: "open",
    anonymous: false,
    reporterEmail: "shopper@example.com",
    confirmations: 2,
  },
  {
    code: "MCR-8116",
    category: "flooding",
    severity: "medium",
    title: "River Irwell walkway overspill",
    description: "Water has breached the lower footpath by 20 cm. Dangerous current; path should be avoided.",
    location_name: "Trinity Way riverbank, Salford",
    lat: 53.4889,
    lng: -2.2534,
    hoursAgo: 5,
    status: "open",
    anonymous: false,
    reporterEmail: "runner@example.com",
    confirmations: 3,
  },
  {
    code: "MCR-8117",
    category: "suspicious_activity",
    severity: "high",
    title: "Group aggressively harassing pedestrians",
    description: "Group of four confronting passersby demanding phones and cash outside cashpoint.",
    location_name: "Piccadilly Gardens, City Centre",
    lat: 53.4812,
    lng: -2.2369,
    hoursAgo: 2,
    status: "investigating",
    anonymous: true,
    reporterEmail: null,
    confirmations: 8,
  },
  {
    code: "MCR-8118",
    category: "accident",
    severity: "medium",
    title: "Delivery moped slipped on diesel spill",
    description: "Large diesel slick extending 50 metres along curve. Rider uninjured but surface is extremely slick.",
    location_name: "Cheetham Hill Road & Trinity Way",
    lat: 53.4921,
    lng: -2.2415,
    hoursAgo: 4,
    status: "open",
    anonymous: false,
    reporterEmail: "courier@example.com",
    confirmations: 3,
  },
  {
    code: "MCR-8119",
    category: "theft",
    severity: "medium",
    title: "Tools taken from tradesperson van",
    description: "Side door lock punched out between 01:00 and 06:00. Power tools with identifiable markings missing.",
    location_name: "Cavendish Road, West Didsbury",
    lat: 53.4285,
    lng: -2.2472,
    hoursAgo: 16,
    status: "open",
    anonymous: false,
    reporterEmail: "plumber@example.com",
    confirmations: 2,
  },
  {
    code: "MCR-8120",
    category: "other",
    severity: "low",
    title: "Street lights dark along residential avenue",
    description: "Entire stretch of 8 street lamps dark for the third consecutive night, creating pitch-black footpath.",
    location_name: "Seymour Grove, Old Trafford",
    lat: 53.4568,
    lng: -2.2781,
    hoursAgo: 20,
    status: "open",
    anonymous: false,
    reporterEmail: "localresident@example.com",
    confirmations: 4,
  },
  {
    code: "MCR-8121",
    category: "suspicious_activity",
    severity: "low",
    title: "Drone hovering outside apartment balconies",
    description: "Black consumer quadcopter hovering 3-4 metres from 4th floor windows for 15 minutes.",
    location_name: "New Islington Marina, Ancoats",
    lat: 53.4828,
    lng: -2.2198,
    hoursAgo: 18,
    status: "open",
    anonymous: true,
    reporterEmail: null,
    confirmations: 2,
  },
  {
    code: "MCR-8122",
    category: "accident",
    severity: "low",
    title: "Reversing van cracked boundary wall",
    description: "Delivery van reversed into residential brick boundary wall and drove off without leaving details.",
    location_name: "Upper Brook Street, Victoria Park",
    lat: 53.4601,
    lng: -2.2241,
    hoursAgo: 22,
    status: "open",
    anonymous: false,
    reporterEmail: "homeowner@example.com",
    confirmations: 1,
  },
  {
    code: "MCR-8123",
    category: "theft",
    severity: "low",
    title: "Theft of garden furniture and ornaments",
    description: "Cast iron garden bench and two planters removed from gated front garden overnight.",
    location_name: "Beech Road, Chorlton",
    lat: 53.4385,
    lng: -2.2745,
    hoursAgo: 24,
    status: "open",
    anonymous: false,
    reporterEmail: "resident.beech@example.com",
    confirmations: 1,
  },
  {
    code: "MCR-8124",
    category: "fire",
    severity: "high",
    title: "Kitchen extractor fire in takeaway",
    description: "Flames visible in ventilation duct on rear exterior wall. Staff evacuated safely.",
    location_name: "Rusholme Curry Mile, Wilmslow Rd",
    lat: 53.4542,
    lng: -2.2238,
    hoursAgo: 11,
    status: "resolved",
    anonymous: false,
    reporterEmail: "currymile@example.com",
    confirmations: 5,
  },
  {
    code: "MCR-8125",
    category: "flooding",
    severity: "low",
    title: "Blocked gully causing ponding at bus stop",
    description: "Leaves and silt blocking drain. Waiting passengers are getting splashed by passing vehicles.",
    location_name: "Princess Road near Moss Side",
    lat: 53.4589,
    lng: -2.2472,
    hoursAgo: 26,
    status: "open",
    anonymous: false,
    reporterEmail: "buscommuter@example.com",
    confirmations: 2,
  },
  {
    code: "MCR-8126",
    category: "missing_person",
    severity: "low",
    title: "Found ginger tabby cat with no collar",
    description: "Very friendly young male cat seeking shelter in porch during rain. Currently safe indoors.",
    location_name: "Whalley Range near Manley Park",
    lat: 53.4475,
    lng: -2.2612,
    hoursAgo: 13,
    status: "open",
    anonymous: false,
    reporterEmail: "catrescuer@example.com",
    confirmations: 1,
  },
  {
    code: "MCR-8127",
    category: "suspicious_activity",
    severity: "medium",
    title: "Marking on garden gates with chalk symbols",
    description: "White chalk 'X' and slash markings discovered on several driveway gates in the neighbourhood.",
    location_name: "Lapwing Lane, Didsbury",
    lat: 53.4215,
    lng: -2.2418,
    hoursAgo: 30,
    status: "open",
    anonymous: true,
    reporterEmail: null,
    confirmations: 6,
  },
  {
    code: "MCR-8128",
    category: "theft",
    severity: "medium",
    title: "Phone snatched from pedestrian by e-bike rider",
    description: "Rider in balaclava rode onto pavement from behind and grabbed iPhone from victim's hands.",
    location_name: "Whitworth Street West",
    lat: 53.4745,
    lng: -2.2442,
    hoursAgo: 6,
    status: "open",
    anonymous: false,
    reporterEmail: "victim@example.com",
    confirmations: 4,
  },
  {
    code: "MCR-8129",
    category: "accident",
    severity: "critical",
    title: "Multi-vehicle collision on Mancunian Way",
    description: "Three cars involved on the elevated flyover westbound. Road completely closed; emergency services on scene.",
    location_name: "Mancunian Way (A57M) near Medlock St",
    lat: 53.4715,
    lng: -2.2482,
    hoursAgo: 1,
    status: "investigating",
    anonymous: false,
    reporterEmail: "witness@example.com",
    confirmations: 9,
  },
  {
    code: "MCR-8130",
    category: "other",
    severity: "low",
    title: "Broken glass scattered across children playground",
    description: "Multiple beverage bottles smashed across the soft-surface play area near swings.",
    location_name: "Alexandra Park Play Area, Moss Side",
    lat: 53.4521,
    lng: -2.2495,
    hoursAgo: 15,
    status: "open",
    anonymous: false,
    reporterEmail: "concerned-parent@example.com",
    confirmations: 3,
  },
];

async function seed() {
  console.log("🌱 Starting synthetic database seed (~30 incidents around Manchester)...");

  // Verify connection
  const { error: testErr } = await supabase.from("tickets").select("id").limit(1);
  if (testErr) {
    console.error("❌ Cannot query tickets table:", testErr.message);
    console.error("👉 Please make sure the SQL migration in supabase/migrations/20261115000000_sprint_schema.sql has been run in your Supabase SQL Editor!");
    process.exit(1);
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
              ? "Local council and emergency response teams have addressed this incident. Site is clear."
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
