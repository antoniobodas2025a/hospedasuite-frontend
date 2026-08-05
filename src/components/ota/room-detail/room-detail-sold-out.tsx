import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import type { RoomDetailClientAction, RoomDetailState } from './room-detail-client';

interface RoomDetailSoldOutProps {
  output: RoomDetailViewModelOutput;
  state: RoomDetailState;
  dispatch: React.Dispatch<RoomDetailClientAction>;
}

export function RoomDetailSoldOut({ state, dispatch }: RoomDetailSoldOutProps) {
  const checkIn = new Date('2026-08-10T12:00:00Z');
  const checkOut = new Date('2026-08-13T12:00:00Z');

  return (
    <div data-testid="room-detail-sold-out" data-state={state} className="p-4">
      <button
        type="button"
        onClick={() => dispatch({ type: 'SELECT_SUGGESTION', checkIn, checkOut })}
      >
        Select suggestion
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: 'CLEAR_DATES' })}
      >
        Clear dates
      </button>
    </div>
  );
}
