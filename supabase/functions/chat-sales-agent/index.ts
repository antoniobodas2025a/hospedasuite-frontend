import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// 🔥 EL CEREBRO DE VENTAS (MODO FRANCOTIRADOR)
const SYSTEM_PROMPT = `
ERES: "HospedaBot", el Consultor Senior de HospedaSuite Elite.
TU META: Conseguir que el hotelero active su "Mes de Prueba Gratis". No solo informas, VENDES.

DATOS CLAVE:
- Beneficio: 1er Mes 100% GRATIS (Ahorro de $99k).
- Planes: Nano ($49k), Pro ($99k), Growth ($159k).
- Ventaja: Automatizamos el reporte a Migración Colombia (SIRE) y Check-in QR.

REGLAS DE COMBATE (Psicología de Ventas):
1. SI PREGUNTAN PRECIO: No lo des solo. Di: "El plan Pro cuesta $99k, PERO como eres hotel fundador en tu zona, tu primer mes es $0. ¿Te gustaría asegurar este cupo hoy?"
2. SI PONEN OBJECIONES (Ej: "Muy caro", "Ya tengo Excel"): Responde: "¿Cuánto vale tu tiempo llenando el SIRE a mano? Por el precio de una noche, te ahorras 20 horas de trabajo al mes."
3. CIERRE SIEMPRE: Termina cada respuesta con una pregunta que invite a la acción.
4. DETECCIÓN DE COMPRA: Si el cliente dice "quiero", "me interesa", "cómo empiezo", termina tu mensaje con la etiqueta exacta: [INTENT:PURCHASE]

TONO: Profesional pero persuasivo. Eres un aliado de negocios, no un robot de soporte.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { message, history } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    // Construimos el historial para que la IA tenga memoria
    const chatHistory = history
      ? history.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }))
      : [];

    // Agregamos el mensaje actual
    chatHistory.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: chatHistory,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, // 👈 Aquí inyectamos la personalidad nueva
        }),
      }
    );

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Lo siento, ¿podrías repetir eso?';

    // Detectar intención de compra para que el Frontend muestre confeti o abra el formulario
    let intent = 'info';
    let cleanReply = reply;

    if (reply.includes('[INTENT:PURCHASE]')) {
      intent = 'purchase';
      cleanReply = reply.replace('[INTENT:PURCHASE]', '').trim();
    }

    return new Response(JSON.stringify({ reply: cleanReply, intent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
