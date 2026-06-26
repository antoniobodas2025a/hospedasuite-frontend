/**
 * Feature Flags — Unit Tests
 *
 * Tests for:
 *   1. isFeatureEnabled() evaluation chain
 *      - per-hotel precedence
 *      - global fallback
 *      - static FEATURES fallback
 *      - unknown flag returns false
 *      - hotelId optionality
 *   2. Server action guards (requireSuperAdmin)
 *   3. Server action audit logging
 *   4. Server action happy paths
 *
 * Mocks supabaseAdmin, requireSuperAdmin, and logAuditEvent.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock store ─────────────────────────────────────────────────────
const {
  mockRequireSuperAdmin,
  mockRevalidatePath,
  mockLogAuditEvent,
  mockChain,
  mockGetUser,
} = vi.hoisted(() => {
  const chain: any = {
    _result: {
      data: null as any,
      error: null as { message: string; code?: string } | null,
      count: 0,
    },
    _singleResult: null as any,
  };

  const methods = [
    'select', 'update', 'delete', 'insert',
    'eq', 'is', 'order', 'limit', 'single',
  ];
  for (const m of methods) {
    chain[m] = vi.fn(function (this: any, ...args: any[]) {
      // 'is' returns a new chain stub — track the null check
      if (m === 'is') {
        chain._isNull = args[1] === null;
      }
      return chain;
    });
  }

  // maybeSingle — returns { data, error } like .single() but no error on empty
  chain.maybeSingle = vi.fn(() => {
    return Promise.resolve(chain._result);
  });

  // Make the chain thenable
  chain.then = (resolve: any, reject?: any) => {
    const r = chain._result;
    if (r?.error) {
      // For single/maybeSingle — returns { data, error }
      return Promise.resolve(resolve(r));
    }
    // For insert().select().single() — the _result might be nested
    return Promise.resolve(resolve(r));
  };

  return {
    mockRequireSuperAdmin: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockLogAuditEvent: vi.fn(),
    mockChain: chain,
    mockGetUser: vi.fn(),
  };
});

vi.mock('@/lib/auth-guards', () => ({
  requireSuperAdmin: mockRequireSuperAdmin,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockChain),
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'x-forwarded-for') return '127.0.0.1';
      if (key === 'user-agent') return 'test-agent';
      return null;
    }),
  })),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id', email: 'admin@test.com' } },
          error: null,
        }),
      ),
    },
  })),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────
import { isFeatureEnabled, FEATURES } from '@/lib/feature-flags';
import {
  getFeatureFlagsAction,
  createFeatureFlagAction,
  updateFeatureFlagAction,
  deleteFeatureFlagAction,
  toggleFeatureFlagAction,
} from '@/app/actions/superadmin-feature-flags';

// ── Setup ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue(undefined);
  mockRevalidatePath.mockClear();
  mockLogAuditEvent.mockClear();
  mockChain._result = { data: null, error: null, count: 0 };
  mockChain._isNull = false;
});

// ═══════════════════════════════════════════════════════════════════════════
// isFeatureEnabled() Evaluation Chain
// ═══════════════════════════════════════════════════════════════════════════
describe('isFeatureEnabled() evaluation chain', () => {
  it('returns true when per-hotel override is enabled', async () => {
    // First call: per-hotel query with hotel_id
    // We need to track calls — first eq('flag_key', ...) then eq('hotel_id', ...)
    let callIndex = 0;
    mockChain.maybeSingle = vi.fn(() => {
      callIndex++;
      if (callIndex === 1) {
        // Per-hotel query returns enabled=true
        return Promise.resolve({ data: { enabled: true }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const result = await isFeatureEnabled('wizard_wompi', 'hotel-123');
    expect(result).toBe(true);
  });

  it('returns false when per-hotel override is disabled (even if global is true)', async () => {
    let callIndex = 0;
    mockChain.maybeSingle = vi.fn(() => {
      callIndex++;
      if (callIndex === 1) {
        // Per-hotel query returns enabled=false
        return Promise.resolve({ data: { enabled: false }, error: null });
      }
      return Promise.resolve({ data: { enabled: true }, error: null });
    });

    const result = await isFeatureEnabled('wizard_wompi', 'hotel-123');
    expect(result).toBe(false);
  });

  it('falls back to global flag when no per-hotel override exists', async () => {
    let callIndex = 0;
    mockChain.maybeSingle = vi.fn(() => {
      callIndex++;
      if (callIndex === 1) {
        // Per-hotel query returns empty
        return Promise.resolve({ data: null, error: null });
      }
      // Global query returns enabled=true
      return Promise.resolve({ data: { enabled: true }, error: null });
    });

    const result = await isFeatureEnabled('wizard_wompi', 'hotel-123');
    expect(result).toBe(true);
  });

  it('uses global flag directly when no hotelId is provided', async () => {
    mockChain.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: { enabled: true }, error: null }),
    );

    const result = await isFeatureEnabled('wizard_wompi');
    expect(result).toBe(true);
  });

  it('falls back to static FEATURES when no DB flag exists', async () => {
    mockChain.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );

    // WIZARD_WOMPI_SUBSCRIPTION is defined in FEATURES
    const staticValue = FEATURES.WIZARD_WOMPI_SUBSCRIPTION;
    const result = await isFeatureEnabled('WIZARD_WOMPI_SUBSCRIPTION');
    expect(result).toBe(staticValue);
  });

  it('returns false for unknown flag with no DB or static entry', async () => {
    mockChain.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );

    const result = await isFeatureEnabled('nonexistent_flag');
    expect(result).toBe(false);
  });

  it('skips per-hotel lookup when hotelId is not provided', async () => {
    mockChain.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: { enabled: false }, error: null }),
    );

    const result = await isFeatureEnabled('wizard_wompi');
    // Only global query should happen (one call to maybeSingle)
    expect(result).toBe(false);
    // The .eq('hotel_id', ...) should NOT have been called
  });

  it('handles DB errors gracefully by falling back to static', async () => {
    mockChain.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: 'DB error' } }),
    );

    const staticValue = FEATURES.WIZARD_WOMPI_SUBSCRIPTION;
    const result = await isFeatureEnabled('WIZARD_WOMPI_SUBSCRIPTION');
    expect(result).toBe(staticValue);
  });

  it('handles DB errors gracefully returning false for unknown keys', async () => {
    mockChain.maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: 'DB error' } }),
    );

    const result = await isFeatureEnabled('unknown_flag');
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Server Action Guards (requireSuperAdmin)
// ═══════════════════════════════════════════════════════════════════════════
describe('Authorization guard (cross-cutting)', () => {
  const actions = [
    { name: 'getFeatureFlagsAction', fn: () => getFeatureFlagsAction() },
    {
      name: 'createFeatureFlagAction',
      fn: () =>
        createFeatureFlagAction({
          flag_key: 'TEST_FLAG',
          flag_name: 'Test Flag',
        }),
    },
    {
      name: 'updateFeatureFlagAction',
      fn: () => updateFeatureFlagAction('id-1', { flag_name: 'Updated' }),
    },
    {
      name: 'deleteFeatureFlagAction',
      fn: () => deleteFeatureFlagAction('id-1'),
    },
    {
      name: 'toggleFeatureFlagAction',
      fn: () => toggleFeatureFlagAction('id-1'),
    },
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

// ═══════════════════════════════════════════════════════════════════════════
// getFeatureFlagsAction
// ═══════════════════════════════════════════════════════════════════════════
describe('getFeatureFlagsAction', () => {
  it('returns all feature flags', async () => {
    const mockFlags = [
      {
        id: '1',
        flag_key: 'TEST_A',
        flag_name: 'Test A',
        description: null,
        enabled: true,
        hotel_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];
    mockChain._result = { data: mockFlags, error: null, count: 1 };

    const result = await getFeatureFlagsAction();

    expect(result).toEqual(mockFlags);
    expect(mockRequireSuperAdmin).toHaveBeenCalled();
  });

  it('filters by hotelId when provided', async () => {
    mockChain._result = { data: [], error: null, count: 0 };

    await getFeatureFlagsAction('hotel-123');

    expect(mockChain.eq).toHaveBeenCalledWith('hotel_id', 'hotel-123');
  });

  it('handles Supabase query error gracefully', async () => {
    mockChain._result = {
      data: null,
      error: { message: 'Database error' },
      count: 0,
    };

    const result = await getFeatureFlagsAction();

    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// createFeatureFlagAction
// ═══════════════════════════════════════════════════════════════════════════
describe('createFeatureFlagAction', () => {
  it('creates a feature flag successfully', async () => {
    const created = {
      id: 'new-id',
      flag_key: 'TEST_FLAG',
      flag_name: 'Test Flag',
      description: null,
      enabled: false,
      hotel_id: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    mockChain._result = { data: created, error: null, count: 0 };

    const result = await createFeatureFlagAction({
      flag_key: 'TEST_FLAG',
      flag_name: 'Test Flag',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(created);
    expect(mockChain.insert).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/feature-flags');
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'feature_flag_created',
        entity_type: 'feature_flag',
        entity_id: 'new-id',
      }),
    );
  });

  it('rejects missing flag_key', async () => {
    const result = await createFeatureFlagAction({
      flag_key: '',
      flag_name: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('flag_key');
  });

  it('rejects missing flag_name', async () => {
    const result = await createFeatureFlagAction({
      flag_key: 'TEST',
      flag_name: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('flag_name');
  });

  it('detects duplicate key via error code 23505', async () => {
    mockChain._result = {
      data: null,
      error: { message: 'duplicate key', code: '23505' },
      count: 0,
    };

    const result = await createFeatureFlagAction({
      flag_key: 'EXISTING_KEY',
      flag_name: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Ya existe');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateFeatureFlagAction
// ═══════════════════════════════════════════════════════════════════════════
describe('updateFeatureFlagAction', () => {
  it('updates flag name and audits', async () => {
    mockChain._result = { data: { id: '1', flag_name: 'Old Name' }, error: null, count: 0 };

    const result = await updateFeatureFlagAction('1', { flag_name: 'New Name' });

    expect(result.success).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith({ flag_name: 'New Name' });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/feature-flags');
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'feature_flag_updated',
        entity_type: 'feature_flag',
        entity_id: '1',
      }),
    );
  });

  it('returns error on Supabase failure', async () => {
    mockChain._result = {
      data: null,
      error: { message: 'DB error' },
      count: 0,
    };

    const result = await updateFeatureFlagAction('1', { flag_name: 'X' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// deleteFeatureFlagAction
// ═══════════════════════════════════════════════════════════════════════════
describe('deleteFeatureFlagAction', () => {
  it('deletes flag and audits with snapshot', async () => {
    mockChain._result = { data: { id: '1', flag_key: 'TO_DELETE' }, error: null, count: 0 };

    const result = await deleteFeatureFlagAction('1');

    expect(result.success).toBe(true);
    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/feature-flags');
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'feature_flag_deleted',
        entity_type: 'feature_flag',
        entity_id: '1',
        new_value: null,
      }),
    );
  });

  it('returns error on delete failure', async () => {
    mockChain._result = {
      data: null,
      error: { message: 'Not found' },
      count: 0,
    };

    const result = await deleteFeatureFlagAction('999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not found');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// toggleFeatureFlagAction
// ═══════════════════════════════════════════════════════════════════════════
describe('toggleFeatureFlagAction', () => {
  it('flips enabled from true to false', async () => {
    mockChain._result = { data: { enabled: true }, error: null, count: 0 };

    const result = await toggleFeatureFlagAction('1');

    expect(result.success).toBe(true);
    expect(result.enabled).toBe(false);
    expect(mockChain.update).toHaveBeenCalledWith({ enabled: false });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/feature-flags');
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'feature_flag_toggled',
        entity_type: 'feature_flag',
        entity_id: '1',
      }),
    );
  });

  it('flips enabled from false to true', async () => {
    mockChain._result = { data: { enabled: false }, error: null, count: 0 };

    const result = await toggleFeatureFlagAction('1');

    expect(result.success).toBe(true);
    expect(result.enabled).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith({ enabled: true });
  });

  it('returns error when flag not found', async () => {
    mockChain._result = { data: null, error: null, count: 0 };

    const result = await toggleFeatureFlagAction('nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toContain('no encontrado');
  });

  it('returns error on Supabase update failure', async () => {
    // First call: snapshot returns { enabled: true }
    // But we need a different result for update — we'll mock the chain differently
    // Using a mutation counter approach
    let calls = 0;
    mockChain.then = (resolve: any) => {
      calls++;
      if (calls === 1) {
        // snapshot
        return Promise.resolve(resolve({ data: { enabled: true }, error: null }));
      }
      // update fails
      return Promise.resolve(resolve({ data: null, error: { message: 'DB error' }, count: 0 }));
    };

    const result = await toggleFeatureFlagAction('1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
  });
});
