// supabase/functions/chat-sales-agent/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT_TEXT = `
INSTRUCCIONES DE SISTEMA:
ERES: "HospedaBot", experto comercial de HospedaSuite Elite.
OBJETIVO: Vender software hotelero y resolver dudas de SIRE y Check-in.
PRECIOS: Nano ($49k), Pro ($99k), Growth ($159k), Corp ($249k). Setup $0.
ACTITUD: Profesional, empático y directo.
REGLA DE ORO: Si detectas intención de compra o interés en precios, FINALIZA tu respuesta con: "[INTENT:PURCHASE]".
`;

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { message, history } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) throw new Error('Falta la GEMINI_API_KEY en Supabase Secrets');

    let contents = [];

    // 1. Inyección de Contexto
    contents.push({ role: 'user', parts: [{ text: SYSTEM_PROMPT_TEXT }] });
    contents.push({
      role: 'model',
      parts: [{ text: 'Entendido. Soy HospedaBot.' }],
    });

    // 2. Historial (Con filtro de seguridad para evitar duplicados)
    if (history && Array.isArray(history)) {
      history.forEach((msg: any, index: number) => {
        if (index === 0 && msg.role === 'assistant') return; // Ignorar saludo duplicado

        const role = msg.role === 'assistant' ? 'model' : 'user';
        const text = msg.content || '.';

        // Evitar colisión de roles (User -> User)
        const lastRole = contents[contents.length - 1].role;
        if (lastRole === role) return; // Si se repite el rol, saltamos este mensaje para proteger la API

        contents.push({ role: role, parts: [{ text: text }] });
      });
    }

    // Asegurar alternancia antes de insertar el nuevo mensaje
    if (contents[contents.length - 1].role === 'user') {
      contents.push({ role: 'model', parts: [{ text: '...' }] });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // 3. USO DEL MODELO CORRECTO (gemini-1.5-flash)
    // El error mencionaba "2.5", eso fue un error. Usamos el estable 1.5.
    const model = 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      }),
    });

    const data = await response.json();

    // 4. MANEJO DE ERRORES DE CUOTA (RATE LIMIT)
    if (!response.ok) {
      console.error('Gemini API Error:', data);

      // Si es error de cuota (429), respondemos amablemente
      if (response.status === 429 || data.error?.message?.includes('quota')) {
        return new Response(
          JSON.stringify({
            reply:
              '🧠 Estoy procesando muchas solicitudes. Por favor, espera 10 segundos y pregúntame de nuevo.',
            intent: 'info',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(data.error?.message || 'Error desconocido en Gemini');
    }

    const rawReply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Lo siento, no pude procesar tu solicitud.';

    let finalReply = rawReply;
    let intent = 'info';

    if (rawReply.includes('[INTENT:PURCHASE]')) {
      intent = 'purchase';
      finalReply = rawReply.replace('[INTENT:PURCHASE]', '').trim();
    }

    return new Response(JSON.stringify({ reply: finalReply, intent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Server Error:', error.message);
    // En caso de error fatal, devolvemos mensaje en el chat, no error 500
    return new Response(
      JSON.stringify({
        reply: '⚠️ Error técnico: ' + error.message,
        intent: 'unknown',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
