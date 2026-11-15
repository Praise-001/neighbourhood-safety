export default function GlobalLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="w-10 h-10 border-4 border-yellow/20 border-t-yellow rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground font-medium">Loading Neighbourhood Safety...</p>
    </div>
  );
}
