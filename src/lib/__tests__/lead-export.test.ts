/**
 * lead-export — Unit Tests
 *
 * Validates RFC 4180 CSV export for the superadmin lead management panel.
 * Tests escaping, empty arrays, filename generation, and Blob creation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LeadDTO } from '@/types/leads';

// ── DOM mocks for Blob / URL / document ────────────────────────────────────
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

let createdBlobs: any[] = [];
let createdElements: any[] = [];

beforeEach(() => {
  createdBlobs = [];
  createdElements = [];

  // Mock Blob constructor
  (globalThis as any).Blob = class MockBlob {
    parts: any[];
    options: any;
    constructor(parts: any[], options: any) {
      this.parts = parts;
      this.options = options;
      createdBlobs.push({ parts, options });
    }
  };

  // Mock URL.createObjectURL / revokeObjectURL
  URL.createObjectURL = mockCreateObjectURL;
  URL.revokeObjectURL = mockRevokeObjectURL;

  // Mock document.createElement
  (globalThis as any).document = {
    createElement: vi.fn((_tag: string) => {
      const el: any = {
        href: '',
        download: '',
        style: {},
        click: mockClick,
      };
      createdElements.push(el);
      return el;
    }),
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
  };

  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Import after DOM mocks are set ─────────────────────────────────────────
import { exportLeadsToCSV } from '@/lib/lead-export';

// ── Test fixtures ──────────────────────────────────────────────────────────
function makeLead(overrides: Partial<LeadDTO> = {}): LeadDTO {
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

// ═══════════════════════════════════════════════════════════════════════════
describe('exportLeadsToCSV', () => {
  // ── Basic export ─────────────────────────────────────────────────────────
  describe('basic export', () => {
    it('generates CSV with header row and data rows for 2 leads', () => {
      const leads = [
        makeLead({ id: 1, business_name: 'Hotel A', phone: '111' }),
        makeLead({ id: 2, business_name: 'Hotel B', phone: '222' }),
      ];

      exportLeadsToCSV(leads);

      expect(createdBlobs).toHaveLength(1);
      const [csvContent] = createdBlobs[0].parts;
      const lines = csvContent.split('\n');

      // Header row
      expect(lines[0]).toContain('ID');
      expect(lines[0]).toContain('Negocio');
      expect(lines[0]).toContain('Teléfono');

      // 2 data rows
      expect(lines).toHaveLength(3); // header + 2 data
      expect(lines[1]).toContain('Hotel A');
      expect(lines[2]).toContain('Hotel B');
    });

    it('uses text/csv MIME type with UTF-8 charset', () => {
      exportLeadsToCSV([makeLead()]);

      expect(createdBlobs[0].options.type).toBe('text/csv;charset=utf-8;');
    });
  });

  // ── Empty leads array ────────────────────────────────────────────────────
  describe('empty leads array', () => {
    it('generates CSV with only header row', () => {
      exportLeadsToCSV([]);

      const [csvContent] = createdBlobs[0].parts;
      const lines = csvContent.split('\n');

      expect(lines).toHaveLength(1); // header only
      expect(lines[0]).toContain('ID');
      expect(lines[0]).toContain('Negocio');
    });

    it('does not throw with empty array', () => {
      expect(() => exportLeadsToCSV([])).not.toThrow();
    });
  });

  // ── RFC 4180 escaping ────────────────────────────────────────────────────
  describe('RFC 4180 escaping', () => {
    it('wraps fields containing commas in double quotes', () => {
      const leads = [
        makeLead({
          id: 1,
          business_name: 'Hotel, Resort & Spa',
          notes: 'VIP client, needs priority',
        }),
      ];

      exportLeadsToCSV(leads);

      const [csvContent] = createdBlobs[0].parts;
      expect(csvContent).toContain('"Hotel, Resort & Spa"');
      expect(csvContent).toContain('"VIP client, needs priority"');
    });

    it('escapes double quotes by doubling them per RFC 4180', () => {
      const leads = [
        makeLead({
          id: 1,
          business_name: 'Hotel "El Sol"',
          notes: 'Needs "urgent" follow-up',
        }),
      ];

      exportLeadsToCSV(leads);

      const [csvContent] = createdBlobs[0].parts;
      // Double quotes inside field should become ""
      expect(csvContent).toContain('"Hotel ""El Sol"""');
      expect(csvContent).toContain('"Needs ""urgent"" follow-up"');
    });

    it('wraps fields containing newlines in double quotes', () => {
      const leads = [
        makeLead({
          id: 1,
          notes: 'Line 1\nLine 2',
        }),
      ];

      exportLeadsToCSV(leads);

      const [csvContent] = createdBlobs[0].parts;
      expect(csvContent).toContain('"Line 1\nLine 2"');
    });

    it('escapes fields with both commas and quotes', () => {
      const leads = [
        makeLead({
          id: 1,
          business_name: 'Hotel "ABC", Great Place',
        }),
      ];

      exportLeadsToCSV(leads);

      const [csvContent] = createdBlobs[0].parts;
      // Both comma and quotes → wrapped and quotes doubled
      expect(csvContent).toContain('"Hotel ""ABC"", Great Place"');
    });
  });

  // ── Null/undefined values ────────────────────────────────────────────────
  describe('null and undefined values', () => {
    it('converts null fields to empty string', () => {
      const leads = [
        makeLead({ id: 1, address: null, website: null, rating: null }),
      ];

      exportLeadsToCSV(leads);

      const [csvContent] = createdBlobs[0].parts;
      // Should not contain "null" as text
      expect(csvContent).not.toContain('null');
    });
  });

  // ── Custom filename ──────────────────────────────────────────────────────
  describe('filename', () => {
    it('uses default date-based filename when none provided', () => {
      exportLeadsToCSV([makeLead()]);

      const link = createdElements[0];
      expect(link.download).toMatch(/^leads-export-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('uses custom filename when provided', () => {
      exportLeadsToCSV([makeLead()], 'mi-export.csv');

      const link = createdElements[0];
      expect(link.download).toBe('mi-export.csv');
    });
  });

  // ── Blob creation and download ───────────────────────────────────────────
  describe('download mechanism', () => {
    it('creates a Blob with csv content', () => {
      exportLeadsToCSV([makeLead()]);

      expect(createdBlobs).toHaveLength(1);
      expect(createdBlobs[0].options.type).toBe('text/csv;charset=utf-8;');
    });

    it('creates a temporary anchor element and triggers click', () => {
      exportLeadsToCSV([makeLead()]);

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it('appends link to document body and removes it after click', () => {
      exportLeadsToCSV([makeLead()]);

      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    it('revokes the object URL after download', () => {
      exportLeadsToCSV([makeLead()]);

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
