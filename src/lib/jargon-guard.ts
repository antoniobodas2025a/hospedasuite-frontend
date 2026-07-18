/**
 * Jargon Guard — validates that user-facing strings do not contain
 * prohibited extractive-marketplace terminology.
 *
 * Forbidden terms: "OTA", "Marketplace", "vitrina digital"
 * (case-insensitive match)
 *
 * Returns null if clean, or an error message describing the violation.
 */

const FORBIDDEN_TERMS = ["OTA", "Marketplace", "vitrina digital"] as const;

export function validateNoJargon(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      return `Término prohibido detectado: "${term}". Use lenguaje B2B empático.`;
    }
  }
  return null;
}
