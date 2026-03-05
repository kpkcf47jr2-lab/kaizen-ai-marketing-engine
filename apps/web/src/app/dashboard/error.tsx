'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
