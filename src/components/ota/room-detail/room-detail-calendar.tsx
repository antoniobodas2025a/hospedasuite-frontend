import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import type { RoomDetailClientAction, RoomDetailState } from './room-detail-client';

interface RoomDetailCalendarProps {
  output: RoomDetailViewModelOutput;
  state: RoomDetailState;
  dispatch: React.Dispatch<RoomDetailClientAction>;
}

export function RoomDetailCalendar({ state, dispatch }: RoomDetailCalendarProps) {
  const checkIn = new Date('2026-08-10T12:00:00Z');
  const checkOut = new Date('2026-08-13T12:00:00Z');

  return (
    <div data-testid="room-detail-calendar" data-state={state} className="p-4">
      {state === 'calendar_first' && (
        <button
          type="button"
          onClick={() => dispatch({ type: 'SELECT_DATES', checkIn, checkOut })}
        >
          Select dates
        </button>
      )}
      {state === 'calendar_active' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLEAR_DATES' })}
          >
            Clear dates
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CONFIRM_DATES', available: true })}
          >
            Confirm availability
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CONFIRM_DATES', available: false })}
          >
            Confirm sold out
          </button>
        </div>
      )}
    </div>
  );
}
