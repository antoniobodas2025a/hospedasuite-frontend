import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';

interface RoomDetailErrorProps {
  output: RoomDetailViewModelOutput;
}

export function RoomDetailError({ output }: RoomDetailErrorProps) {
  return (
    <div data-testid="room-detail-error" className="p-4 text-center">
      <p className="text-destructive">{output.error ?? 'Something went wrong'}</p>
      <a href={output.breadcrumb.href} className="text-primary underline">
        Volver al hotel
      </a>
    </div>
  );
}
