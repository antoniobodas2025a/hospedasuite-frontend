/**
 * superadmin-leads Server Actions — Unit Tests
 *
 * Tests all 6 server actions for the superadmin lead management panel.
 * Mocks requireSuperAdmin, supabaseAdmin, and revalidatePath.
 *
 * Coverage targets (from spec scenarios):
 * - getLeadsAction: paginated results, status filter, search, error handling
 * - updateLeadStatusAction: happy path, invalid status, unauthorized
 * - updateLeadNotesAction: happy path, error propagation
 * - deleteLeadAction: happy path, error propagation
 * - assignLeadToHotelAction: happy path, error propagation
 * - createAdminLeadAction: happy path, duplicate phone, missing required fields
 * - All actions reject unauthorized callers (requireSuperAdmin throws)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock store ─────────────────────────────────────────────────────
const { mockRequireSuperAdmin, mockRevalidatePath, mockChain, mockCreateClient, mockHeaders, mockLogAudit } = vi.hoisted(() => {
  const chain: any = {
    _result: {
      data: [] as any[],
      error: null as { message: string; code?: string } | null,
      count: 0,
    },
  };

  const methods = [
    'select', 'update', 'delete', 'insert',
    'or', 'ilike', 'gte', 'lte', 'eq', 'order', 'range', 'single',
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  // Make the chain thenable — resolves/throws based on _result
  chain.then = (resolve: any, reject?: any) => {
    const r = chain._result;
    if (r?.error) {
      // When the action awaits the chain, if error is present the destructured
      // { data, error } will have error truthy — the action handles it.
      return Promise.resolve(resolve(r));
    }
    return Promise.resolve(resolve(r));
  };

  return {
    mockRequireSuperAdmin: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockChain: chain,
    mockCreateClient: vi.fn().mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user', email: 'admin@test.com' } }, error: null }) },
    }),
    mockHeaders: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue('unknown'),
    }),
    mockLogAudit: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/auth-guards', () => ({
  requireSuperAdmin: mockRequireSuperAdmin,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockChain),
  },
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: mockLogAudit,
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────
import {
  getLeadsAction,
  updateLeadStatusAction,
  updateLeadNotesAction,
  deleteLeadAction,
  assignLeadToHotelAction,
  createAdminLeadAction,
} from '@/app/actions/superadmin-leads';

// ── Test Fixtures ──────────────────────────────────────────────────────────
function makeLead(overrides: Partial<any> = {}): any {
  return {
    id: 1,
    created_at: '2025-01-01T00:00:00Z',
    business_name: 'Hotel Test',
    phone: '+541112345678',
    city_search: 'Buenos Aires',
    status: 'new',
    notes: 'Test notes',
    address: null,
    website: null,
    rating: null,
    ai_pitch: null,
    hotel_id: null,
    google_place_id: null,
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue(undefined);
  mockRevalidatePath.mockClear();
  mockChain._result = { data: [], error: null, count: 0 };
});

// ═══════════════════════════════════════════════════════════════════════════
// getLeadsAction
// ═══════════════════════════════════════════════════════════════════════════
describe('getLeadsAction', () => {
  it('returns paginated results with default page size', async () => {
    const mockLeads = [makeLead({ id: 1 }), makeLead({ id: 2 })];
    mockChain._result = { data: mockLeads, error: null, count: 42 };

    const result = await getLeadsAction();

    expect(result.leads).toEqual(mockLeads);
    expect(result.total).toBe(42);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(mockRequireSuperAdmin).toHaveBeenCalled();
  });

  it('respects page and pageSize filter', async () => {
    mockChain._result = { data: [makeLead({ id: 3 })], error: null, count: 1 };

    const result = await getLeadsAction({ page: 2, pageSize: 25 });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
    expect(mockChain.range).toHaveBeenCalledWith(25, 49);
  });

  it('filters by status', async () => {
    mockChain._result = { data: [], error: null, count: 0 };

    await getLeadsAction({ status: 'converted' });

    expect(mockChain.eq).toHaveBeenCalledWith('status', 'converted');
  });

  it('searches by business_name and phone', async () => {
    mockChain._result = { data: [], error: null, count: 0 };

    await getLeadsAction({ search: 'Hotel Sol' });

    expect(mockChain.or).toHaveBeenCalledWith(
      'business_name.ilike.%Hotel Sol%,phone.ilike.%Hotel Sol%',
    );
  });

  it('filters by city', async () => {
    mockChain._result = { data: [], error: null, count: 0 };

    await getLeadsAction({ city: 'Cordoba' });

    expect(mockChain.ilike).toHaveBeenCalledWith('city_search', '%Cordoba%');
  });

  it('filters by date range', async () => {
    mockChain._result = { data: [], error: null, count: 0 };

    await getLeadsAction({ dateFrom: '2025-01-01', dateTo: '2025-06-01' });

    expect(mockChain.gte).toHaveBeenCalledWith('created_at', '2025-01-01');
    expect(mockChain.lte).toHaveBeenCalledWith('created_at', '2025-06-01');
  });

  it('combines multiple filters', async () => {
    mockChain._result = { data: [], error: null, count: 0 };

    await getLeadsAction({ search: 'Hotel', status: 'new', city: 'Mendoza' });

    expect(mockChain.or).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith('status', 'new');
    expect(mockChain.ilike).toHaveBeenCalledWith('city_search', '%Mendoza%');
  });

  it('handles Supabase query error gracefully', async () => {
    mockChain._result = {
      data: [],
      error: { message: 'Database connection failed' },
      count: 0,
    };

    const result = await getLeadsAction({ page: 1 });

    // Error is caught internally, returns empty result
    expect(result.leads).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('rejects unauthorized caller', async () => {
    mockRequireSuperAdmin.mockRejectedValueOnce(
      new Error('No autorizado. Se requiere rol superadmin.'),
    );

    await expect(getLeadsAction()).rejects.toThrow('No autorizado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateLeadStatusAction
// ═══════════════════════════════════════════════════════════════════════════
describe('updateLeadStatusAction', () => {
  it('updates lead status successfully', async () => {
    mockChain._result = { data: null, error: null, count: 0 };

    const result = await updateLeadStatusAction('1', 'contacted');

    expect(result.success).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'contacted' });
    expect(mockChain.eq).toHaveBeenCalledWith('id', '1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/leads');
  });

  it('returns error on Supabase failure', async () => {
    mockChain._result = { data: null, error: { message: 'DB error' }, count: 0 };

    const result = await updateLeadStatusAction('1', 'lost');

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
  });

  it('rejects unauthorized caller', async () => {
    mockRequireSuperAdmin.mockRejectedValueOnce(
      new Error('No autorizado. Se requiere rol superadmin.'),
    );

    await expect(
      updateLeadStatusAction('1', 'converted'),
    ).rejects.toThrow('No autorizado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateLeadNotesAction
// ═══════════════════════════════════════════════════════════════════════════
describe('updateLeadNotesAction', () => {
  it('updates lead notes successfully', async () => {
    mockChain._result = { data: null, error: null, count: 0 };

    const result = await updateLeadNotesAction(
      '1',
      'Client interested in premium plan',
    );

    expect(result.success).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith({
      notes: 'Client interested in premium plan',
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/leads');
  });

  it('allows empty notes (clearing notes)', async () => {
    mockChain._result = { data: null, error: null, count: 0 };

    const result = await updateLeadNotesAction('1', '');

    expect(result.success).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith({ notes: '' });
  });

  it('returns error on Supabase failure', async () => {
    mockChain._result = {
      data: null,
      error: { message: 'Permission denied' },
      count: 0,
    };

    const result = await updateLeadNotesAction('1', 'Some notes');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });

  it('rejects unauthorized caller', async () => {
    mockRequireSuperAdmin.mockRejectedValueOnce(
      new Error('No autorizado. Se requiere rol superadmin.'),
    );

    await expect(
      updateLeadNotesAction('1', 'notes'),
    ).rejects.toThrow('No autorizado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deleteLeadAction
// ═══════════════════════════════════════════════════════════════════════════
describe('deleteLeadAction', () => {
  it('deletes lead successfully', async () => {
    mockChain._result = { data: null, error: null, count: 0 };

    const result = await deleteLeadAction('1');

    expect(result.success).toBe(true);
    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith('id', '1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/leads');
  });

  it('returns error on delete failure', async () => {
    mockChain._result = {
      data: null,
      error: { message: 'Lead not found' },
      count: 0,
    };

    const result = await deleteLeadAction('999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Lead not found');
  });

  it('rejects unauthorized caller', async () => {
    mockRequireSuperAdmin.mockRejectedValueOnce(
      new Error('No autorizado. Se requiere rol superadmin.'),
    );

    await expect(deleteLeadAction('1')).rejects.toThrow('No autorizado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// assignLeadToHotelAction
// ═══════════════════════════════════════════════════════════════════════════
describe('assignLeadToHotelAction', () => {
  it('assigns lead to hotel successfully', async () => {
    mockChain._result = { data: null, error: null, count: 0 };

    const result = await assignLeadToHotelAction('1', 'hotel-abc');

    expect(result.success).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith({ hotel_id: 'hotel-abc' });
    expect(mockChain.eq).toHaveBeenCalledWith('id', '1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/leads');
  });

  it('unassigns lead with empty hotel_id', async () => {
    mockChain._result = { data: null, error: null, count: 0 };

    const result = await assignLeadToHotelAction('1', '');

    expect(result.success).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith({ hotel_id: '' });
  });

  it('returns error when hotel does not exist', async () => {
    mockChain._result = {
      data: null,
      error: { message: 'Foreign key violation' },
      count: 0,
    };

    const result = await assignLeadToHotelAction('1', 'nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Foreign key violation');
  });

  it('rejects unauthorized caller', async () => {
    mockRequireSuperAdmin.mockRejectedValueOnce(
      new Error('No autorizado. Se requiere rol superadmin.'),
    );

    await expect(
      assignLeadToHotelAction('1', 'hotel-abc'),
    ).rejects.toThrow('No autorizado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createAdminLeadAction
// ═══════════════════════════════════════════════════════════════════════════
describe('createAdminLeadAction', () => {
  it('creates lead with required fields', async () => {
    const created = makeLead({ id: 99, business_name: 'Nuevo Hotel' });
    mockChain._result = { data: created, error: null, count: 0 };

    const result = await createAdminLeadAction({
      business_name: 'Nuevo Hotel',
      phone: '+5411987654321',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(mockChain.insert).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/leads');
  });

  it('creates lead with all optional fields', async () => {
    const created = makeLead({ id: 100, email: 'test@hotel.com' });
    mockChain._result = { data: created, error: null, count: 0 };

    const result = await createAdminLeadAction({
      business_name: 'Full Hotel',
      phone: '+5411912345678',
      email: 'test@hotel.com',
      city: 'Rosario',
      notes: 'Priority lead',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('rejects missing business_name', async () => {
    const result = await createAdminLeadAction({
      business_name: '',
      phone: '+5411112345678',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('nombre del negocio');
  });

  it('rejects whitespace-only business_name', async () => {
    const result = await createAdminLeadAction({
      business_name: '   ',
      phone: '+5411112345678',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('nombre del negocio');
  });

  it('rejects missing phone', async () => {
    const result = await createAdminLeadAction({
      business_name: 'Hotel Sin Telefono',
      phone: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('teléfono');
  });

  it('rejects whitespace-only phone', async () => {
    const result = await createAdminLeadAction({
      business_name: 'Hotel',
      phone: '   ',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('teléfono');
  });

  it('detects duplicate phone (Postgres unique violation)', async () => {
    mockChain._result = {
      data: null,
      error: { message: 'duplicate key', code: '23505' },
      count: 0,
    };

    const result = await createAdminLeadAction({
      business_name: 'Duplicate Hotel',
      phone: '+5411112345678',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Ya existe un lead');
    expect(result.error).toContain('teléfono');
  });

  it('handles generic Supabase insert error', async () => {
    mockChain._result = {
      data: null,
      error: { message: 'Connection timeout' },
      count: 0,
    };

    const result = await createAdminLeadAction({
      business_name: 'Hotel Error',
      phone: '+5411112345678',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection timeout');
  });

  it('rejects unauthorized caller', async () => {
    mockRequireSuperAdmin.mockRejectedValueOnce(
      new Error('No autorizado. Se requiere rol superadmin.'),
    );

    await expect(
      createAdminLeadAction({ business_name: 'H', phone: '123' }),
    ).rejects.toThrow('No autorizado');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cross-cutting: requireSuperAdmin guard on ALL actions
// ═══════════════════════════════════════════════════════════════════════════
describe('Authorization guard (cross-cutting)', () => {
  const actions = [
    { name: 'getLeadsAction', fn: () => getLeadsAction() },
    { name: 'updateLeadStatusAction', fn: () => updateLeadStatusAction('1', 'new') },
    { name: 'updateLeadNotesAction', fn: () => updateLeadNotesAction('1', 'x') },
    { name: 'deleteLeadAction', fn: () => deleteLeadAction('1') },
    { name: 'assignLeadToHotelAction', fn: () => assignLeadToHotelAction('1', 'h') },
    { name: 'createAdminLeadAction', fn: () => createAdminLeadAction({ business_name: 'X', phone: '1' }) },
  ];

  for (const action of actions) {
    it(`${action.name} calls requireSuperAdmin first`, async () => {
      mockChain._result = { data: [], error: null, count: 0 };
      mockRequireSuperAdmin.mockResolvedValue(undefined);

      await action.fn();

      expect(mockRequireSuperAdmin).toHaveBeenCalled();
    });

    it(`${action.name} rejects unauthorized caller`, async () => {
      mockRequireSuperAdmin.mockRejectedValueOnce(
        new Error('No autorizado. Se requiere rol superadmin.'),
      );

      await expect(action.fn()).rejects.toThrow('No autorizado');
    });
  }
});
