/**
 * Intent Detection — Semantic query classification for OTA search.
 *
 * Extracts travel intents from natural language queries using regex patterns.
 * Enables automatic filter application without explicit UI controls.
 *
 * Intents detected:
 *   - budget: "barato", "económico", "low cost"
 *   - luxury: "lujo", "lujoso", "cinco estrellas"
 *   - family:  "familia", "familiar", "grupal", "niños"
 *   - romantic: "pareja", "romántico", "luna de miel"
 */

export interface SearchIntent {
  /** Primary intent label */
  intent: 'budget' | 'luxury' | 'family' | 'romantic' | null;
  /** Derived filters to apply server-side */
  filters: {
    /** Maximum price in COP (for budget intent) */
    maxPrice?: number;
    /** Minimum price in COP (for luxury intent) */
    minPrice?: number;
    /** Minimum guest capacity (for family/group) */
    minGuests?: number;
    /** Max guest capacity (for romantic/couple) */
    maxGuests?: number;
  };
}

/** Intent patterns ordered by priority (first match wins) */
const INTENT_PATTERNS: Array<{
  regex: RegExp;
  intent: NonNullable<SearchIntent['intent']>;
  filters: SearchIntent['filters'];
}> = [
  {
    regex: /\b(barato|barata|econ[oó]mico|econ[oó]mica|econ[oó]micos|low.?cost|presupuesto\s+bajo|ajustado)\b/i,
    intent: 'budget',
    filters: { maxPrice: 150000 },
  },
  {
    regex: /\b(lujo|lujoso|lujosa|lujosos|cinco\s+estrellas|5\s+estrellas|premium|exclusivo|exclusiva|alta\s+gama)\b/i,
    intent: 'luxury',
    filters: { minPrice: 400000 },
  },
  {
    regex: /\b(familia|familiar|familiares|grupal|grupo|niños|niñas|niñitos|chicos|con\s+hijos|para\s+familia)\b/i,
    intent: 'family',
    filters: { minGuests: 4 },
  },
  {
    regex: /\b(pareja|parejas|rom[aá]ntic[oa]|rom[aá]nticos|luna\s+de\s+miel|aniversario|escapada\s+rom[aá]ntica|para\s+dos|solo\s+adultos)\b/i,
    intent: 'romantic',
    filters: { maxGuests: 2 },
  },
];

/**
 * Detect travel intent from search query string.
 *
 * @param query - Raw user search query (e.g., "hotel barato en Medellín")
 * @returns Intent object with category and derived filters.
 *          Returns `null` intent with empty filters if no pattern matches.
 *
 * @example
 *   detectIntent("hotel barato en Medellín")
 *   // → { intent: 'budget', filters: { maxPrice: 150000 } }
 *
 *   detectIntent("escapada romántica en Cartagena")
 *   // → { intent: 'romantic', filters: { maxGuests: 2 } }
 */
export function detectIntent(query: string): SearchIntent {
  if (!query || query.trim().length === 0) {
    return { intent: null, filters: {} };
  }

  for (const pattern of INTENT_PATTERNS) {
    if (pattern.regex.test(query)) {
      return {
        intent: pattern.intent,
        filters: { ...pattern.filters },
      };
    }
  }

  return { intent: null, filters: {} };
}
