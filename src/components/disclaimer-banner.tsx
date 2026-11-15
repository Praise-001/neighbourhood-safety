export function DisclaimerBanner() {
  return (
    <div
      role="region"
      aria-label="Prototype Notice"
      className="bg-navy-dark text-slate-300 text-xs py-1.5 px-4 border-b border-border/40 flex items-center justify-between"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 text-[11px] sm:text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow/20 text-yellow font-bold text-[10px] uppercase tracking-wide">
            Prototype
          </span>
          <span className="text-slate-300">
            Academic demonstration project. <strong>Not for real emergencies.</strong>
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-slate-400">
          <span>In immediate danger?</span>
          <span className="text-yellow font-semibold">Dial 112 (Nigeria Emergency Services)</span>
        </div>
      </div>
    </div>
  );
}
