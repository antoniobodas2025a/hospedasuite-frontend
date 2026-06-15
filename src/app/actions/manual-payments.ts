'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { uploadToR2, R2_BUCKET } from '@/lib/r2-upload';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-xxxxx.r2.dev';

// ============================================================================
// 1. SUBIR COMPROBANTE DE PAGO MANUAL (R2 — zero egress cost)
// ============================================================================
export async function uploadManualPaymentReceipt(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No se recibió ningún archivo.' };

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Solo se permiten imágenes (JPEG, PNG, WebP) o PDF.' };
    }

    // Validar tamaño (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'El archivo no puede superar los 5 MB.' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `receipts/${user.id}/${Date.now()}-${sanitizedName}`;

    const publicUrl = await uploadToR2(key, buffer, file.type);
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Manual payment upload error:', error.message);
    return { success: false, error: error.message || 'Error al subir el comprobante' };
  }
}

// ============================================================================
// 2. CREAR REGISTRO DE PAGO MANUAL
// ============================================================================
export async function createManualPayment(payload: {
  hotel_id: string;
  amount: number;
  method: 'nequi' | 'daviplata';
  receipt_url: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Validaciones
    if (!payload.hotel_id) return { success: false, error: 'hotel_id es requerido' };
    if (!payload.amount || payload.amount <= 0) return { success: false, error: 'El monto debe ser mayor a 0' };
    if (!['nequi', 'daviplata'].includes(payload.method)) {
      return { success: false, error: 'Método inválido. Usá nequi o daviplata.' };
    }
    if (!payload.receipt_url) return { success: false, error: 'El comprobante es requerido' };

    // Insertar manual_payment
    const { error: insertError } = await supabaseAdmin
      .from('manual_payments')
      .insert({
        hotel_id: payload.hotel_id,
        user_id: user.id,
        amount: payload.amount,
        method: payload.method,
        receipt_url: payload.receipt_url,
        status: 'pending',
      });

    if (insertError) {
      console.error('Create manual payment error:', insertError);
      return { success: false, error: 'Error al registrar el pago: ' + insertError.message };
    }

      // Actualizar hotel a pending_approval (good faith: hotel visible en Channel)
      const { error: hotelError } = await supabaseAdmin
        .from('hotels')
        .update({ subscription_status: 'pending_approval', status: 'active' })
        .eq('id', payload.hotel_id);

    if (hotelError) {
      console.error('Update hotel status error:', hotelError);
      // No fallar — el pago ya está registrado, solo el estado del hotel no se actualizó
    }

    revalidatePath('/software/onboarding');
    return { success: true };
  } catch (error: any) {
    console.error('Create manual payment error:', error.message);
    return { success: false, error: error.message || 'Error al registrar el pago' };
  }
}

// ============================================================================
// 3. APROBAR PAGO MANUAL (SUPER-ADMIN)
// ============================================================================
export async function approveManualPayment(
  manualPaymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Verificar rol de super-admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'super_admin') {
      return { success: false, error: 'No autorizado. Solo super-admins pueden aprobar pagos.' };
    }

    // Obtener el manual_payment
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('manual_payments')
      .select('id, hotel_id, status')
      .eq('id', manualPaymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Pago no encontrado.' };
    }

    if (payment.status !== 'pending') {
      return { success: false, error: `El pago ya fue ${payment.status === 'approved' ? 'aprobado' : 'rechazado'}.` };
    }

    // Aprobar: actualizar manual_payment + hotel
    const now = new Date().toISOString();

    const { error: updatePaymentError } = await supabaseAdmin
      .from('manual_payments')
      .update({
        status: 'approved',
        approved_at: now,
        approved_by: user.id,
      })
      .eq('id', manualPaymentId);

    if (updatePaymentError) throw updatePaymentError;

    // Activar hotel completamente
    const { error: updateHotelError } = await supabaseAdmin
      .from('hotels')
      .update({
        subscription_status: 'active',
        status: 'active',
        is_onboarding_complete: true,
      })
      .eq('id', payment.hotel_id);

    if (updateHotelError) throw updateHotelError;

    // Send approval email to hotelier
    try {
      const { data: hotel } = await supabaseAdmin
        .from('hotels')
        .select('name, email, slug')
        .eq('id', payment.hotel_id)
        .single();

      if (hotel?.email) {
        const { Resend } = await import('resend');
        const { ManualPaymentApproved } = await import('@/emails/ManualPaymentApproved');
        const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_for_build');
        const { render } = await import('@react-email/render');
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hospedasuite.com';
        const emailHtml = await render(ManualPaymentApproved({
          hotelName: hotel.name,
          guestName: 'Huésped',
          bookingId: payment.booking_id,
          checkIn: new Date().toISOString().split('T')[0],
          checkOut: new Date().toISOString().split('T')[0],
          totalAmount: 89900,
          voucherUrl: `${baseUrl}/dashboard`,
        }));

        await resend.emails.send({
          from: 'HospedaSuite <pagos@hospedasuite.com>',
          to: hotel.email,
          subject: `¡Tu pago para ${hotel.name} fue verificado!`,
          html: emailHtml,
        });
      }
    } catch (emailErr) {
      console.warn('📧 Error enviando email de aprobación de pago:', emailErr);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 4. RECHAZAR PAGO MANUAL (SUPER-ADMIN)
// ============================================================================
export async function rejectManualPayment(
  manualPaymentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Verificar rol de super-admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'super_admin') {
      return { success: false, error: 'No autorizado. Solo super-admins pueden rechazar pagos.' };
    }

    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Debés proporcionar un motivo de rechazo.' };
    }

    // Obtener el manual_payment
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('manual_payments')
      .select('id, status')
      .eq('id', manualPaymentId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Pago no encontrado.' };
    }

    if (payment.status !== 'pending') {
      return { success: false, error: `El pago ya fue ${payment.status === 'approved' ? 'aprobado' : 'rechazado'}.` };
    }

    // Rechazar
    const { error: updateError } = await supabaseAdmin
      .from('manual_payments')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim(),
      })
      .eq('id', manualPaymentId);

    if (updateError) {
      return { success: false, error: 'Error al rechazar: ' + updateError.message };
    }

    revalidatePath('/admin/payments/pending');
    return { success: true };
  } catch (error: any) {
    console.error('Reject manual payment error:', error.message);
    return { success: false, error: error.message || 'Error al rechazar el pago' };
  }
}

// ============================================================================
// 5. LISTAR PAGOS PENDIENTES (SUPER-ADMIN)
// ============================================================================
export async function getPendingManualPayments(filter?: 'pending' | 'approved' | 'rejected') {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Verificar rol de super-admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'super_admin') {
      return { success: false, error: 'No autorizado.' };
    }

    let query = supabaseAdmin
      .from('manual_payments')
      .select(`
        id,
        hotel_id,
        user_id,
        amount,
        method,
        status,
        receipt_url,
        rejection_reason,
        created_at,
        approved_at,
        approved_by,
        hotels!inner(name, city, email)
      `)
      .order('created_at', { ascending: false });

    if (filter && filter !== 'pending') {
      query = query.eq('status', filter);
    } else {
      // Default: solo pendientes
      query = query.eq('status', 'pending');
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: 'Error al consultar pagos: ' + error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Get pending payments error:', error.message);
    return { success: false, error: error.message || 'Error al consultar pagos' };
  }
}
