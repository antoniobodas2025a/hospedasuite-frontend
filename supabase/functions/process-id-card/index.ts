// supabase/functions/process-id-card/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de CORS (Permisos para que tu app llame a la función)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. OBTENER LA LLAVE SECRETA (Solo el servidor la conoce)
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY)
      throw new Error('Falta configurar GEMINI_API_KEY en Supabase Secrets');

    const { image } = await req.json();
    if (!image) throw new Error('No se recibió imagen');

    // Limpieza del base64
    const base64Image = image.includes(',') ? image.split(',')[1] : image;

    // 2. LLAMAR A GOOGLE DESDE EL SERVIDOR SEGURO
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Analiza esta imagen de una Cédula Colombiana. Extrae: 1. Documento (solo números, sin puntos). 2. Nombre completo. 3. Tipo de sangre. Responde SOLO este JSON: { "docNumber": "123", "fullName": "ABC", "bloodType": "O+" }. Si no lees nada responde: { "error": "ilegible" }',
                },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    // Manejo de errores de Google
    if (data.error) throw new Error(data.error.message);

    // Extracción y limpieza
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Google no devolvió texto');

    const jsonStr = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return new Response(jsonStr, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
