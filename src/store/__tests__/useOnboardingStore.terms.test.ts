// @vitest-environment jsdom
import '../../__tests__/bun-test-dom-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from '../useOnboardingStore';

describe('useOnboardingStore - Terms Acceptance', () => {
  beforeEach(() => {
    // Reset store state before each test
    useOnboardingStore.setState({
      termsAccepted: false,
    });
  });

  it('should have termsAccepted initialized to false', () => {
    const state = useOnboardingStore.getState();
    expect(state.termsAccepted).toBe(false);
  });

  it('should update termsAccepted when setTermsAccepted is called with true', () => {
    const { setTermsAccepted } = useOnboardingStore.getState();
    setTermsAccepted(true);
    
    const state = useOnboardingStore.getState();
    expect(state.termsAccepted).toBe(true);
  });

  it('should update termsAccepted when setTermsAccepted is called with false', () => {
    const { setTermsAccepted } = useOnboardingStore.getState();
    
    // First set to true
    setTermsAccepted(true);
    expect(useOnboardingStore.getState().termsAccepted).toBe(true);
    
    // Then set to false
    setTermsAccepted(false);
    expect(useOnboardingStore.getState().termsAccepted).toBe(false);
  });

  it('should reset termsAccepted to false when reset is called', () => {
    const { setTermsAccepted, reset } = useOnboardingStore.getState();
    
    // Set to true
    setTermsAccepted(true);
    expect(useOnboardingStore.getState().termsAccepted).toBe(true);
    
    // Reset
    reset();
    expect(useOnboardingStore.getState().termsAccepted).toBe(false);
  });
});

describe('useOnboardingStore - Step 6 Validation', () => {
  beforeEach(() => {
    // Reset store state before each test
    useOnboardingStore.getState().reset();
  });

  it('should fail validation when paymentMethod is not selected', () => {
    const { validateStep } = useOnboardingStore.getState();
    const result = validateStep(6);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Necesitas seleccionar un método de pago');
  });

  it('should fail validation when termsAccepted is false', () => {
    const { setPaymentMethod, validateStep } = useOnboardingStore.getState();
    setPaymentMethod('free');
    
    const result = validateStep(6);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Debés aceptar los Términos y Condiciones y la Política de Privacidad');
  });

  it('should pass validation when paymentMethod is selected and termsAccepted is true', () => {
    const { setPaymentMethod, setTermsAccepted, validateStep } = useOnboardingStore.getState();
    setPaymentMethod('free');
    setTermsAccepted(true);
    
    const result = validateStep(6);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation when both paymentMethod and termsAccepted are missing', () => {
    const { validateStep } = useOnboardingStore.getState();
    const result = validateStep(6);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('Necesitas seleccionar un método de pago');
    expect(result.errors).toContain('Debés aceptar los Términos y Condiciones y la Política de Privacidad');
  });
});
