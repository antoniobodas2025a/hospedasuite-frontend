import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

export default function RoomComparisonSkeleton() {
  return (
    <div className="mb-8 space-y-3" data-testid="room-comparison-skeleton">
      <SkeletonLoader width={160} height={20} rounded="md" />
      <div className="space-y-2">
        <SkeletonLoader width="100%" height={24} rounded="md" />
        <SkeletonLoader width="90%" height={24} rounded="md" />
        <SkeletonLoader width="95%" height={24} rounded="md" />
      </div>
    </div>
  );
}
