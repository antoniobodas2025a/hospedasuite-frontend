'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  processPaymentAction, 
  getAccountStatementAction, 
  finalizeCheckoutAction 
} from '@/app/actions/payments';
import { calculateStayPrice } from '@/utils/supabase/pricing';

// ==========================================
// BLOQUE 1: INTERFACES Y CONTRATOS ESTRICTOS
// ==========================================

export interface BookingSummary {
  id: string;
  room: any; // 🛡️ Soporte polimórfico (Array u Objeto)
  guest: { full_name: string; doc_number: string };
  check_in: string;
  check_out: string;
  total_price: number; 
  status: string;
}

export interface AccountStatement {
  roomArgs: number;
  serviceCharges: number;
  totalPaid: number;
  balance: number;
  details: {
    services: { id: string; total_price: number; created_at: string; description?: string; quantity?: number }[];
    payments: { id: string; amount: number; method: string; created_at: string }[];
  };
}

interface PaymentForm {
  amount: number;
  method: string;
  notes: string;
}

// ==========================================
// BLOQUE 2: CAPA DE NORMALIZACIÓN (Zero-Trust)
// ==========================================

const sanitizeStatement = (data: any, auditedRoomPrice: number): AccountStatement => {
  const finalRoomArgs = (data?.roomArgs && data.roomArgs > 0) ? Number(data.roomArgs) : auditedRoomPrice;
  
  const serviceCharges = Number(data?.serviceCharges) || 0;
  const totalPaid = Number(data?.totalPaid) || 0;
  
  const finalBalance = (finalRoomArgs + serviceCharges) - totalPaid;

  return {
    roomArgs: finalRoomArgs,
    serviceCharges,
    totalPaid,
    balance: finalBalance,
    details: {
      services: Array.isArray(data?.details?.services) ? data.details.services : [],
      payments: Array.isArray(data?.details?.payments) ? data.details.payments : [],
    }
  };
};

// ==========================================
// BLOQUE 3: LÓGICA DEL HOOK (Motor de Estado)
// ==========================================

export const useCheckout = (activeBookings: BookingSummary[]) => {
  const router = useRouter();
  
  const [selectedBooking, setSelectedBooking] = useState<BookingSummary | null>(null);
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: 0,
    method: 'cash',
    notes: '',
  });

  // ⚡ MEMOIZACIÓN: Carga de Bóveda y Auditoría Matemática
  const loadAccountForBooking = useCallback(async (booking: BookingSummary) => {
    setIsLoading(true);
    setSelectedBooking(booking);

    try {
      const roomData = Array.isArray(booking.room) ? booking.room[0] : booking.room;
      const roomId = roomData?.id || '';
      const basePrice = Number(roomData?.price) || 0;
      const weekendPrice = Number(roomData?.weekend_price) || (basePrice * 1.2);

      let effectiveRoomPrice = Number(booking.total_price) || 0;
      
      if (effectiveRoomPrice <= 0) {
        const { calculateStayPrice: computePrice } = await import('@/utils/supabase/pricing');
        const breakdown = computePrice(
          booking.check_in, 
          booking.check_out, 
          basePrice, 
          weekendPrice
        );
        effectiveRoomPrice = breakdown.totalPrice;
      }

      const res = await getAccountStatementAction(booking.id, roomId, effectiveRoomPrice);
      
      if (!res.success) throw new Error(res.error || 'Falla en la resolución de cuenta.');

      const cleanStatement = sanitizeStatement(res.statement, effectiveRoomPrice);
      setStatement(cleanStatement);

      setPaymentForm(prev => ({
        ...prev,
        amount: cleanStatement.balance > 0 ? cleanStatement.balance : 0,
      }));
    } catch (e: any) {
      console.error("[CRITICAL] Billing Resolve Error:", e);
      alert('Error en la Bóveda de Datos: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ⚡ MEMOIZACIÓN: processPayment
  const processPayment = useCallback(async () => {
    if (!selectedBooking || !statement) return;
    if (paymentForm.amount <= 0) return alert('El vector de pago debe ser mayor a $0');

    setIsLoading(true);
    try {
      const result = await processPaymentAction({
        booking_id: selectedBooking.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        notes: paymentForm.notes || 'Abono en Terminal de Salida',
      });

      if (!result.success) throw new Error(result.error);

      await loadAccountForBooking(selectedBooking);
      
      setPaymentForm(prev => ({ ...prev, notes: '' }));
      
      // 🛡️ REPARACIÓN SEMÁNTICA: Claridad operativa
      alert('✅ Pago registrado correctamente en la cuenta.');
      
      router.refresh();
    } catch (e: any) {
      alert('Violación de Integridad en el Pago: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBooking, statement, paymentForm, loadAccountForBooking, router]);

  // ⚡ MEMOIZACIÓN: finalizeCheckout
  const finalizeCheckout = useCallback(async () => {
    if (!selectedBooking || !statement) return;

    if (statement.balance > 0) {
      const confirmForced = confirm(
        `⚠️ ALERTA DE RIESGO: El folio presenta un saldo pendiente de $${statement.balance.toLocaleString()}. ¿Desea autorizar un Checkout Forzado?`
      );
      if (!confirmForced) return;
    } else {
      if (!confirm('¿Confirmar liberación de unidad y cierre definitivo de folio?')) return;
    }

    setIsLoading(true);
    try {
      const roomData = Array.isArray(selectedBooking.room) ? selectedBooking.room[0] : selectedBooking.room;
      const serviceIds = statement.details.services.map((s) => s.id);
      
      const result = await finalizeCheckoutAction(
        selectedBooking.id, 
        roomData?.id || '', 
        serviceIds
      );
      
      if (!result.success) throw new Error(result.error);

      // 🛡️ REPARACIÓN SEMÁNTICA: Claridad operativa
      alert('👋 Proceso de Salida Completado. La habitación ha sido liberada.');
      
      // 🛡️ REPARACIÓN FORENSE: Hard Reset de Estado y URL
      window.location.href = '/dashboard/checkout';

    } catch (e: any) {
      alert('Falla Crítica en Transmisión de Cierre: ' + e.message);
      setIsLoading(false); 
    }
  }, [selectedBooking, statement]);

  return {
    selectedBooking,
    statement,
    isLoading,
    loadAccountForBooking,
    paymentForm,
    setPaymentForm,
    processPayment,
    finalizeCheckout,
  };
};