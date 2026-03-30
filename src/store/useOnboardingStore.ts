import { create } from 'zustand';

// 1. Definición estricta de tipos
export interface AdminData {
  email: string;
  password?: string;
}

export interface HotelData {
  name: string;
  city: string;
  location?: string; // <- Agregado para compatibilidad con Supabase
  rooms: number;
}

interface OnboardingState {
  step: number;
  adminData: AdminData | null;
  hotelData: HotelData | null;
  paymentToken: string | null;
  isSubmitting: boolean;
  error: string | null;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setAdminData: (data: AdminData) => void;
  setHotelData: (data: HotelData) => void;
  setPaymentToken: (token: string) => void;
  submitToSupabase: () => Promise<boolean>;
  reset: () => void;
}

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

    // 🚨 CLÍNICA DE DATOS: Clonamos el hotelData y convertimos 'city' en 'location'
    // para cumplir con la regla "not-null" de la base de datos Supabase
    const dbHotelPayload = {
      ...hotelData,
      location: hotelData?.city 
    };

    try {
      // Usamos la ruta corregida
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminData, hotelData: dbHotelPayload, paymentToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en la transacción');
      }

      set({ isSubmitting: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isSubmitting: false });
      return false;
    }
  },

  reset: () => set({
    step: 1, adminData: null, hotelData: null, paymentToken: null, isSubmitting: false, error: null
  }),
}));