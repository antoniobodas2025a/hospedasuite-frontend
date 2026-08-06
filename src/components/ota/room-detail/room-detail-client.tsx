'use client';

import React, { useReducer, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import type { RoomDetailState as DomainRoomDetailState } from '@/domain/room-availability';
import { buildRoomPricingBreakdown } from '@/lib/pricing';
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
  | { type: 'CLEAR_DATES' }
  | { type: 'SELECT_SUGGESTION'; checkIn: Date; checkOut: Date }
  | { type: 'FETCH_ERROR' };

export function roomDetailReducer(
  state: RoomDetailClientState,
  action: RoomDetailClientAction
): RoomDetailClientState {
  switch (action.type) {
    case 'SELECT_DATES':
      if (state.state !== 'gallery' && state.state !== 'dates_selected') {
        return state;
      }
      return {
        ...state,
        state: 'dates_selected',
        checkIn: action.checkIn,
        checkOut: action.checkOut,
      };
    case 'CLEAR_DATES':
      return {
        ...state,
        state: 'gallery',
        checkIn: null,
        checkOut: null,
      };
    case 'SELECT_SUGGESTION':
      if (state.state !== 'sold_out') {
        return state;
      }
      return {
        ...state,
        state: 'dates_selected',
        checkIn: action.checkIn,
        checkOut: action.checkOut,
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

  const effectiveOutput = useMemo<RoomDetailViewModelOutput>(() => {
    if (!state.checkIn || !state.checkOut) {
      return output;
    }

    const pricing = buildRoomPricingBreakdown({
      pricePerNight: output.pricePerNight,
      weekendPrice: output.weekendPrice,
      taxRate: output.taxRate,
      checkIn: state.checkIn,
      checkOut: state.checkOut,
    });

    return {
      ...output,
      state: state.state,
      pricing,
      initialCheckIn: state.checkIn,
      initialCheckOut: state.checkOut,
    };
  }, [output, state.checkIn, state.checkOut, state.state]);

  const sharedDateProps = {
    selectedCheckIn: state.checkIn,
    selectedCheckOut: state.checkOut,
  };

  const isMainState = state.state === 'gallery' || state.state === 'dates_selected';
  const motionKey = isMainState ? 'main' : state.state;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={motionKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {state.state === 'loading' && <RoomDetailSkeleton />}
        {isMainState && (
          <div className="p-4 lg:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,380px)] gap-6 lg:gap-8 items-start">
              <RoomDetailGallery
                output={effectiveOutput}
                state={state.state}
                dispatch={dispatch}
                {...sharedDateProps}
              />
              <RoomDetailCalendar
                output={effectiveOutput}
                state={state.state}
                dispatch={dispatch}
                {...sharedDateProps}
              />
            </div>
          </div>
        )}
        {state.state === 'sold_out' && (
          <RoomDetailSoldOut output={effectiveOutput} state={state.state} dispatch={dispatch} {...sharedDateProps} />
        )}
        {state.state === 'error' && <RoomDetailError output={output} />}
      </motion.div>
    </AnimatePresence>
  );
}
