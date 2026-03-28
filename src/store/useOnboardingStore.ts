import { create } from 'zustand';

// 1. Definición estricta de tipos (TypeScript Nivel Producción)
export interface AdminData {
  email: string;
  password?: string; // Opcional porque no se guarda en el store por mucho tiempo
}

export interface HotelData {
  name: string;
  city: string;
  rooms: number;
}

interface OnboardingState {
  // Estado actual
  step: number;
  adminData: AdminData | null;
  hotelData: HotelData | null;
  paymentToken: string | null;
  isSubmitting: boolean;
  error: string | null;

  // Acciones (Mutadores)
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setAdminData: (data: AdminData) => void;
  setHotelData: (data: HotelData) => void;
  setPaymentToken: (token: string) => void;
  submitToSupabase: () => Promise<boolean>;
  reset: () => void;
}

// 2. Creación del Store (Memoria Inmutable)
export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  step: 1,
  adminData: null,
  hotelData: null,
  paymentToken: null,
  isSubmitting: false,
  error: null,

  setStep: (step) => set({ step }),
  nextStep: () => set((state) => ({ step: state.step + 1 })),
  prevStep: () => set((state) => ({ step: state.step - 1 })),
  
  setAdminData: (data) => set({ adminData: data }),
  setHotelData: (data) => set({ hotelData: data }),
  setPaymentToken: (token) => set({ paymentToken: token }),

  submitToSupabase: async () => {
    set({ isSubmitting: true, error: null });
    const { adminData, hotelData, paymentToken } = get();

    try {
      // Aquí llamaremos a la función RPC de Supabase (Transacción Atómica)
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminData, hotelData, paymentToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en la transacción');
      }

      set({ isSubmitting: false });
      return true; // Éxito total
    } catch (err: any) {
      set({ error: err.message, isSubmitting: false });
      return false; // Fallo controlado
    }
  },

  reset: () => set({
    step: 1, adminData: null, hotelData: null, paymentToken: null, isSubmitting: false, error: null
  }),
}));