// ============================================================================
// TREND-JACKING ENGINE — Social Listening Filter & Klaviyo Dispatcher
// ============================================================================
// Filters incoming social listening payloads by:
//   1. Sentiment (negative/complaint detected)
//   2. Location (Boyacá-Centro hub cities)
//   3. Topic (reservation platform failures, payment holds, overbooking)
// If all conditions met → triggers Klaviyo MCP "Rescate Operativo" campaign.

export const BOYACA_CENTRO_CITIES = [
  'paipa',
  'tibasosa',
  'sogamoso',
  'tota',
  'duitama',
  'firavitoba',
  'nobsa',
  'tunja',
  'villa de leyva',
  'rondon',
  'sachica',
  'ramiriqui',
  'chiquinquira',
  'moniquira',
];

export const CRISIS_KEYWORDS = [
  'sobreventa',
  'overbooking',
  'falló la plataforma',
  'falla booking',
  'falla airbnb',
  'retención de pagos',
  'retuvieron los pagos',
  'no puedo cobrar',
  'se cayó el sistema',
  'plataforma caída',
  'no sincroniza',
  'reserva perdida',
  'no puedo gestionar',
  'comisión excesiva',
  'me bloquearon',
  'cuenta suspendida',
];

export const NEGATIVE_SENTIMENT_KEYWORDS = [
  'terrible',
  'horrible',
  'desastroso',
  'fraude',
  'estafa',
  'nunca más',
  'pésimo',
  'decepcionante',
  'inaceptable',
  'fatal',
  'malísimo',
  'no funciona',
  'no sirve',
];

export interface TrendPayload {
  source: string;
  text: string;
  author?: string;
  location?: string;
  url?: string;
  timestamp?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface TrendWebhookResponse {
  success: boolean;
  action: 'dispatched' | 'ignored' | 'invalid';
  reason?: string;
  klaviyo_triggered?: boolean;
}

export function detectLocation(text: string, location?: string): string | null {
  const searchSpace = `${text} ${location || ''}`.toLowerCase();

  for (const city of BOYACA_CENTRO_CITIES) {
    if (searchSpace.includes(city)) {
      return city;
    }
  }

  return null;
}

export function detectCrisisTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function detectNegativeSentiment(text: string, providedSentiment?: string): boolean {
  if (providedSentiment === 'negative') return true;

  const lower = text.toLowerCase();
  return NEGATIVE_SENTIMENT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function evaluateTrendPayload(payload: TrendPayload): TrendWebhookResponse {
  // Validate required fields
  if (!payload.text || payload.text.trim().length === 0) {
    return { success: false, action: 'invalid', reason: 'Empty text field' };
  }

  if (!payload.source) {
    return { success: false, action: 'invalid', reason: 'Missing source field' };
  }

  // Check for crisis topic
  const hasCrisisTopic = detectCrisisTopic(payload.text);
  if (!hasCrisisTopic) {
    return { success: true, action: 'ignored', reason: 'No crisis topic detected' };
  }

  // Check for negative sentiment
  const hasNegativeSentiment = detectNegativeSentiment(payload.text, payload.sentiment);
  if (!hasNegativeSentiment) {
    return { success: true, action: 'ignored', reason: 'No negative sentiment detected' };
  }

  // Check for Boyacá-Centro location
  const detectedLocation = detectLocation(payload.text, payload.location);
  if (!detectedLocation) {
    return { success: true, action: 'ignored', reason: 'Not in Boyacá-Centro hub' };
  }

  // All conditions met — trigger Klaviyo MCP
  return {
    success: true,
    action: 'dispatched',
    reason: `Crisis detected in ${detectedLocation}`,
    klaviyo_triggered: true,
  };
}
