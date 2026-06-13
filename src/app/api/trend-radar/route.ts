import { NextRequest, NextResponse } from 'next/server';
import { enrollInKlaviyoFlow } from '@/lib/klaviyo-mcp';

// ============================================================================
// TREND-RADAR ENDPOINT — Social Listening Filter & Klaviyo Dispatcher
// ============================================================================
// Filters incoming social listening payloads by:
//   1. Location (strictly Hub Boyacá-Centro)
//   2. Sentiment (negative towards regulations/competitors)
// If valid → triggers Klaviyo "Escudo Legal" flow with crisis_trigger tag.

const BOYACA_CENTRO_CITIES = ['paipa', 'tibasosa', 'sogamoso', 'tota', 'duitama', 'firavitoba', 'nobsa', 'tunja', 'villa de leyva'];

const CRISIS_KEYWORDS = [
  'sobreventa', 'overbooking', 'falló la plataforma', 'falla booking', 'falla airbnb',
  'retención de pagos', 'no puedo cobrar', 'se cayó el sistema', 'plataforma caída',
  'multa sire', 'multa tra', 'migración colombia', 'sanción', 'estafa', 'fraude',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, location, email, source } = body;

    if (!text || !location) {
      return NextResponse.json({ error: 'Missing text or location' }, { status: 400 });
    }

    const lowerText = text.toLowerCase();
    const lowerLocation = location.toLowerCase();

    // 1. Filtro Geográfico (Ley de Hick: solo Boyacá-Centro)
    const isLocal = BOYACA_CENTRO_CITIES.some((city) => lowerLocation.includes(city));
    if (!isLocal) {
      return NextResponse.json({ status: 'ignored', reason: 'Outside Boyacá-Centro Hub' }, { status: 200 });
    }

    // 2. Filtro de Sentimiento (Crisis/Regulaciones)
    const hasCrisis = CRISIS_KEYWORDS.some((keyword) => lowerText.includes(keyword));
    if (!hasCrisis) {
      return NextResponse.json({ status: 'ignored', reason: 'No crisis sentiment detected' }, { status: 200 });
    }

    // 3. Sincronización Klaviyo MCP (Escudo Legal)
    if (email) {
      await enrollInKlaviyoFlow(email, 'escudo_legal_ventas_extra', {
        crisis_trigger: true,
        crisis_source: source || 'social_listening',
        location: location,
        crisis_snippet: text.slice(0, 200),
      });
    }

    return NextResponse.json({ success: true, action: 'dispatched', message: 'Escudo Legal flow triggered' });
  } catch {
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
  }
}
