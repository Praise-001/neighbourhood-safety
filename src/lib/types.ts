export type IncidentCategory =
  | "theft"
  | "fire"
  | "accident"
  | "suspicious_activity"
  | "flooding"
  | "missing_person"
  | "other";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "open" | "investigating" | "resolved" | "closed";

export interface Ticket {
  id: string;
  reference_code: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  title: string;
  description: string;
  status: IncidentStatus;
  location_name: string | null;
  public_lat: number;
  public_lng: number;
  photo_url: string | null;
  is_anonymous: boolean;
  flag_count: number;
  confirmation_count: number;
  hidden: boolean;
  incident_time: string;
  created_at: string;
  expires_at: string;
}

export interface TicketPrivate {
  id: string;
  ticket_id: string;
  exact_lat: number;
  exact_lng: number;
  reporter_id: string | null;
  reporter_email_hash: string | null;
  reporter_email: string | null;
  created_at: string;
}

export interface TicketUpdate {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_role: "user" | "admin";
  status_change: IncidentStatus | null;
  message: string;
  created_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Confirmation {
  id: string;
  ticket_id: string;
  user_id: string | null;
  client_token: string;
  created_at: string;
}

export interface Flag {
  id: string;
  ticket_id: string;
  user_id: string | null;
  client_token: string;
  reason: string;
  created_at: string;
}

export interface AlertSettings {
  id: string;
  user_id: string | null;
  client_token: string;
  home_lat: number;
  home_lng: number;
  radius_meters: 500 | 1000 | 5000;
  created_at: string;
  updated_at: string;
}

export const CATEGORIES: { value: IncidentCategory; label: string; icon: string; sensitive?: boolean; defaultExpiryDays: number }[] = [
  { value: "theft", label: "Theft / Burglary", icon: "🚨", defaultExpiryDays: 7 },
  { value: "fire", label: "Fire / Smoke", icon: "🔥", defaultExpiryDays: 2 },
  { value: "accident", label: "Accident / Collision", icon: "🚗", defaultExpiryDays: 2 },
  { value: "suspicious_activity", label: "Suspicious Activity", icon: "👁️", sensitive: true, defaultExpiryDays: 5 },
  { value: "flooding", label: "Flooding / Hazard", icon: "🌊", defaultExpiryDays: 3 },
  { value: "missing_person", label: "Missing Person / Pet", icon: "🔍", sensitive: true, defaultExpiryDays: 14 },
  { value: "other", label: "Other Hazard", icon: "⚠️", defaultExpiryDays: 7 },
];

export const SEVERITIES: { value: IncidentSeverity; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200" },
];
