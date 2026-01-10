import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de CORS (Permite que tu Frontend hable con este Backend)
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const GOOGLE_CLOUD_API_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY');

    // Recibimos:
    // - command: Texto (si es voz)
    // - image: Base64 (si es escáner)
    // - type: 'OCR' o undefined
    const { command, image, type } = await req.json();

    let geminiPayload;

    // =========================================================
    // 📸 MODO 1: SCANNER OCR (Lectura de Cédula por Imagen)
    // =========================================================
    if (type === 'OCR' && image) {
      console.log('📸 Procesando Imagen OCR...');

      const ocrPrompt = `
        Analiza esta imagen de un documento de identidad (Cédula de Colombia).
        Tu trabajo es extraer datos para un formulario de hotel.
        
        Extrae con precisión quirúrgica:
        1. Número de documento (sin puntos, ni espacios, solo dígitos).
        2. Nombre completo (Nombres y Apellidos tal cual aparecen).
        
        Responde SOLO este JSON válido (sin markdown):
        {
          "data": {
            "doc": "12345678", 
            "name": "JUAN PEREZ"
          }
        }
        Si la imagen no es legible o no es un documento, devuelve null en los campos.
      `;

      geminiPayload = {
        contents: [
          {
            parts: [
              { text: ocrPrompt },
              { inline_data: { mime_type: 'image/jpeg', data: image } }, // Enviamos la foto a Gemini Vision
            ],
          },
        ],
      };

      // =========================================================
      // 🎙️ MODO 2: AGENTE DE VOZ (Reserva y Comandos)
      // =========================================================
    } else {
      console.log('🎙️ Procesando Comando de Voz...');

      const voicePrompt = `
        Actúa como el asistente inteligente gerencial del hotel LEYVA.
        Tu misión: Clasificar la intención del usuario (Ventas o Reservas) y extraer datos.
        Orden del usuario: "${command}"
        Fecha de hoy: ${new Date().toISOString().split('T')[0]}

        DETECTA LA INTENCIÓN (Elige una):
        
        1. ❌ CERRAR: Si dice "cerrar", "salir", "cancelar".
           => action: "CLOSE_MODAL"

        2. 📈 MARKETING / LEADS: Si menciona "Lead", "Interesado", "Prospecto", "Empresa", "Marketing".
           => action: "CREATE_LEAD"
           => data: { name: "Nombre del cliente/empresa", phone: "Teléfono", details: "Detalle del interés" }

        3. 📅 RESERVAS (Por defecto): Si habla de dormir, habitaciones, fechas, llegada, huéspedes.
           => action: "CREATE_BOOKING"
           => data: { guestName, guestPhone, guestDoc, roomId, checkIn, checkOut, adults, children, price }

        Reglas de Extracción:
        - price: "150 mil" -> 150000.
        - adults: "una pareja" -> 2. "somos tres" -> 3.
        - Si falta un dato, usa null.

        Responde SOLO este JSON válido (sin markdown):
        {
          "action": "CREATE_BOOKING" | "CREATE_LEAD" | "CLOSE_MODAL",
          "data": {
            // Unifica campos para evitar errores
            "guestName": "...", "guestPhone": "...", "guestDoc": "...",
            "roomId": "...", "checkIn": "...", "checkOut": "...",
            "adults": 1, "children": 0, "price": 0,
            
            // Campos específicos de Lead (mapealos también arriba si puedes)
            "name": "...", "phone": "...", "details": "..."
          },
          "confirmation_message": "Texto breve confirmando la acción (ej: 'Lead registrado' o 'Abriendo reserva')."
        }
      `;

      geminiPayload = {
        contents: [{ parts: [{ text: voicePrompt }] }],
      };
    }

    // 🚀 ENVÍO A GEMINI (CEREBRO UNIFICADO)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      }
    );

    const geminiData = await geminiResponse.json();

    if (geminiData.error) {
      throw new Error('Gemini Error: ' + geminiData.error.message);
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('La IA no respondió texto válido.');

    // Limpieza de JSON (A veces la IA pone ```json ... ```)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
      throw new Error('No encontré JSON en la respuesta de la IA.');

    const parsedResult = JSON.parse(jsonMatch[0]);

    // 🔊 GENERACIÓN DE AUDIO (SOLO PARA MODO VOZ)
    // Si es OCR (imagen), no necesitamos que hable, solo que llene el formulario.
    if (!image && parsedResult.confirmation_message && GOOGLE_CLOUD_API_KEY) {
      try {
        const ttsResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text: parsedResult.confirmation_message },
              voice: { languageCode: 'es-US', name: 'es-US-Neural2-A' },
              audioConfig: { audioEncoding: 'MP3', speakingRate: 1.1 },
            }),
          }
        );
        const ttsData = await ttsResponse.json();
        if (ttsData.audioContent) {
          parsedResult.audioBase64 = ttsData.audioContent;
        }
      } catch (e) {
        console.warn('Fallo TTS (No crítico):', e);
      }
    }

    // RESPUESTA FINAL AL FRONTEND
    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('🔥 Error Crítico:', error);
    return new Response(
      JSON.stringify({
        action: 'ERROR',
        error: error.message,
        confirmation_message: 'Ocurrió un error interno.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
