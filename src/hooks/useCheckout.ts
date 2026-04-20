'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  processPaymentAction, 
  getAccountStatementAction, 
  finalizeCheckoutAction 
} from '@/app/actions/payments';

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

export const useCheckout = (activeBookings: BookingSummary[]) => {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<BookingSummary | null>(null);
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'cash',
    notes: '',
  });

  const loadAccountForBooking = async (booking: BookingSummary) => {
    setIsLoading(true);
    setSelectedBooking(booking);

    try {
      // 🛡️ Invocación segura a Server Action (Cero exposición de BD)
      const res = await getAccountStatementAction(booking.id, booking.room.id, booking.total_price);
      
      if (!res.success || !res.statement) throw new Error(res.error);

      setStatement(res.statement);
      setPaymentForm((prev) => ({
        ...prev,
        amount: res.statement.balance > 0 ? res.statement.balance : 0,
      }));
    } catch (e: any) {
      console.error(e);
      alert('Error cargando cuenta: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const processPayment = async () => {
    if (!selectedBooking || !statement) return;
    if (paymentForm.amount <= 0) return alert('El monto debe ser mayor a 0');

    setIsLoading(true);
    try {
      const result = await processPaymentAction({
        booking_id: selectedBooking.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        notes: paymentForm.notes || 'Abono en Checkout',
      });

      if (!result.success) throw new Error(result.error);

      await loadAccountForBooking(selectedBooking);
      alert('✅ Pago registrado con auditoría');
      setPaymentForm((prev) => ({ ...prev, amount: 0, notes: '' }));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeCheckout = async () => {
    if (!selectedBooking || !statement) return;

    if (statement.balance > 0) {
      if (!confirm(`⚠️ Hay un saldo pendiente de $${statement.balance.toLocaleString()}. ¿Cerrar cuenta de todas formas?`)) return;
    } else {
      if (!confirm('¿Confirmar salida del huésped y liberar habitación?')) return;
    }

    setIsLoading(true);
    try {
      const serviceIds = statement.details.services.map((s) => s.id);
      
      // 🛡️ Mutación delegada al servidor (Previene inyección de estado)
      const result = await finalizeCheckoutAction(selectedBooking.id, selectedBooking.room.id, serviceIds);
      
      if (!result.success) throw new Error(result.error);

      alert('👋 Check-out exitoso. Habitación marcada como SUCIA.');
      router.refresh();
      setSelectedBooking(null);
      setStatement(null);
    } catch (e: any) {
      alert('Error crítico en checkout: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

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