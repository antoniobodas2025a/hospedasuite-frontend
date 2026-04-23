'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  processPaymentAction, 
  getAccountStatementAction, 
  finalizeCheckoutAction 
} from '@/app/actions/payments';

// ==========================================
// BLOQUE 1: INTERFACES Y CONTRATOS ESTRICTOS
// ==========================================

export interface BookingSummary {
  id: string;
  room: { id: string; name: string };
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
    services: { id: string; total_price: number; created_at: string }[];
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

/**
 * 🛡️ ACL (Anti-Corruption Layer): Garantiza que los datos financieros 
 * tengan valores por defecto seguros si el servidor falla o devuelve data parcial.
 */
const sanitizeStatement = (data: any): AccountStatement => ({
  roomArgs: Number(data?.roomArgs) || 0,
  serviceCharges: Number(data?.serviceCharges) || 0,
  totalPaid: Number(data?.totalPaid) || 0,
  balance: Number(data?.balance) || 0,
  details: {
    services: Array.isArray(data?.details?.services) ? data.details.services : [],
    payments: Array.isArray(data?.details?.payments) ? data.details.payments : [],
  }
});

// ==========================================
// BLOQUE 3: LÓGICA DEL HOOK (Motor de Estado)
// ==========================================

export const useCheckout = (activeBookings: BookingSummary[]) => {
  const router = useRouter();
  
  // Estados de Dominio Criptográfico
  const [selectedBooking, setSelectedBooking] = useState<BookingSummary | null>(null);
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estado de UI (Formulario de Liquidación)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: 0,
    method: 'cash',
    notes: '',
  });

  // ⚡ MEMOIZACIÓN: loadAccountForBooking (Carga de Nodo Financiero)
  const loadAccountForBooking = useCallback(async (booking: BookingSummary) => {
    setIsLoading(true);
    setSelectedBooking(booking);

    try {
      const res = await getAccountStatementAction(booking.id, booking.room.id, booking.total_price);
      
      if (!res.success) throw new Error(res.error || 'Falla en la resolución de cuenta.');

      // Inyección de seguridad Zero-Trust: Blindaje de Tipos
      const cleanStatement = sanitizeStatement(res.statement);
      setStatement(cleanStatement);

      // Actualización atómica del monto sugerido para evitar desajustes en UI
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

  // ⚡ MEMOIZACIÓN: processPayment (Ejecución de Abono)
  const processPayment = useCallback(async () => {
    if (!selectedBooking || !statement) return;
    if (paymentForm.amount <= 0) return alert('El vector de pago debe ser mayor a 0');

    setIsLoading(true);
    try {
      const result = await processPaymentAction({
        booking_id: selectedBooking.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        notes: paymentForm.notes || 'Abono en Terminal de Salida',
      });

      if (!result.success) throw new Error(result.error);

      // Recarga atómica de la cuenta tras el registro de abono para sincronía absoluta
      await loadAccountForBooking(selectedBooking);
      alert('✅ Transacción firmada y registrada en el Ledger.');
      
      setPaymentForm(prev => ({ ...prev, amount: 0, notes: '' }));
    } catch (e: any) {
      alert('Violación de Integridad en el Pago: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBooking, statement, paymentForm, loadAccountForBooking]);

  // ⚡ MEMOIZACIÓN: finalizeCheckout (Cierre de Folio y Liberación)
  const finalizeCheckout = useCallback(async () => {
    if (!selectedBooking || !statement) return;

    // Lógica de validación de riesgo financiero (Protocolo de Alerta)
    if (statement.balance > 0) {
      const confirmForced = confirm(
        `⚠️ ALERTA DE RIESGO: El folio presenta un saldo de $${statement.balance.toLocaleString()}. ¿Desea autorizar un Checkout Forzado?`
      );
      if (!confirmForced) return;
    } else {
      if (!confirm('¿Confirmar liberación de unidad y cierre definitivo de folio?')) return;
    }

    setIsLoading(true);
    try {
      const serviceIds = statement.details.services.map((s) => s.id);
      
      const result = await finalizeCheckoutAction(
        selectedBooking.id, 
        selectedBooking.room.id, 
        serviceIds
      );
      
      if (!result.success) throw new Error(result.error);

      alert('👋 Proceso de Salida Completado. Unidad transmutada a estado "DIRTY" (Mantenimiento).');
      
      // Desencadenar re-renderizado global del RSC
      router.refresh();
      setSelectedBooking(null);
      setStatement(null);
    } catch (e: any) {
      alert('Falla Crítica en Transmisión de Cierre: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBooking, statement, router]);

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