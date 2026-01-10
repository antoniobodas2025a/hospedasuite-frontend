import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const GOOGLE_CLOUD_API_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY');

    const { command } = await req.json();

    // 1. CEREBRO: GEMINI 2.5 FLASH (PRODUCCIÓN) 🚀
    const prompt = `
      Actúa como la recepcionista más amable y eficiente de un hotel en Colombia.
      
      Tu misión: Interpretar la orden del cliente y responder con naturalidad.
      Orden del usuario: "${command}"
      Fecha de hoy: ${new Date().toISOString().split('T')[0]}
      
      Instrucciones de Personalidad (Acento Colombiano Sutil):
      - Tono: Muy cálido, usa "Con mucho gusto", "Claro que sí".
      - PROHIBIDO sonar robot.
      
      Reglas de Datos (ESTRICTAS):
      1. roomId: Si menciona números, EXTRAE SOLO LOS DÍGITOS. Ejemplo: "habitación 101" -> "101".
      2. guestName: Si no lo dice, pon "Huésped por Voz".
      3. Fechas: Si faltan, asume HOY entrada y MAÑANA salida.
      4. guestPhone: EXTRAE el número de celular/teléfono. Elimina espacios. Si no hay, devuelve null.
      5. guestDoc: EXTRAE cédula o DNI. Elimina puntos. Si no hay, devuelve null.

      Responde SOLO este JSON válido (sin markdown):
      {
        "action": "CREATE_BOOKING", 
        "data": { 
          "guestName": "...", 
          "guestPhone": "...",
          "guestDoc": "...",
          "roomId": "...", 
          "checkIn": "...", 
          "checkOut": "...", 
          "price": 0 
        },
        "confirmation_message": "Texto breve para leer en voz alta."
      }
    `;

    // 🔴 MOTOR: GEMINI 2.5 FLASH
    // Nota: Para que esto funcione sin errores de cuota, debes tener BILLING habilitado en Google Cloud.
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const geminiData = await geminiResponse.json();

    if (geminiData.error) {
      // Si falla por cuota, el mensaje lo dirá claramente
      throw new Error('Error Gemini 2.5: ' + geminiData.error.message);
    }

    // [BLOQUE DE EXTRACCIÓN ROBUSTA - JSON HUNTER]
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini no respondió texto.');

    console.log('🤖 Texto crudo de Gemini:', rawText);

    // 1. LIMPIEZA QUIRÚRGICA
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No encontré un JSON válido en la respuesta de la IA.');
    }

    const jsonStr = jsonMatch[0];
    let parsedResult;

    try {
      parsedResult = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error('El JSON de la IA está malformado: ' + jsonStr);
    }

   
   
   
   
   
   
    // 2. VOZ HD (GOOGLE TTS)
    if (parsedResult.confirmation_message && GOOGLE_CLOUD_API_KEY) {
      try {
        const ttsResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text: parsedResult.confirmation_message },
              voice: { languageCode: 'es-US', name: 'es-US-Neural2-A' },
              audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.1,
                pitch: 0,
              },
            }),
          }
        );
        const ttsData = await ttsResponse.json();
        if (ttsData.audioContent)
          parsedResult.audioBase64 = ttsData.audioContent;
      } catch (ttsErr) {
        console.warn('Fallo TTS (No crítico):', ttsErr);
      }
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('🔥 Error Crítico:', error);

    return new Response(
      JSON.stringify({
        action: 'ERROR',
        confirmation_message: `Error interno: ${
          error.message || error.toString()
        }`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
