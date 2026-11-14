export function DisclaimerBanner() {
  return (
    <aside
      aria-label="Academic prototype notice"
      className="bg-yellow-500 text-slate-950 px-4 py-2 text-center text-xs sm:text-sm font-semibold tracking-wide border-b border-yellow-600 flex items-center justify-center gap-2"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-slate-950 animate-pulse" aria-hidden="true" />
      <span>
        <strong>Academic prototype.</strong> Not for real emergencies. In an emergency, dial 911 / 112 / 999 immediately.
      </span>
    </aside>
  );
}
