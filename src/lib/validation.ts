import { z } from "zod";

export const reportSchema = z.object({
  category: z.enum([
    "theft",
    "fire",
    "accident",
    "suspicious_activity",
    "flooding",
    "missing_person",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(100, "Title cannot exceed 100 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Please describe the incident in at least 10 characters.")
    .max(1500, "Description cannot exceed 1500 characters."),
  incident_time: z.string().optional().or(z.literal("")),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  location_name: z.string().trim().max(200).optional().nullable(),
  is_anonymous: z.boolean().default(false),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("")),
  photo_url: z.string().url().optional().or(z.literal("")),
});

export type ReportFormData = z.infer<typeof reportSchema>;
