import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Manejo de CORS (Permite que tu web hable con esta función)
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, message, mediaUrl } = await req.json();

    // 🛑 VALIDACIÓN DE SEGURIDAD
    if (!phone) throw new Error('❌ Faltó el número de teléfono del cliente.');
    if (!message) throw new Error('❌ No hay mensaje para enviar.');

    console.log(`📨 [SIMULACIÓN WHATSAPP] Destino: ${phone}`);
    console.log(`💬 Mensaje: "${message}"`);
    if (mediaUrl) console.log(`📷 Adjunto: ${mediaUrl}`);

    // ------------------------------------------------------------------
    // 🔌 AQUÍ CONECTAREMOS EL PROVEEDOR REAL (ULTRAMSG / META) DESPUÉS
    // Por ahora, devolvemos "Éxito" para que el sistema siga fluyendo.
    // ------------------------------------------------------------------

    return new Response(
      JSON.stringify({
        success: true,
        status: 'simulated',
        note: 'Mensaje registrado en consola (Modo Desarrollo)',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('🔥 Error en envío:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
