'use client';

import React, { useReducer, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RoomDetailViewModelOutput } from '@/view-models/room-detail-view-model';
import type { RoomDetailState as DomainRoomDetailState } from '@/domain/room-availability';
import { buildRoomPricingBreakdown } from '@/lib/pricing';
import { RoomInfoPanel } from '@/components/ota/RoomInfoPanel';
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

function calculateNights(checkIn: Date, checkOut: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay));
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

  const checkInStr = state.checkIn ? state.checkIn.toISOString().split('T')[0] : '';
  const checkOutStr = state.checkOut ? state.checkOut.toISOString().split('T')[0] : '';
  const nights = state.checkIn && state.checkOut ? calculateNights(state.checkIn, state.checkOut) : 1;

  const roomForInfoPanel = useMemo(
    () => ({
      id: output.roomId,
      name: output.roomName,
      description: output.description,
      capacity: output.capacity,
      beds: output.beds,
      bed_type: output.bedType,
      gallery: output.gallery,
      amenities: output.amenities.map((a) => a.id),
      price_per_night: effectiveOutput.pricing?.subtotal
        ? Math.round(effectiveOutput.pricing.subtotal / nights)
        : output.pricePerNight,
      price: effectiveOutput.pricing?.subtotal
        ? Math.round(effectiveOutput.pricing.subtotal / nights)
        : output.pricePerNight,
    }),
    [output, effectiveOutput.pricing, nights]
  );

  const isMainState = state.state === 'gallery' || state.state === 'dates_selected';
  const motionKey = isMainState ? 'main' : state.state;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={motionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {state.state === 'loading' && <RoomDetailSkeleton />}
        {isMainState && (
          <div className="p-4 lg:p-6 pb-8 overflow-x-hidden max-w-full">
            <div className="space-y-6 lg:space-y-8">
              <RoomDetailGallery
                output={effectiveOutput}
                state={state.state}
                dispatch={dispatch}
                {...sharedDateProps}
              />

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,380px)] gap-6 lg:gap-8 items-start">
                <RoomInfoPanel
                  room={roomForInfoPanel}
                  checkIn={checkInStr}
                  checkOut={checkOutStr}
                  defaultGuests={2}
                  isOverCapacity={false}
                  nights={nights}
                  taxRate={effectiveOutput.pricing?.taxRate}
                  variant="desktop"
                  cancellationPolicy={output.cancellationPolicy}
                />
                <RoomDetailCalendar
                  output={effectiveOutput}
                  state={state.state}
                  dispatch={dispatch}
                  {...sharedDateProps}
                />
              </div>
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
