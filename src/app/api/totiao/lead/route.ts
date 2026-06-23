import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Totiao Lead Capture
 *
 * Recibe los datos del formulario de la Landing Page y los reenvía
 * al Webhook de Make.com para disparar la automatización de WhatsApp.
 *
 * Configuración:
 * 1. Crea un escenario en Make.com con un módulo "Webhook" (Custom Webhook).
 * 2. Copia la URL del webhook generada por Make.
 * 3. Agrega la variable de entorno MAKE_TOTIAO_WEBHOOK_URL en tu despliegue (Vercel/Coolify).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    if (!phone) {
      return NextResponse.json({ error: 'El número de WhatsApp es requerido' }, { status: 400 });
    }

    const webhookUrl = process.env.MAKE_TOTIAO_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('MAKE_TOTIAO_WEBHOOK_URL no está configurada');
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    // Reenviar datos a Make.com
    const makeResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || 'Anónimo',
        phone: phone,
        source: 'totiao_vip_landing',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!makeResponse.ok) {
      throw new Error(`Make.com webhook failed: ${makeResponse.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error procesando lead de Totiao:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
