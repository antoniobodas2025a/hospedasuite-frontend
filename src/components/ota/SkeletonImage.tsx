import { cn } from '@/lib/utils';

/**
 * SkeletonImage — Shimmer placeholder for loading images.
 *
 * Used inside RoomGalleryGrid and any gallery surface that needs
 * visual feedback while images load from the network.
 *
 * The shimmer gradient sweeps left→right on a 2s infinite loop
 * and respects prefers-reduced-motion.
 */
export function SkeletonImage({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden bg-muted rounded-[var(--radius-squircle-md)]',
        className,
      )}
    >
      <div className="absolute inset-0 shimmer-sweep" />
    </div>
  );
}
