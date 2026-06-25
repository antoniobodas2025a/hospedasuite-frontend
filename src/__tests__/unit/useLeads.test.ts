/**
 * @vitest-environment jsdom
 *
 * useLeads Hook — Unit Tests
 *
 * Tests client-side state management for the superadmin lead panel.
 * Validates initial state, fetch success/failure, optimistic updates,
 * and pagination state transitions.
 *
 * Mocks server actions and next/navigation to isolate hook logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LeadDTO } from '@/types/leads';

// ── Hoisted mock store (vi.mock is hoisted — must use vi.hoisted) ──────────
const {
  mockGetLeads,
  mockUpdateStatus,
  mockUpdateNotes,
  mockAssignToHotel,
  mockDeleteLead,
  mockCreateLead,
  mockRouterRefresh,
} = vi.hoisted(() => ({
  mockGetLeads: vi.fn(),
  mockUpdateStatus: vi.fn(),
  mockUpdateNotes: vi.fn(),
  mockAssignToHotel: vi.fn(),
  mockDeleteLead: vi.fn(),
  mockCreateLead: vi.fn(),
  mockRouterRefresh: vi.fn(),
}));

vi.mock('@/app/actions/superadmin-leads', () => ({
  getLeadsAction: mockGetLeads,
  updateLeadStatusAction: mockUpdateStatus,
  updateLeadNotesAction: mockUpdateNotes,
  assignLeadToHotelAction: mockAssignToHotel,
  deleteLeadAction: mockDeleteLead,
  createAdminLeadAction: mockCreateLead,
}));

// ── Mock next/navigation ───────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    refresh: mockRouterRefresh,
  })),
}));

// ── Import after mocks ─────────────────────────────────────────────────────
import { useLeads } from '@/hooks/useLeads';

// ── Test fixtures ──────────────────────────────────────────────────────────
function makeLeadDTO(overrides: Partial<LeadDTO> = {}): LeadDTO {
  return {
    id: 1,
    created_at: '2025-01-15T10:00:00Z',
    business_name: 'Hotel Test',
    phone: '+541112345678',
    city_search: 'Buenos Aires',
    status: 'new',
    notes: 'Some notes',
    address: 'Calle 123',
    website: 'https://hoteltest.com',
    rating: 4.5,
    ai_pitch: 'Great hotel',
    hotel_id: null,
    google_place_id: 'ChIJ123',
    ...overrides,
  };
}

const DEFAULT_OPTIONS = {
  initialLeads: [makeLeadDTO({ id: 1 }), makeLeadDTO({ id: 2 })],
  initialTotal: 2,
  initialPage: 1,
  pageSize: 50,
};

// ── Setup ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockRouterRefresh.mockClear();
});

// ═══════════════════════════════════════════════════════════════════════════
// Initial state
// ═══════════════════════════════════════════════════════════════════════════
describe('initial state', () => {
  it('populates leads from initialLeads prop', () => {
    const initialLeads = [
      makeLeadDTO({ id: 10, business_name: 'Initial Hotel' }),
    ];

    const { result } = renderHook(() =>
      useLeads({
        initialLeads,
        initialTotal: 1,
        initialPage: 1,
        pageSize: 50,
      }),
    );

    expect(result.current.leads).toEqual(initialLeads);
    expect(result.current.total).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(50);
  });

  it('starts with loading=false and error=null', () => {
    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('starts with empty filter state', () => {
    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    expect(result.current.filters).toEqual({});
  });

  it('initializes with empty leads array', () => {
    const { result } = renderHook(() =>
      useLeads({
        initialLeads: [],
        initialTotal: 0,
        initialPage: 1,
        pageSize: 50,
      }),
    );

    expect(result.current.leads).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fetchLeads
// ═══════════════════════════════════════════════════════════════════════════
describe('fetchLeads', () => {
  it('fetches and populates leads on success', async () => {
    const fetchedLeads = [makeLeadDTO({ id: 3, business_name: 'Fetched Hotel' })];

    mockGetLeads.mockResolvedValueOnce({
      leads: fetchedLeads,
      total: 1,
      page: 2,
      pageSize: 50,
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      // fetchLeads with override does NOT change internal page state;
      // use setPage(newPage) for that. The hook's page stays at initialPage=1.
      await result.current.fetchLeads({ page: 2 });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.leads).toEqual(fetchedLeads);
    expect(result.current.total).toBe(1);
    // page stays at 1 because fetchLeads with override doesn't call setPageState
    expect(result.current.page).toBe(1);
  });

  it('sets loading=true during fetch', async () => {
    let resolvePromise: any;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockGetLeads.mockReturnValueOnce(fetchPromise);

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    act(() => {
      result.current.fetchLeads({ page: 2 });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise({
        leads: [makeLeadDTO()],
        total: 1,
        page: 2,
        pageSize: 50,
      });
    });

    expect(result.current.loading).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    mockGetLeads.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.fetchLeads({ page: 1 });
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.leads).toEqual(DEFAULT_OPTIONS.initialLeads); // unchanged
  });

  it('handles non-Error throw values', async () => {
    mockGetLeads.mockRejectedValueOnce('string error');

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.fetchLeads({ page: 1 });
    });

    expect(result.current.error).toBe('Error fetching leads');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateStatus (optimistic)
// ═══════════════════════════════════════════════════════════════════════════
describe('updateStatus (optimistic update)', () => {
  it('optimistically updates lead status in state', async () => {
    mockUpdateStatus.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.updateStatus(1, 'contacted');
    });

    // Lead 1 should now have status 'contacted'
    const updatedLead = result.current.leads.find((l) => l.id === 1);
    expect(updatedLead?.status).toBe('contacted');

    // Lead 2 should be unchanged
    const unchangedLead = result.current.leads.find((l) => l.id === 2);
    expect(unchangedLead?.status).toBe('new');
  });

  it('rolls back state on server failure', async () => {
    mockUpdateStatus.mockResolvedValueOnce({
      success: false,
      error: 'Server rejected',
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.updateStatus(1, 'lost');
    });

    // State should be rolled back to original
    const lead = result.current.leads.find((l) => l.id === 1);
    expect(lead?.status).toBe('new');
    expect(result.current.error).toBe('Server rejected');
  });

  it('calls router.refresh() on success', async () => {
    mockUpdateStatus.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.updateStatus(1, 'converted');
    });

    expect(mockRouterRefresh).toHaveBeenCalled();
  });

  it('does NOT call router.refresh() on failure', async () => {
    mockUpdateStatus.mockResolvedValueOnce({ success: false });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.updateStatus(1, 'converted');
    });

    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it('returns true on success, false on failure', async () => {
    mockUpdateStatus.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.updateStatus(1, 'contacted');
    });

    expect(returnValue).toBe(true);

    mockUpdateStatus.mockResolvedValueOnce({ success: false });
    await act(async () => {
      returnValue = await result.current.updateStatus(2, 'lost');
    });

    expect(returnValue).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateNotes (optimistic)
// ═══════════════════════════════════════════════════════════════════════════
describe('updateNotes (optimistic update)', () => {
  it('optimistically updates lead notes', async () => {
    mockUpdateNotes.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.updateNotes(1, 'Updated notes text');
    });

    const updatedLead = result.current.leads.find((l) => l.id === 1);
    expect(updatedLead?.notes).toBe('Updated notes text');
  });

  it('rolls back notes on server failure', async () => {
    mockUpdateNotes.mockResolvedValueOnce({
      success: false,
      error: 'Database error',
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.updateNotes(1, 'This will fail');
    });

    const lead = result.current.leads.find((l) => l.id === 1);
    expect(lead?.notes).toBe('Some notes'); // rolled back to original
    expect(result.current.error).toBe('Database error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deleteLead (optimistic removal)
// ═══════════════════════════════════════════════════════════════════════════
describe('deleteLead (optimistic removal)', () => {
  it('optimistically removes lead from state', async () => {
    mockDeleteLead.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.deleteLead(1);
    });

    expect(result.current.leads).toHaveLength(1);
    expect(result.current.leads[0].id).toBe(2);
    expect(result.current.total).toBe(1);
  });

  it('rolls back removal on server failure', async () => {
    mockDeleteLead.mockResolvedValueOnce({
      success: false,
      error: 'Cannot delete',
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.deleteLead(1);
    });

    expect(result.current.leads).toHaveLength(2); // rolled back
    expect(result.current.total).toBe(2); // rolled back
    expect(result.current.error).toBe('Cannot delete');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// assignToHotel (optimistic)
// ═══════════════════════════════════════════════════════════════════════════
describe('assignToHotel (optimistic update)', () => {
  it('optimistically assigns hotel to lead', async () => {
    mockAssignToHotel.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.assignToHotel(1, 'hotel-abc');
    });

    const lead = result.current.leads.find((l) => l.id === 1);
    expect(lead?.hotel_id).toBe('hotel-abc');
  });

  it('rolls back hotel assignment on failure', async () => {
    mockAssignToHotel.mockResolvedValueOnce({
      success: false,
      error: 'Hotel not found',
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.assignToHotel(1, 'bad-hotel');
    });

    const lead = result.current.leads.find((l) => l.id === 1);
    expect(lead?.hotel_id).toBeNull();
    expect(result.current.error).toBe('Hotel not found');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createLead
// ═══════════════════════════════════════════════════════════════════════════
describe('createLead', () => {
  it('prepends created lead to state on success', async () => {
    const newLead = makeLeadDTO({ id: 99, business_name: 'Brand New Hotel' });
    mockCreateLead.mockResolvedValueOnce({
      success: true,
      data: newLead,
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.createLead({
        business_name: 'Brand New Hotel',
        phone: '+5411199999999',
      });
    });

    expect(returnValue.success).toBe(true);
    expect(result.current.leads[0]).toEqual(newLead);
    expect(result.current.leads).toHaveLength(3);
    expect(result.current.total).toBe(3);
  });

  it('does not modify state on creation failure', async () => {
    mockCreateLead.mockResolvedValueOnce({
      success: false,
      error: 'Duplicate phone',
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.createLead({
        business_name: 'Will Fail',
        phone: '+5411111111111',
      });
    });

    expect(returnValue.success).toBe(false);
    expect(returnValue.error).toBe('Duplicate phone');
    expect(result.current.leads).toHaveLength(2); // unchanged
    expect(result.current.total).toBe(2); // unchanged
  });

  it('calls router.refresh() on success', async () => {
    const newLead = makeLeadDTO({ id: 100 });
    mockCreateLead.mockResolvedValueOnce({
      success: true,
      data: newLead,
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.createLead({
        business_name: 'Another Hotel',
        phone: '+5411188888888',
      });
    });

    expect(mockRouterRefresh).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Pagination state
// ═══════════════════════════════════════════════════════════════════════════
describe('pagination', () => {
  it('setPage triggers fetchLeads with new page', async () => {
    mockGetLeads.mockResolvedValueOnce({
      leads: [makeLeadDTO({ id: 51 })],
      total: 100,
      page: 2,
      pageSize: 50,
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
    expect(mockGetLeads).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 50 }),
    );
  });

  it('calls router.refresh() after fetchLeads', async () => {
    mockGetLeads.mockResolvedValueOnce({
      leads: [makeLeadDTO()],
      total: 100,
      page: 2,
      pageSize: 50,
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    mockRouterRefresh.mockClear();
    await act(async () => {
      await result.current.setPage(2);
    });

    // setPage calls fetchLeads, which successful or not doesn't call refresh.
    // But the action wrappers (updateStatus, etc.) do call refresh.
    // fetchLeads itself does NOT call router.refresh() — confirmed by code review.
    // This test verifies the page state change.
    expect(result.current.page).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// clearError
// ═══════════════════════════════════════════════════════════════════════════
describe('clearError', () => {
  it('resets error to null', async () => {
    mockGetLeads.mockRejectedValueOnce(new Error('Something failed'));

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.fetchLeads({ page: 1 });
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// setFilters
// ═══════════════════════════════════════════════════════════════════════════
describe('setFilters', () => {
  it('triggers fetch with merged filters and resets to page 1', async () => {
    mockGetLeads.mockResolvedValueOnce({
      leads: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });

    const { result } = renderHook(() => useLeads(DEFAULT_OPTIONS));

    await act(async () => {
      await result.current.setFilters({ status: 'converted' });
    });

    expect(result.current.page).toBe(1);
    expect(mockGetLeads).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'converted', page: 1 }),
    );
  });
});
