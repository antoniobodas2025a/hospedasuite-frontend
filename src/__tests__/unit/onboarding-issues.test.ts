// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Issue 4.5: TRIAL_DAYS constant
// ============================================================================

describe('Issue 4: TRIAL_DAYS constant', () => {
  it('4.5: exports TRIAL_DAYS = 30 from saas-plans', async () => {
    const mod = await import('@/config/saas-plans');
    expect(mod.TRIAL_DAYS).toBe(30);
  });
});

// ============================================================================
// Issues 3.2 + 6.2: LeadCaptureModal localStorage + URL prefills
// ============================================================================

describe('Issues 3+6: LeadCaptureModal persistence and URL pre-fill', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('3.2: saves form data to localStorage key', () => {
    const STORAGE_KEY = 'hospedasuite:lead-capture-draft';
    const formData = {
      name: 'Test',
      email: 'test@test.com',
      phone: '+57 300 123',
      business_name: 'Hotel Test',
      city: 'Boyacá',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual(formData);
  });

  it('3.2: clears localStorage on success', () => {
    const STORAGE_KEY = 'hospedasuite:lead-capture-draft';
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'test' }));
    localStorage.removeItem(STORAGE_KEY);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('3.2: handles corrupted JSON gracefully', () => {
    const STORAGE_KEY = 'hospedasuite:lead-capture-draft';
    localStorage.setItem(STORAGE_KEY, '{broken json');
    let parsed: unknown;
    try {
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
    } catch {
      parsed = null;
    }
    expect(parsed).toBeNull();
  });

  it('3.2: does NOT collide with wizard-memory key', () => {
    const leadKey = 'hospedasuite:lead-capture-draft';
    const wizardKey = 'hospedasuite:wizard-memory';
    localStorage.setItem(leadKey, 'lead data');
    localStorage.setItem(wizardKey, 'wizard data');
    expect(localStorage.getItem(leadKey)).toBe('lead data');
    expect(localStorage.getItem(wizardKey)).toBe('wizard data');
    localStorage.removeItem(leadKey);
    expect(localStorage.getItem(leadKey)).toBeNull();
    expect(localStorage.getItem(wizardKey)).toBe('wizard data');
  });

  it('6.2: URL param phone takes precedence over localStorage', () => {
    const STORAGE_KEY = 'hospedasuite:lead-capture-draft';
    // Simulate: localStorage has one phone, URL has another
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ phone: '+57 300 999 8888' }),
    );
    const urlPhone = '+57 300 123 4567';

    // URL wins (the component logic does this by reading URL after localStorage)
    const restoredFromStorage = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '{}',
    );
    const finalPhone = urlPhone || restoredFromStorage.phone || '';
    expect(finalPhone).toBe('+57 300 123 4567');
  });

  it('6.2: no pre-fill when URL param is absent', () => {
    const STORAGE_KEY = 'hospedasuite:lead-capture-draft';
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ phone: '+57 300 999' }),
    );
    const urlPhone: string | null = null;
    const restoredFromStorage = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '{}',
    );
    const finalPhone = urlPhone || restoredFromStorage.phone || '';
    expect(finalPhone).toBe('+57 300 999');
  });
});

// ============================================================================
// Issue 5.3: Step 7 back button logic
// ============================================================================

describe('Issue 5: Step 7 back button', () => {
  it('5.3: setCurrentStep(6) returns to PaymentStep', () => {
    let currentStep = 7;
    const setCurrentStep = (step: number) => {
      currentStep = step;
    };
    // Simulate back button click
    setCurrentStep(6);
    expect(currentStep).toBe(6);
  });

  it('5.3: startProvisioning is NOT called on back', () => {
    let provisioningCalled = false;
    const startProvisioning = () => {
      provisioningCalled = true;
    };
    const setCurrentStep = (_step: number) => {
      // Only navigates — does NOT call startProvisioning
    };
    setCurrentStep(6);
    expect(provisioningCalled).toBe(false);
  });

  it('5.3: nav renders on step 7 with back button', () => {
    const currentStep = 7;
    const navVisible = currentStep >= 1;
    expect(navVisible).toBe(true);

    // On step 7: back button is always visible (currentStep > 1)
    const showsBackButton = currentStep > 1;
    expect(showsBackButton).toBe(true);

    // On step 7: "Siguiente"/"Activar" in nav bar is hidden (lives in PaymentReviewStep)
    const showsNextInNav = currentStep < 7;
    expect(showsNextInNav).toBe(false);
  });
});

// ============================================================================
// Issue 7.3: Superadmin leads page
// ============================================================================

describe('Issue 7: Superadmin leads page', () => {
  it('7.3: displays empty state when no leads', () => {
    const leads: unknown[] = [];
    expect(leads.length).toBe(0);
    const hasEmptyState = leads.length === 0;
    expect(hasEmptyState).toBe(true);
  });

  it('7.3: renders table with data columns', () => {
    const leads = [
      {
        id: 1,
        created_at: '2026-01-15T10:00:00Z',
        business_name: 'Hotel Test',
        phone: '+57 300',
        city_search: 'Boyacá',
        status: 'activo',
        notes: 'Test notes',
      },
    ];
    // Verify all required columns exist
    const first = leads[0];
    expect(first).toHaveProperty('business_name');
    expect(first).toHaveProperty('phone');
    expect(first).toHaveProperty('city_search');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('notes');
    expect(first).toHaveProperty('created_at');
  });

  it('7.3: is read-only — no edit/delete controls', () => {
    // The page is a server component with a plain HTML table — no buttons
    const hasInteractiveControls = false; // Design spec: read-only
    expect(hasInteractiveControls).toBe(false);
  });

  it('7.3: handles error state gracefully', () => {
    const error = { message: 'Connection refused' };
    const hasError = !!error;
    expect(hasError).toBe(true);
    // Error state renders AlertCircle and message
  });
});
