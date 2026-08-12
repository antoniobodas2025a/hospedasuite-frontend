/**
 * @vitest-environment jsdom
 *
 * useCRM Hook — Regression tests for hotelId threading.
 *
 * The tenant-guard security refactor changed `createLeadAction(hotelId, lead)`
 * and `updateLeadStatusAction(hotelId, leadId, newStatus)`. These tests freeze
 * that the hook passes `hotelId` as the first argument to both server actions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Lead } from '@/hooks/useCRM';

// ── Hoisted mock store ──────────────────────────────────────────────────────
const { mockCreateLeadAction, mockUpdateLeadStatusAction, mockRouterRefresh } = vi.hoisted(() => ({
  mockCreateLeadAction: vi.fn(),
  mockUpdateLeadStatusAction: vi.fn(),
  mockRouterRefresh: vi.fn(),
}));

vi.mock('@/app/actions/marketing', () => ({
  createLeadAction: mockCreateLeadAction,
  updateLeadStatusAction: mockUpdateLeadStatusAction,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: mockRouterRefresh })),
}));

// ── Import after mocks ──────────────────────────────────────────────────────
import { useCRM } from '@/hooks/useCRM';

const initialLeads: Lead[] = [
  {
    id: 1,
    business_name: 'Hotel A',
    phone: '+57 300 000 0001',
    status: 'new',
    notes: null,
    city_search: 'Manual',
  },
];

describe('useCRM — hotelId threading (regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterRefresh.mockClear();
  });

  it('passes hotelId as first arg to updateLeadStatusAction', async () => {
    mockUpdateLeadStatusAction.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCRM('hotel-123', initialLeads));

    await act(async () => {
      await result.current.moveLead(1, 'contacted');
    });

    expect(mockUpdateLeadStatusAction).toHaveBeenCalledWith(
      'hotel-123',
      1,
      'contacted',
    );
  });

  it('passes hotelId as first arg to createLeadAction', async () => {
    mockCreateLeadAction.mockResolvedValue({
      success: true,
      data: {
        id: 2,
        business_name: 'Hotel B',
        phone: '+57 300 000 0002',
        status: 'new',
        notes: null,
      },
    });

    const { result } = renderHook(() => useCRM('hotel-123', initialLeads));

    await act(async () => {
      result.current.setNewLeadForm({
        business_name: 'Hotel B',
        phone: '+57 300 000 0002',
        notes: '',
        city_search: 'Manual',
      });
    });
    await act(async () => {
      await result.current.createLead();
    });

    expect(mockCreateLeadAction).toHaveBeenCalledWith(
      'hotel-123',
      expect.objectContaining({ business_name: 'Hotel B' }),
    );
  });
});
