import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import type { RoomDetailClientAction, RoomDetailState } from './room-detail-client';

interface RoomDetailGalleryProps {
  output: RoomDetailViewModelOutput;
  state: RoomDetailState;
  dispatch: React.Dispatch<RoomDetailClientAction>;
}

export function RoomDetailGallery({ output, dispatch }: RoomDetailGalleryProps) {
  return (
    <div data-testid="room-detail-gallery" className="p-4">
      <h1>{output.roomName}</h1>
      <button
        type="button"
        onClick={() => dispatch({ type: 'CHANGE_DATES' })}
      >
        Change dates
      </button>
    </div>
  );
}
