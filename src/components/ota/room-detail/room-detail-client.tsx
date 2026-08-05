'use client';

import React, { useReducer } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import type { RoomDetailState as DomainRoomDetailState } from '@/domain/room-availability';
import { RoomDetailCalendar } from './room-detail-calendar';
import { RoomDetailError } from './room-detail-error';
import { RoomDetailGallery } from './room-detail-gallery';
import { RoomDetailSkeleton } from './room-detail-skeleton';
import { RoomDetailSoldOut } from './room-detail-sold-out';

export type RoomDetailState = DomainRoomDetailState;

export interface RoomDetailClientState {
  state: RoomDetailState;
  checkIn: Date | null;
  checkOut: Date | null;
}

export type RoomDetailClientAction =
  | { type: 'SELECT_DATES'; checkIn: Date; checkOut: Date }
  | { type: 'CONFIRM_DATES'; available: boolean }
  | { type: 'CLEAR_DATES' }
  | { type: 'SELECT_SUGGESTION'; checkIn: Date; checkOut: Date }
  | { type: 'CHANGE_DATES' }
  | { type: 'FETCH_ERROR' };

export function roomDetailReducer(
  state: RoomDetailClientState,
  action: RoomDetailClientAction
): RoomDetailClientState {
  switch (action.type) {
    case 'SELECT_DATES':
      if (state.state !== 'calendar_first' && state.state !== 'calendar_active') {
        return state;
      }
      return {
        ...state,
        state: 'calendar_active',
        checkIn: action.checkIn,
        checkOut: action.checkOut,
      };
    case 'CONFIRM_DATES':
      if (state.state !== 'calendar_active') {
        return state;
      }
      return {
        ...state,
        state: action.available ? 'detail' : 'sold_out',
      };
    case 'CLEAR_DATES':
      return {
        ...state,
        state: 'calendar_first',
        checkIn: null,
        checkOut: null,
      };
    case 'SELECT_SUGGESTION':
      if (state.state !== 'sold_out') {
        return state;
      }
      return {
        ...state,
        state: 'calendar_active',
        checkIn: action.checkIn,
        checkOut: action.checkOut,
      };
    case 'CHANGE_DATES':
      if (state.state !== 'detail') {
        return state;
      }
      return {
        ...state,
        state: 'calendar_active',
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        state: 'error',
      };
    default:
      return state;
  }
}

function getInitialState(output: RoomDetailViewModelOutput): RoomDetailClientState {
  return {
    state: output.state,
    checkIn: output.initialCheckIn ?? null,
    checkOut: output.initialCheckOut ?? null,
  };
}

interface RoomDetailClientProps {
  output: RoomDetailViewModelOutput;
}

export function RoomDetailClient({ output }: RoomDetailClientProps) {
  const [state, dispatch] = useReducer(roomDetailReducer, getInitialState(output));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.state}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {state.state === 'loading' && <RoomDetailSkeleton />}
        {(state.state === 'calendar_first' || state.state === 'calendar_active') && (
          <RoomDetailCalendar output={output} state={state.state} dispatch={dispatch} />
        )}
        {state.state === 'detail' && (
          <RoomDetailGallery output={output} state={state.state} dispatch={dispatch} />
        )}
        {state.state === 'sold_out' && (
          <RoomDetailSoldOut output={output} state={state.state} dispatch={dispatch} />
        )}
        {state.state === 'error' && <RoomDetailError output={output} />}
      </motion.div>
    </AnimatePresence>
  );
}
