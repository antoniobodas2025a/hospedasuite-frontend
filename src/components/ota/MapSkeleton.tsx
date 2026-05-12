export default function MapSkeleton() {
  return (
    <div className="bg-card/60 backdrop-blur-xl rounded-[2rem] shadow-sm border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-border/40">
        <div className="h-6 w-48 bg-muted rounded-xl animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left column: Map + address */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Map placeholder */}
          <div className="rounded-2xl overflow-hidden border border-border h-48 bg-muted animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="size-8 rounded-full bg-muted-foreground/20 mx-auto mb-2 animate-pulse" />
              <div className="h-3 w-32 bg-muted-foreground/10 rounded-lg animate-pulse mx-auto" />
            </div>
          </div>

          {/* Address placeholder */}
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-muted animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 bg-muted/70 rounded-lg animate-pulse" />
              <div className="h-4 w-full bg-muted rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Phone placeholder */}
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-muted animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 bg-muted/70 rounded-lg animate-pulse" />
              <div className="h-4 w-36 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Right column: Schedules + policies */}
        <div className="p-6 md:p-8 space-y-6 border-t md:border-t-0 md:border-l border-border/40">
          {/* Schedule header */}
          <div className="h-3 w-24 bg-muted/70 rounded-lg animate-pulse" />

          {/* Schedule items */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-xl">
                <div className="h-4 w-20 bg-muted/70 rounded-lg animate-pulse" />
                <div className="h-4 w-12 bg-muted rounded-lg animate-pulse" />
              </div>
            ))}
          </div>

          {/* Cancellation policy */}
          <div className="space-y-2">
            <div className="h-3 w-40 bg-muted/70 rounded-lg animate-pulse" />
            <div className="p-4 bg-muted/30 rounded-xl border border-border/40 space-y-2">
              <div className="h-3 w-full bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-3 w-full bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-3 w-2/3 bg-muted/50 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
