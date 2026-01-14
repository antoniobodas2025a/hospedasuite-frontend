import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Función para limpiar URLs
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { city, category } = await req.json();

    const GOOGLE_MAPS_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // ✅ BLINDAJE DE DOMINIO: Forzamos producción siempre
    const BASE_URL = 'https://hospedasuite.com';

    if (!GOOGLE_MAPS_KEY || !GEMINI_API_KEY)
      throw new Error('Faltan API Keys.');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
    const citySlug = slugify(city);

    // Link limpio: hospedasuite.com/villa-de-leyva
    const offerLink = `${BASE_URL}/${citySlug}`;

    console.log(`🦅 SNIPER ACTIVADO: Cazando en ${city} -> Link: ${offerLink}`);

    // 1. BUSCAR EN GOOGLE PLACES
    const placesResp = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.rating,places.websiteUri,places.nationalPhoneNumber,places.reviews',
        },
        body: JSON.stringify({
          textQuery: `${category} en ${city}`,
          minRating: 2.0,
        }),
      }
    );

    if (!placesResp.ok)
      throw new Error(`Error Google Maps: ${await placesResp.text()}`);

    const placesData = await placesResp.json();
    const targets = placesData.places || [];
    const huntedResults = [];

    // 2. PROCESAMIENTO TÁCTICO
    for (const place of targets) {
      // Verificar duplicados
      const { data: existing } = await supabase
        .from('hunted_leads')
        .select('id')
        .eq('google_place_id', place.id)
        .maybeSingle();

      if (existing) continue;

      const hasWeb = !!place.websiteUri;
      let pitch = '';

      // Extracción de Dolor (Malas reseñas)
      let reviewsContext = '';
      if (place.reviews && place.reviews.length > 0) {
        const badReviews = place.reviews
          .filter((r: any) => r.rating <= 3)
          .slice(0, 1);
        reviewsContext =
          badReviews.length > 0
            ? `Queja encontrada en sus redes: "${badReviews[0].text?.text}"`
            : 'Check-in lento o procesos manuales';
      }

      // 3. INTELIGENCIA ARTIFICIAL (Prompt de Alta Conversión)
      try {
        const prompt = `
          Actúa como un Consultor de Crecimiento Hotelero experto en Neuromarketing.
          Escribe un mensaje de WhatsApp para el dueño del negocio "${
            place.displayName.text
          }".
          
          OBJETIVO: Que sientan "miedo a perderse la oportunidad" (FOMO) y den clic en: ${offerLink}
          
          DATOS DEL OBJETIVO:
          - Ciudad: ${city}
          - Dolor Detectado: ${reviewsContext}
          - ¿Tiene Web?: ${hasWeb ? 'Sí' : 'No (Usar esto como dolor)'}
          
          ESTRUCTURA DE ALTA CONVERSIÓN (Sigue esto estrictamente):
          1.  **El Gancho (Pain):** No saludes con "Hola". Empieza mencionando el problema o el potencial desperdiciado. Ej: "Vi que ${
            place.displayName.text
          } aún hace check-in manual..." o "Si no estás llenando entre semana...".
          2.  **La Solución (Escasez):** "Lanzamos el programa 'Socios Fundadores' en ${city}. Solo hay 12 cupos para automatizar todo con IA."
          3.  **El Cierre (CTA):** "Reclama el mes gratis antes de que se llenen los cupos aquí 👇"
          
          REGLAS DE FORMATO:
          - Máximo 35 palabras (Sé directo).
          - Usa emojis de alerta (🚨, 🚀, 📉).
          - NO inventes el link, yo lo agregaré al final. Solo dame el texto.
        `;

        const aiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        if (aiResp.ok) {
          const aiJson = await aiResp.json();
          const rawText =
            aiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
          // Pitch Limpio + Link Directo
          pitch = `${rawText.trim()}\n\n👉 ${offerLink}`;
        }
      } catch (err) {
        console.error('Fallo IA', err);
      }

      // Fallback de Emergencia (Si Gemini falla)
      if (!pitch) {
        pitch = `🚨 Atención ${place.displayName.text}: Abrimos 12 Cupos de Socios Fundadores en ${city}. \n\nAutomatiza tu hotel con IA y obtén 1 Mes Gratis aquí (antes de que se agoten): \n👉 ${offerLink}`;
      }

      // Guardar en Supabase
      const { data: inserted } = await supabase
        .from('hunted_leads')
        .insert({
          business_name: place.displayName.text,
          google_place_id: place.id,
          address: place.formattedAddress,
          phone: place.nationalPhoneNumber,
          rating: place.rating,
          website: place.websiteUri,
          ai_pitch: pitch,
          city_search: city,
        })
        .select()
        .single();

      if (inserted) huntedResults.push(inserted);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: targets.length,
        new_leads: huntedResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
