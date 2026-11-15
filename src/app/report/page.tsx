"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES, SEVERITIES, IncidentCategory, IncidentSeverity } from "@/lib/types";
import { LocationPicker } from "@/components/location-picker";
import { stripExifAndProcessPhoto } from "@/lib/image-strip";
import { DEFAULT_CENTER, DEFAULT_CITY } from "@/lib/map-style";

export default function ReportPage() {
  const [category, setCategory] = useState<IncidentCategory>("theft");
  const [severity, setSeverity] = useState<IncidentSeverity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [email, setEmail] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [useCurrentTime, setUseCurrentTime] = useState(true);

  // Default coordinates (Lagos center)
  const [lat, setLat] = useState(DEFAULT_CENTER[1]);
  const [lng, setLng] = useState(DEFAULT_CENTER[0]);
  const [locationName, setLocationName] = useState(DEFAULT_CITY);

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
  const [copiedCode, setCopiedCode] = useState(false);

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

  const copyCodeToClipboard = () => {
    if (!successCode) return;
    navigator.clipboard.writeText(successCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
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

  // Success Screen
  if (successCode) {
    return (
      <div className="flex-1 max-w-xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="w-full bg-card border border-border rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-xl animate-fade-in">
          <div className="w-16 h-16 bg-yellow/20 text-yellow rounded-2xl flex items-center justify-center mx-auto text-3xl font-black shadow-inner">
            ✓
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Incident Report Submitted
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              Your report is now live on the community map and broadcast to neighbours within radius.
            </p>
          </div>

          {/* Reference Code Card */}
          <div className="p-5 rounded-xl bg-navy text-white border border-yellow/40 space-y-3 shadow-md">
            <span className="text-[11px] uppercase tracking-widest text-yellow font-bold">
              Your Incident Reference Code
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-yellow">
              {successCode}
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={copyCodeToClipboard}
                className="px-3.5 py-1.5 rounded-lg bg-card text-foreground hover:bg-muted font-bold text-xs transition-colors border border-border/60"
              >
                {copiedCode ? "✓ Copied to clipboard!" : "📋 Copy Reference Code"}
              </button>
            </div>
            <p className="text-[11px] text-slate-300">
              No account required. Use this code anytime to view status and updates.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href={`/status?code=${successCode}`}
              className="px-5 py-2.5 rounded-xl bg-yellow text-slate-950 font-bold hover:bg-yellow-hover transition-colors shadow-sm text-sm"
            >
              View Report Status
            </Link>
            <Link
              href="/map"
              className="px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted transition-colors text-sm"
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
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Report an Incident
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Takes under 60 seconds. Community members nearby will be alerted immediately.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-100 border border-red-300 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-200 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Category Picker */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              1. Incident Category <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-muted-foreground">
              Select the option that best describes the hazard or incident.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  category === cat.value
                    ? "border-yellow bg-yellow/10 ring-2 ring-yellow text-foreground shadow-xs"
                    : "border-border bg-background hover:bg-muted/50 text-foreground"
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <div className="mt-2">
                  <span className="text-xs font-bold block leading-tight">{cat.label}</span>
                  {cat.sensitive && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                      🛡️ Privacy grid
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {selectedCategoryConfig?.sensitive && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <div>
                <strong>Privacy Protection Active:</strong> For {selectedCategoryConfig.label}, public coordinates are automatically rounded to ~1.1 km to protect residence privacy. Exact coordinates are kept strictly private.
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Severity Level */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              2. Severity Level <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-muted-foreground">
              Critical severity triggers stronger priority alerts for local residents.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SEVERITIES.map((sev) => (
              <button
                type="button"
                key={sev.value}
                onClick={() => setSeverity(sev.value)}
                className={`py-3 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                  severity === sev.value
                    ? "border-yellow ring-2 ring-yellow " + sev.color + " shadow-xs"
                    : "border-border bg-background hover:bg-muted text-foreground"
                }`}
              >
                {sev.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Incident Details */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            3. What Happened? <span className="text-red-500">*</span>
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Title / Short Summary <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken water main flooding cycleway"
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow text-sm"
            />
            {fieldErrors.title && (
              <p className="text-xs text-red-500">{fieldErrors.title[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-foreground">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                {description.length} / 1500
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, identifying details, vehicle descriptions, or immediate hazards..."
              maxLength={1500}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow text-sm"
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-500">{fieldErrors.description[0]}</p>
            )}
          </div>

          {/* Time */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-semibold text-foreground">
              Incident Occurrence:
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={useCurrentTime}
                onChange={(e) => setUseCurrentTime(e.target.checked)}
                className="h-4 w-4 rounded border-border text-yellow focus:ring-yellow"
              />
              <span>Happening right now</span>
            </label>
            {!useCurrentTime && (
              <input
                type="datetime-local"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-yellow"
              />
            )}
          </div>
        </div>

        {/* Step 4: Location Picker */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
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
        </div>

        {/* Step 5: Photo & Privacy Controls */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            4. Photo & Reporter Identity
          </label>

          {/* Photo upload zone */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Attach Evidence Photo (Optional · 1 photo max, up to 5 MB)
            </label>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition-all shadow-2xs">
                <span className="text-base text-yellow">📷</span>
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
                  className="text-xs text-red-500 hover:underline font-semibold"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {photoStrippedNotice && (
              <p className="text-[11px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5 pt-1">
                <span>🛡️</span>
                <span>Camera metadata and GPS tags stripped directly in your browser before upload.</span>
              </p>
            )}

            {photoPreview && (
              <div className="mt-3 w-36 h-36 rounded-xl overflow-hidden border border-border shadow-md">
                <img
                  src={photoPreview}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Anonymous toggle card */}
          <div className="pt-4 border-t border-border space-y-4">
            <label className="flex items-start gap-3 cursor-pointer p-3.5 rounded-xl bg-background border border-border">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-yellow focus:ring-yellow"
              />
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Submit Report Anonymously
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When enabled, public data never includes your identity or contact information.
                </p>
              </div>
            </label>

            {/* Email for status tracking */}
            <div>
              <label className="text-xs font-semibold text-foreground">
                Your Email Address {isAnonymous ? "(Optional for anonymous reports)" : "(For report verification)"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Kept strictly in protected private tables. Never displayed on public map.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 px-6 rounded-xl bg-yellow text-slate-950 font-black hover:bg-yellow-hover disabled:opacity-50 transition-all shadow-md hover:shadow-lg text-base text-center"
        >
          {isSubmitting ? "Broadcasting to Local Grid..." : "Submit Incident Report"}
        </button>
      </form>
    </div>
  );
}
