export function RoomDetailSkeleton() {
  return (
    <div data-testid="room-detail-skeleton" className="space-y-4 p-4">
      <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
    </div>
  );
}
