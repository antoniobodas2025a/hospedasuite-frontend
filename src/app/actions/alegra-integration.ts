/**
 * Alegra Integration Server Actions
 * 
 * Handles:
 * 1. Storing Alegra API credentials
 * 2. Triggering invoice creation on checkout
 */

'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  AlegraConfig,
  testAlegraConnection,
  createOrFindAlegraContact,
  createElectronicInvoice,
  AlegraInvoicePayload,
  AlegraContactPayload,
  ensureHospedajeItemExists,
} from '@/lib/alegra-connector';

const ALEGRA_BASE_URL = 'https://api.alegra.com/api/v1';

/**
 * Save Alegra credentials for a hotel
 */
export async function saveAlegraCredentials(
  hotelId: string,
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config: AlegraConfig = {
      email,
      token,
      baseUrl: ALEGRA_BASE_URL,
    };

    // Test connection first
    const testResult = await testAlegraConnection(config);
    if (!testResult.success) {
      return { success: false, error: `Conexión fallida: ${testResult.error}` };
    }

    // 🧠 CEREBRO OPERATIVO: Crear ítem "Hospedaje" automáticamente si no existe
    // Esto evita que el hotelero tenga que salir de HospedaSuite para configurarlo
    try {
      await ensureHospedajeItemExists(config);
    } catch {
      // No fallar la conexión si no se puede crear el ítem
      console.warn('⚠️ [Alegra] No se pudo crear el ítem "Hospedaje" automáticamente');
    }

    // Save to database
    const { error } = await supabaseAdmin
      .from('hotels')
      .update({
        alegra_email: email,
        alegra_token: token,
      })
      .eq('id', hotelId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Error saving credentials' };
  }
}

/**
 * Get Alegra credentials for a hotel
 */
export async function getAlegraCredentials(hotelId: string): Promise<{ success: boolean; email?: string; token?: string; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('hotels')
      .select('alegra_email, alegra_token')
      .eq('id', hotelId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      email: data?.alegra_email || undefined,
      token: data?.alegra_token || undefined,
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Error fetching credentials' };
  }
}

/**
 * Create invoice in Alegra after checkout
 * This should be called when a booking is checked out
 */
export async function createInvoiceOnCheckout(
  hotelId: string,
  bookingId: string,
  guestName: string,
  guestDoc: string,
  guestEmail: string,
  totalAmount: number,
  checkInDate: string,
  checkOutDate: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    // Get Alegra credentials
    const creds = await getAlegraCredentials(hotelId);
    if (!creds.success || !creds.email || !creds.token) {
      return { success: false, error: 'Alegra no está configurado para este hotel' };
    }

    const config: AlegraConfig = {
      email: creds.email,
      token: creds.token,
      baseUrl: ALEGRA_BASE_URL,
    };

    // Create or find contact
    const contactPayload: AlegraContactPayload = {
      name: guestName,
      identification: guestDoc,
      email: guestEmail,
      type: 'person',
    };

    const contactResult = await createOrFindAlegraContact(config, contactPayload);
    if (!contactResult.success || !contactResult.contactId) {
      return { success: false, error: `Error creando contacto: ${contactResult.error}` };
    }

    // Create invoice
    // First, get the actual "Hospedaje" item ID from Alegra
    const { ensureHospedajeItemExists } = await import('@/lib/alegra-connector');
    const itemResult = await ensureHospedajeItemExists(config);
    if (!itemResult.success || !itemResult.itemId) {
      return { success: false, error: `No se encontró el ítem "Hospedaje" en Alegra: ${itemResult.error}` };
    }

    const invoicePayload: AlegraInvoicePayload = {
      date: checkInDate,
      dueDate: checkOutDate,
      client: { id: contactResult.contactId },
      items: [
        {
          id: itemResult.itemId, // Actual Alegra item ID for "Hospedaje"
          price: totalAmount,
          quantity: 1,
          description: `Hospedaje del ${checkInDate} al ${checkOutDate}`,
        },
      ],
      payments: [
        {
          date: new Date().toISOString().split('T')[0],
          account: { id: '1' }, // Default account
          amount: totalAmount,
          paymentMethod: 'cash',
        },
      ],
      status: 'open',
    };

    const invoiceResult = await createElectronicInvoice(config, invoicePayload);
    if (!invoiceResult.success) {
      return { success: false, error: `Error creando factura: ${invoiceResult.error}` };
    }

    return { success: true, invoiceId: invoiceResult.invoiceId };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Error creating invoice' };
  }
}
