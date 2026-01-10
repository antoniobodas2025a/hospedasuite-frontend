import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Función para convertir "Villa de Leyva" -> "villa-de-leyva"
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/[^\w\-]+/g, '') // Quitar caracteres raros
    .replace(/\-\-+/g, '-'); // Quitar guiones dobles
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

    // 👇 AJUSTA ESTO SEGÚN DONDE ESTÉS PROBANDO
    // const BASE_URL = "https://hospedasuite.com"; // Producción
    const BASE_URL = 'https://hospedasuite.com'; // Pruebas Locales

    if (!GOOGLE_MAPS_KEY || !GEMINI_API_KEY)
      throw new Error('Faltan API Keys.');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
    const citySlug = slugify(city);

    // 🔥 CAMBIO AQUÍ: Link directo sin "/oferta"
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

      // Extracción de Reseñas (Dolor)
      let reviewsContext = '';
      if (place.reviews && place.reviews.length > 0) {
        const badReviews = place.reviews
          .filter((r: any) => r.rating <= 3)
          .slice(0, 1);
        reviewsContext =
          badReviews.length > 0
            ? `Queja reciente: "${badReviews[0].text?.text}"`
            : '';
      }

      // 3. INTELIGENCIA ARTIFICIAL (Venta del Cupo Fundador)
      try {
        const prompt = `
          Eres un estratega comercial. Escribe un mensaje de WhatsApp para el dueño del hotel "${
            place.displayName.text
          }".
          
          OBJETIVO: Que den clic en este enlace para reclamar un MES GRATIS: ${offerLink}
          
          DATOS:
          - Ciudad: ${city}
          - Web: ${hasWeb ? 'Sí' : 'No'}
          - Contexto: ${reviewsContext}
          
          ESTRUCTURA OBLIGATORIA:
          1. Saludo casual.
          2. Gancho: "Abrimos 12 cupos de Socios Fundadores en ${city} y quiero apartarte uno."
          3. Cierre: "Mira los beneficios y reclama el mes gratis aquí 👇"
          
          REGLAS:
          - Máximo 30 palabras (sin contar el link).
          - NO pongas el link en el texto generado, yo lo pondré al final.
          - Tono: Exclusivo y urgente.
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

      // Fallback por si la IA falla
      if (!pitch) {
        pitch = `Hola ${place.displayName.text}, seleccionamos 12 hoteles en ${city} para darles software GRATIS el primer mes. \n\nReclama tu cupo aquí: ${offerLink}`;
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
