'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { processPaymentAction } from '@/app/actions/payments';

// Interfaces basadas en tu Backup SQL
export interface BookingSummary {
  id: string;
  room: { id: string; name: string };
  guest: { full_name: string; doc_number: string };
  check_in: string;
  check_out: string;
  total_price: number; // Precio del hospedaje
  status: string;
}

export interface AccountStatement {
  roomArgs: number; // Costo Hospedaje
  serviceCharges: number; // Consumos (Hamburguesas, etc)
  totalPaid: number; // Lo que ya pagaron
  balance: number; // Lo que deben
  details: {
    services: any[];
    payments: any[];
  };
}

export const useCheckout = (activeBookings: BookingSummary[]) => {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<BookingSummary | null>(
    null,
  );
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Formulario de Pago
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'cash', // cash, transfer, card
    notes: '',
  });

  // A. Cargar Estado de Cuenta (La Lógica Forense)
  const loadAccountForBooking = async (booking: BookingSummary) => {
    setIsLoading(true);
    setSelectedBooking(booking);

    try {
      // 1. Buscar consumos pendientes de la habitación (Service Orders)
      const { data: services } = await supabase
        .from('service_orders')
        .select('*')
        .eq('room_id', booking.room.id)
        .eq('status', 'pending'); // Solo lo que no se ha pagado

      // 2. Buscar abonos previos a esta reserva (Payments)
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', booking.id);

      // 3. Matemáticas Financieras
      const serviceTotal =
        services?.reduce((acc, curr) => acc + curr.total_price, 0) || 0;
      const paymentTotal =
        payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
      const roomTotal = booking.total_price;

      const totalDebt = roomTotal + serviceTotal;
      const balanceDue = totalDebt - paymentTotal;

      setStatement({
        roomArgs: roomTotal,
        serviceCharges: serviceTotal,
        totalPaid: paymentTotal,
        balance: balanceDue,
        details: {
          services: services || [],
          payments: payments || [],
        },
      });

      // Pre-llenar el monto a pagar con el saldo pendiente
      setPaymentForm((prev) => ({
        ...prev,
        amount: balanceDue > 0 ? balanceDue : 0,
      }));
    } catch (e) {
      console.error(e);
      alert('Error cargando cuenta');
    } finally {
      setIsLoading(false);
    }
  };

 // B. Registrar Pago (Actualizado con Seguridad Forense)
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

      // Recargar cuenta para ver el nuevo saldo
      await loadAccountForBooking(selectedBooking);
      alert('✅ Pago registrado con auditoría');
      setPaymentForm((prev) => ({ ...prev, amount: 0, notes: '' }));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // C. Cerrar Cuenta (Check-Out Definitivo)
  const finalizeCheckout = async () => {
    if (!selectedBooking || !statement) return;

    // Validación de deuda
    if (statement.balance > 0) {
      if (
        !confirm(
          `⚠️ Hay un saldo pendiente de $${statement.balance.toLocaleString()}. ¿Cerrar cuenta de todas formas?`,
        )
      )
        return;
    } else {
      if (!confirm('¿Confirmar salida del huésped y liberar habitación?'))
        return;
    }

    try {
      // 1. Marcar Reserva como Finalizada
      await supabase
        .from('bookings')
        .update({ status: 'checked_out' })
        .eq('id', selectedBooking.id);

      // 2. Marcar Habitación como Sucia (Protocolo de Limpieza)
      await supabase
        .from('rooms')
        .update({ status: 'dirty' })
        .eq('id', selectedBooking.room.id);

      // 3. Cerrar las órdenes de servicio pendientes (Para que no le salgan al siguiente huésped)
      const serviceIds = statement.details.services.map((s) => s.id);
      if (serviceIds.length > 0) {
        await supabase
          .from('service_orders')
          .update({ status: 'completed' })
          .in('id', serviceIds);
      }

      alert('👋 Check-out exitoso. Habitación marcada como SUCIA.');
      router.refresh();
      setSelectedBooking(null);
      setStatement(null);
    } catch (e: any) {
      alert('Error crítico en checkout: ' + e.message);
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
