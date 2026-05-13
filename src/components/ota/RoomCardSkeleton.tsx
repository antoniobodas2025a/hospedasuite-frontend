export default function RoomCardSkeleton() {
  return (
    <div className="glass-card flex flex-col md:flex-row gap-6">
      {/* Image placeholder */}
      <div className="w-full md:w-72 h-64 md:h-full min-h-[260px] bg-muted rounded-[var(--radius-squircle-2xl)] animate-pulse shrink-0" />

      {/* Content placeholder */}
      <div className="flex-1 flex flex-col justify-between py-2 pr-2">
        <div>
          {/* Title + capacity badge */}
          <div className="flex justify-between items-start mb-3">
            <div className="h-8 w-48 bg-muted rounded-[var(--radius-squircle-lg)] animate-pulse" />
            <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
          </div>

          {/* Description lines */}
          <div className="space-y-2 mb-4">
            <div className="h-4 w-full bg-muted/70 rounded-[var(--radius-squircle-md)] animate-pulse" />
            <div className="h-4 w-3/4 bg-muted/70 rounded-[var(--radius-squircle-md)] animate-pulse" />
          </div>

          {/* Amenity badges */}
          <div className="flex gap-2 mb-6">
            <div className="h-7 w-28 bg-muted/50 rounded-[var(--radius-squircle-md)] animate-pulse" />
            <div className="h-7 w-24 bg-muted/50 rounded-[var(--radius-squircle-md)] animate-pulse" />
          </div>
        </div>

        {/* Price + CTA dock */}
        <div className="mt-4 pt-5 flex flex-wrap items-end justify-between border-t border-border/40 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted/70 rounded-[var(--radius-squircle-md)] animate-pulse" />
            <div className="h-9 w-36 bg-muted rounded-[var(--radius-squircle-lg)] animate-pulse" />
          </div>
          <div className="h-12 w-40 bg-muted rounded-[var(--radius-squircle-xl)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
