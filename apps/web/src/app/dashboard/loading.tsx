export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
      </div>

      {/* Card skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-card" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card">
        <div className="h-10 border-b border-border bg-muted/30" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 border-b border-border last:border-0" />
        ))}
      </div>
    </div>
  );
}
