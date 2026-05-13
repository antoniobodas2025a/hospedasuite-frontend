export default function ReviewSkeleton() {
  return (
    <div className="pb-6 border-b border-border/40 last:border-0 last:pb-0">
      {/* Avatar + name + date */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-24 bg-muted rounded-[var(--radius-squircle-md)] animate-pulse" />
            <div className="h-3 w-32 bg-muted/60 rounded-[var(--radius-squircle-md)] animate-pulse" />
          </div>
        </div>
        <div className="h-3 w-20 bg-muted/50 rounded-[var(--radius-squircle-md)] animate-pulse" />
      </div>

      {/* Star rating placeholder */}
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="size-3.5 rounded-full bg-muted/40 animate-pulse" />
        ))}
      </div>

      {/* Comment lines */}
      <div className="space-y-2 pl-4">
        <div className="h-3 w-full bg-muted/60 rounded-[var(--radius-squircle-md)] animate-pulse" />
        <div className="h-3 w-full bg-muted/60 rounded-[var(--radius-squircle-md)] animate-pulse" />
        <div className="h-3 w-2/3 bg-muted/60 rounded-[var(--radius-squircle-md)] animate-pulse" />
      </div>

      {/* Helpful button placeholder */}
      <div className="h-3 w-16 bg-muted/40 rounded-[var(--radius-squircle-md)] animate-pulse mt-3" />
    </div>
  );
}
