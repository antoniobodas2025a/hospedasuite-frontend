import { describe, it, expect, vi, beforeEach } from 'vitest';

// Pre-define mock functions so they can be controlled per test
const mockGetUser = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSingle,
          })),
        })),
      })),
    })
  ),
}));

import { requireSuperAdmin } from '@/lib/auth-guards';

describe('requireSuperAdmin()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: authenticated superadmin resolves without throwing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockSingle.mockResolvedValue({ data: { role: 'superadmin' }, error: null });

    await expect(requireSuperAdmin()).resolves.toBeUndefined();
  });

  it('non-superadmin role rejects with authorization error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockSingle.mockResolvedValue({ data: { role: 'owner' }, error: null });

    await expect(requireSuperAdmin()).rejects.toThrow('No autorizado');
  });

  it('unauthenticated user rejects with auth error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });

    await expect(requireSuperAdmin()).rejects.toThrow('No autenticado');
  });

  it('missing user_roles row rejects with authorization error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'PGRST116' } });

    await expect(requireSuperAdmin()).rejects.toThrow('No autorizado');
  });

  it('user_roles query error rejects with authorization error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'db error' } });

    await expect(requireSuperAdmin()).rejects.toThrow('No autorizado');
  });
});
