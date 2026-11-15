"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES, SEVERITIES, IncidentCategory, IncidentSeverity } from "@/lib/types";
import { LocationPicker } from "@/components/location-picker";
import { stripExifAndProcessPhoto } from "@/lib/image-strip";

export default function ReportPage() {
  const [category, setCategory] = useState<IncidentCategory>("theft");
  const [severity, setSeverity] = useState<IncidentSeverity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [email, setEmail] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [useCurrentTime, setUseCurrentTime] = useState(true);

  // Default coordinates (Manchester center)
  const [lat, setLat] = useState(53.4808);
  const [lng, setLng] = useState(-2.2426);
  const [locationName, setLocationName] = useState("Manchester, UK");

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStrippedNotice, setPhotoStrippedNotice] = useState(false);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successCode, setSuccessCode] = useState<string | null>(null);

  // Handle Photo selection with browser EXIF stripping (S2-04)
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      setErrorMsg(null);
      // Strip EXIF metadata and GPS tags in browser
      const { blob } = await stripExifAndProcessPhoto(file);
      const strippedFile = new File([blob], file.name, { type: "image/jpeg" });
      setPhotoFile(strippedFile);

      // Create preview
      const previewUrl = URL.createObjectURL(blob);
      setPhotoPreview(previewUrl);
      setPhotoStrippedNotice(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error processing photo";
      setErrorMsg(message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoStrippedNotice(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setFieldErrors({});

    try {
      let uploadedPhotoUrl: string | null = null;

      // Upload stripped photo if present
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedPhotoUrl = uploadData.url;
        } else {
          console.warn("Photo upload failed, continuing with report submission");
        }
      }

      // Submit report
      const payload = {
        category,
        severity,
        title,
        description,
        lat,
        lng,
        location_name: locationName || undefined,
        is_anonymous: isAnonymous,
        email: email || undefined,
        incident_time: useCurrentTime ? new Date().toISOString() : incidentTime || new Date().toISOString(),
        photo_url: uploadedPhotoUrl || undefined,
      };

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        }
        setErrorMsg(data.error || "Failed to submit report.");
        return;
      }

      setSuccessCode(data.reference_code);
    } catch {
      setErrorMsg("Network error submitting report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen (S2-05)
  if (successCode) {
    return (
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="w-full bg-card border border-border rounded-xl p-6 sm:p-8 text-center space-y-6 shadow-lg">
          <div className="w-16 h-16 bg-yellow/20 text-yellow rounded-full flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Report Submitted Successfully
            </h1>
            <p className="text-sm text-muted-foreground">
              Your report has been broadcast to local community members. Keep your reference code to check its status.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-navy text-white border border-yellow/40 space-y-2">
            <span className="text-xs uppercase tracking-wider text-yellow font-semibold">
              Your Reference Code
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-yellow">
              {successCode}
            </div>
            <p className="text-[11px] text-slate-300">
              No account required. Use this code to view your report at any time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href={`/status?code=${successCode}`}
              className="px-5 py-2.5 rounded-lg bg-yellow text-slate-950 font-bold hover:bg-yellow-hover transition-colors shadow-sm text-sm"
            >
              View Report Status
            </Link>
            <Link
              href="/map"
              className="px-5 py-2.5 rounded-lg border border-border bg-card text-foreground font-semibold hover:bg-muted transition-colors text-sm"
            >
              Explore Live Map
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessCode(null);
                setTitle("");
                setDescription("");
                setEmail("");
                removePhoto();
              }}
              className="px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCategoryConfig = CATEGORIES.find((c) => c.value === category);

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Report an Incident
        </h1>
        <p className="text-sm text-muted-foreground">
          Quickly notify neighbours and local response teams. Takes under 1 minute.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-300 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Picker */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  category === cat.value
                    ? "border-yellow bg-yellow-light/20 ring-2 ring-yellow text-foreground"
                    : "border-border bg-card hover:bg-muted text-foreground"
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-xs font-bold leading-tight">{cat.label}</span>
                {cat.sensitive && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Privacy rounded
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Picker */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Severity Level <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SEVERITIES.map((sev) => (
              <button
                type="button"
                key={sev.value}
                onClick={() => setSeverity(sev.value)}
                className={`px-3 py-2 rounded-lg border text-center text-xs font-bold transition-all ${
                  severity === sev.value
                    ? "border-yellow ring-2 ring-yellow " + sev.color
                    : "border-border bg-card hover:bg-muted text-foreground"
                }`}
              >
                {sev.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Incident Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Broken streetlight or suspicious vehicle"
            maxLength={100}
            className="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow text-sm"
          />
          {fieldErrors.title && (
            <p className="text-xs text-red-500">{fieldErrors.title[0]}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-foreground">
              Description <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {description.length} / 1500
            </span>
          </div>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened, any distinctive features, vehicles, or hazards..."
            maxLength={1500}
            className="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow text-sm"
          />
          {fieldErrors.description && (
            <p className="text-xs text-red-500">{fieldErrors.description[0]}</p>
          )}
        </div>

        {/* Time of Incident */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-foreground">
              When did it happen?
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={useCurrentTime}
                onChange={(e) => setUseCurrentTime(e.target.checked)}
                className="rounded border-border text-yellow focus:ring-yellow"
              />
              Happening now
            </label>
          </div>
          {!useCurrentTime && (
            <input
              type="datetime-local"
              value={incidentTime}
              onChange={(e) => setIncidentTime(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow"
            />
          )}
        </div>

        {/* Location Picker with GPS & Pin (S2-02) */}
        <LocationPicker
          lat={lat}
          lng={lng}
          locationName={locationName}
          onChange={(coords) => {
            setLat(coords.lat);
            setLng(coords.lng);
            if (coords.locationName) setLocationName(coords.locationName);
          }}
        />

        {selectedCategoryConfig?.sensitive && (
          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
            🛡️ <strong>Privacy Protection Active:</strong> For {selectedCategoryConfig.label}, public map coordinates are automatically rounded to ~1.1 km to protect residence privacy. Exact coordinates are kept strictly private.
          </div>
        )}

        {/* Photo Upload with client-side EXIF stripping (S2-04) */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Photo (Optional, 1 photo max, up to 5 MB)
          </label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-sm">
              <svg className="w-4 h-4 text-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{photoPreview ? "Change Photo" : "Upload Photo"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                disabled={photoUploading}
                className="hidden"
              />
            </label>

            {photoPreview && (
              <button
                type="button"
                onClick={removePhoto}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          {photoStrippedNotice && (
            <p className="text-[11px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
              ✓ Location data stripped by re-encoding image in your browser before upload.
            </p>
          )}

          {photoPreview && (
            <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden border border-border relative">
              <img
                src={photoPreview}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Anonymous Toggle (ADR-0004) */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-yellow focus:ring-yellow"
            />
            <div>
              <span className="text-sm font-semibold text-foreground">
                Submit Anonymously
              </span>
              <p className="text-xs text-muted-foreground">
                When enabled, public data never includes your identity or contact information.
              </p>
            </div>
          </label>

          {/* Email for no-account reports */}
          <div className="pt-2 border-t border-border">
            <label className="text-xs font-semibold text-foreground">
              Your Email {isAnonymous ? "(Optional for anonymous reports)" : "(For report verification)"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@example.com"
              className="mt-1 w-full px-3 py-1.5 rounded-md border border-border bg-card text-foreground text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Stored securely in private tables only. Never displayed on the public map.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-lg bg-yellow text-slate-950 font-bold hover:bg-yellow-hover disabled:opacity-50 transition-colors shadow-md text-base"
        >
          {isSubmitting ? "Broadcasting Report..." : "Submit Incident Report"}
        </button>
      </form>
    </div>
  );
}
