/**
 * Curation Automation Engine
 * 
 * Detects duplicates, filters noise, auto-approves/rejects based on confidence scores.
 * Runs as a server action that processes all pending items in batch.
 */

import { createClient } from '@/utils/supabase/server';
import type { AmenitySuggestion } from '@/app/actions/community-templates';
import type { CommunityTemplate } from '@/lib/community-templates-schema';

// ============================================================================
// CONFIGURABLE THRESHOLDS
// ============================================================================

export interface CurationConfig {
  // Duplicate detection
  duplicateSimilarityThreshold: number; // 0-1, higher = stricter (default: 0.85)
  
  // Noise filtering
  minContentLength: number; // minimum chars for templates (default: 15)
  minAmenityNameLength: number; // minimum chars for amenity names (default: 2)
  maxAmenityNameLength: number; // maximum chars (default: 50)
  
  // Auto-approval
  autoApproveConfidence: number; // 0-1, confidence needed for auto-approve (default: 0.9)
  autoApproveMinFrequency: number; // times suggested to auto-approve (default: 3)
  
  // Auto-rejection
  autoRejectConfidence: number; // 0-1, below this = auto-reject (default: 0.3)
  
  // Spam patterns (regex)
  spamPatterns: RegExp[];
  
  // Gibberish detection
  maxConsonantRatio: number; // ratio of consonants that suggests gibberish (default: 0.85)
  minVowelRatio: number; // minimum vowel ratio for valid text (default: 0.15)
}

export const DEFAULT_CONFIG: CurationConfig = {
  duplicateSimilarityThreshold: 0.85,
  minContentLength: 15,
  minAmenityNameLength: 2,
  maxAmenityNameLength: 50,
  autoApproveConfidence: 0.9,
  autoApproveMinFrequency: 3,
  autoRejectConfidence: 0.3,
  spamPatterns: [
    /https?:\/\//i,
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /\b(casino|viagra|porn|xxx|betting)\b/i,
    /^(.)\1{4,}$/, // repeated chars: "aaaaa"
    /^[0-9\s]+$/, // only numbers/spaces
    /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/, // only special chars
  ],
  maxConsonantRatio: 0.85,
  minVowelRatio: 0.15,
};

// ============================================================================
// TEXT ANALYSIS UTILITIES
// ============================================================================

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Similarity score 0-1 between two strings
 */
function similarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const dist = levenshtein(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - dist) / longer.length;
}

/**
 * Check if text looks like gibberish
 */
function isGibberish(text: string, config: CurationConfig): boolean {
  const clean = text.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '');
  if (clean.length < 3) return false;
  
  const vowels = clean.match(/[aeiouáéíóúAEIOUÁÉÍÓÚ]/g)?.length || 0;
  const consonants = clean.match(/[bcdfghjklmnñpqrstvwxyzBCDFGHJKLMNÑPQRSTVWXYZ]/g)?.length || 0;
  const total = vowels + consonants;
  
  if (total === 0) return true;
  
  const consonantRatio = consonants / total;
  const vowelRatio = vowels / total;
  
  return consonantRatio > config.maxConsonantRatio || vowelRatio < config.minVowelRatio;
}

/**
 * Check if text matches spam patterns
 */
function isSpam(text: string, config: CurationConfig): boolean {
  return config.spamPatterns.some(pattern => pattern.test(text));
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

interface DuplicateResult {
  isDuplicate: boolean;
  matchedId?: string;
  similarity: number;
  matchedName?: string;
}

/**
 * Check if an amenity name is a duplicate of existing registry or approved suggestions
 */
export function detectAmenityDuplicate(
  newName: string,
  existingRegistry: string[],
  approvedSuggestions: AmenitySuggestion[]
): DuplicateResult {
  let bestMatch: DuplicateResult = { isDuplicate: false, similarity: 0 };

  // Check against existing registry
  for (const existing of existingRegistry) {
    const sim = similarity(newName, existing);
    if (sim > bestMatch.similarity) {
      bestMatch = { isDuplicate: sim >= DEFAULT_CONFIG.duplicateSimilarityThreshold, matchedName: existing, similarity: sim };
    }
  }

  // Check against approved suggestions
  for (const approved of approvedSuggestions) {
    const sim = similarity(newName, approved.name);
    if (sim > bestMatch.similarity) {
      bestMatch = {
        isDuplicate: sim >= DEFAULT_CONFIG.duplicateSimilarityThreshold,
        matchedId: approved.id,
        matchedName: approved.name,
        similarity: sim,
      };
    }
  }

  return bestMatch;
}

/**
 * Check if a template content is a duplicate
 */
export function detectTemplateDuplicate(
  newContent: string,
  approvedTemplates: CommunityTemplate[],
  type: string
): DuplicateResult {
  const sameType = approvedTemplates.filter(t => t.type === type);
  let bestMatch: DuplicateResult = { isDuplicate: false, similarity: 0 };

  for (const existing of sameType) {
    const sim = similarity(newContent, existing.content);
    if (sim > bestMatch.similarity) {
      bestMatch = {
        isDuplicate: sim >= DEFAULT_CONFIG.duplicateSimilarityThreshold,
        matchedId: existing.id,
        similarity: sim,
      };
    }
  }

  return bestMatch;
}

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================

interface ConfidenceScore {
  score: number; // 0-1
  reasons: string[];
  autoAction: 'approve' | 'reject' | 'review' | null;
}

/**
 * Calculate confidence score for an amenity suggestion
 */
export function scoreAmenitySuggestion(
  suggestion: AmenitySuggestion,
  duplicateResult: DuplicateResult,
  frequency: number,
  config: CurationConfig = DEFAULT_CONFIG
): ConfidenceScore {
  let score = 0.5; // start neutral
  const reasons: string[] = [];

  // Length validation
  if (suggestion.name.length < config.minAmenityNameLength) {
    score -= 0.4;
    reasons.push(`Nombre muy corto (${suggestion.name.length} chars)`);
  } else if (suggestion.name.length > config.maxAmenityNameLength) {
    score -= 0.3;
    reasons.push(`Nombre muy largo (${suggestion.name.length} chars)`);
  } else {
    score += 0.1;
  }

  // Gibberish check
  if (isGibberish(suggestion.name, config)) {
    score -= 0.4;
    reasons.push('Parece texto sin sentido');
  }

  // Spam check
  if (isSpam(suggestion.name, config)) {
    score -= 0.5;
    reasons.push('Contiene patrones de spam');
  }

  // Duplicate check
  if (duplicateResult.isDuplicate) {
    score -= 0.3;
    reasons.push(`Duplicado de "${duplicateResult.matchedName}" (${(duplicateResult.similarity * 100).toFixed(0)}% similar)`);
  } else if (duplicateResult.similarity > 0.6) {
    score -= 0.1;
    reasons.push(`Similar a "${duplicateResult.matchedName}" (${(duplicateResult.similarity * 100).toFixed(0)}%)`);
  }

  // Frequency bonus (suggested multiple times = more likely valid)
  if (frequency >= config.autoApproveMinFrequency) {
    score += 0.3;
    reasons.push(`Sugerido ${frequency} veces (alta demanda)`);
  } else if (frequency >= 2) {
    score += 0.15;
    reasons.push(`Sugerido ${frequency} veces`);
  }

  // Has description = more thoughtful
  if (suggestion.description && suggestion.description.length > 10) {
    score += 0.1;
    reasons.push('Incluye descripción detallada');
  }

  // Has icon suggestion = more complete
  if (suggestion.suggestedIcon) {
    score += 0.05;
  }

  // Clamp 0-1
  score = Math.max(0, Math.min(1, score));

  let autoAction: 'approve' | 'reject' | 'review' | null = null;
  if (score >= config.autoApproveConfidence) autoAction = 'approve';
  else if (score <= config.autoRejectConfidence) autoAction = 'reject';

  return { score, reasons, autoAction };
}

/**
 * Calculate confidence score for a template
 */
export function scoreTemplate(
  template: CommunityTemplate,
  duplicateResult: DuplicateResult,
  config: CurationConfig = DEFAULT_CONFIG
): ConfidenceScore {
  let score = 0.5;
  const reasons: string[] = [];

  // Length validation
  if (template.content.length < config.minContentLength) {
    score -= 0.4;
    reasons.push(`Contenido muy corto (${template.content.length} chars)`);
  } else if (template.content.length > 2000) {
    score -= 0.2;
    reasons.push(`Contenido muy largo (${template.content.length} chars)`);
  } else {
    score += 0.1;
  }

  // Gibberish check
  if (isGibberish(template.content, config)) {
    score -= 0.4;
    reasons.push('Parece texto sin sentido');
  }

  // Spam check
  if (isSpam(template.content, config)) {
    score -= 0.5;
    reasons.push('Contiene patrones de spam');
  }

  // Duplicate check
  if (duplicateResult.isDuplicate) {
    score -= 0.3;
    reasons.push(`Duplicado (${(duplicateResult.similarity * 100).toFixed(0)}% similar)`);
  }

  // AI-generated vs user-written
  if (template.source === 'user_written') {
    score += 0.1;
    reasons.push('Escrito manualmente por usuario');
  } else if (template.source === 'ai_enriched') {
    score += 0.05;
    reasons.push('IA generó + usuario editó');
  }

  score = Math.max(0, Math.min(1, score));

  let autoAction: 'approve' | 'reject' | 'review' | null = null;
  if (score >= config.autoApproveConfidence) autoAction = 'approve';
  else if (score <= config.autoRejectConfidence) autoAction = 'reject';

  return { score, reasons, autoAction };
}

// ============================================================================
// FREQUENCY ANALYSIS
// ============================================================================

/**
 * Count how many times a similar amenity has been suggested
 */
export function getAmenityFrequency(
  name: string,
  allSuggestions: AmenitySuggestion[],
  threshold: number = 0.7
): number {
  return allSuggestions.filter(s => similarity(name, s.name) >= threshold).length;
}

// ============================================================================
// BATCH AUTOMATION
// ============================================================================

export interface AutomationResult {
  totalProcessed: number;
  autoApproved: { id: string; name: string; score: number; reasons: string[] }[];
  autoRejected: { id: string; name: string; score: number; reasons: string[] }[];
  needsReview: { id: string; name: string; score: number; reasons: string[] }[];
  duplicatesFound: { id: string; matchedName: string; similarity: number }[];
}

/**
 * Run automation on all pending amenity suggestions
 */
export async function runAmenityAutomation(
  config: CurationConfig = DEFAULT_CONFIG
): Promise<AutomationResult> {
  const supabase = await createClient();
  
  // Get all pending suggestions
  const { data: pending } = await supabase
    .from('amenity_suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  // Get all suggestions (for frequency)
  const { data: allSuggestions } = await supabase
    .from('amenity_suggestions')
    .select('*');

  // Get approved suggestions (for duplicate check)
  const { data: approved } = await supabase
    .from('amenity_suggestions')
    .select('*')
    .eq('status', 'approved');

  // Existing registry names
  const existingRegistry = ['wifi', 'parking', 'pool', 'breakfast', 'ac', 'tv', 'gym', 'restaurant', 'bar', 'spa', 'mountain_view', 'beach_access', 'safe', 'phone', 'credit_card', 'luggage_storage', 'keyless_entry', 'jacuzzi', 'bano_privado', 'minibar', 'chimenea', 'techo_panoramico', 'ducha_lluvia', 'cama_premium', 'balcon'];

  const result: AutomationResult = {
    totalProcessed: 0,
    autoApproved: [],
    autoRejected: [],
    needsReview: [],
    duplicatesFound: [],
  };

  if (!pending || pending.length === 0) return result;

  for (const suggestion of pending) {
    result.totalProcessed++;

    const duplicateResult = detectAmenityDuplicate(
      suggestion.name,
      existingRegistry,
      (approved || []).map(a => ({ ...a, id: a.id, name: a.name, locale: a.locale, status: a.status, createdAt: a.created_at, updatedAt: a.updated_at }))
    );

    if (duplicateResult.isDuplicate) {
      result.duplicatesFound.push({
        id: suggestion.id,
        matchedName: duplicateResult.matchedName || '',
        similarity: duplicateResult.similarity,
      });
    }

    const frequency = getAmenityFrequency(suggestion.name, allSuggestions || []);
    const confidence = scoreAmenitySuggestion(
      { ...suggestion, id: suggestion.id, name: suggestion.name, locale: suggestion.locale, status: suggestion.status, createdAt: suggestion.created_at, updatedAt: suggestion.updated_at },
      duplicateResult,
      frequency,
      config
    );

    const entry = { id: suggestion.id, name: suggestion.name, score: confidence.score, reasons: confidence.reasons };

    if (confidence.autoAction === 'approve') {
      result.autoApproved.push(entry);
      await supabase
        .from('amenity_suggestions')
        .update({ status: 'approved', updated_at: new Date().toISOString(), curated_by: 'automation' })
        .eq('id', suggestion.id);
    } else if (confidence.autoAction === 'reject') {
      result.autoRejected.push(entry);
      await supabase
        .from('amenity_suggestions')
        .update({ status: 'rejected', updated_at: new Date().toISOString(), curated_by: 'automation', rejection_reason: confidence.reasons.join('. ') })
        .eq('id', suggestion.id);
    } else {
      result.needsReview.push(entry);
    }
  }

  return result;
}

/**
 * Run automation on all pending templates
 */
export async function runTemplateAutomation(
  config: CurationConfig = DEFAULT_CONFIG
): Promise<AutomationResult> {
  const supabase = await createClient();
  
  const { data: pending } = await supabase
    .from('community_templates')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const { data: approved } = await supabase
    .from('community_templates')
    .select('*')
    .eq('status', 'approved');

  const result: AutomationResult = {
    totalProcessed: 0,
    autoApproved: [],
    autoRejected: [],
    needsReview: [],
    duplicatesFound: [],
  };

  if (!pending || pending.length === 0) return result;

  for (const template of pending) {
    result.totalProcessed++;

    const duplicateResult = detectTemplateDuplicate(
      template.content,
      (approved || []).map(a => ({ ...a, id: a.id, content: a.content, type: a.type, locale: a.locale, status: a.status, createdAt: a.created_at, updatedAt: a.updated_at })),
      template.type
    );

    if (duplicateResult.isDuplicate) {
      result.duplicatesFound.push({
        id: template.id,
        matchedName: `Template ${template.type}`,
        similarity: duplicateResult.similarity,
      });
    }

    const confidence = scoreTemplate(
      { ...template, id: template.id, content: template.content, type: template.type, locale: template.locale, status: template.status, createdAt: template.created_at, updatedAt: template.updated_at },
      duplicateResult,
      config
    );

    const entry = { id: template.id, name: template.content.substring(0, 50) + '...', score: confidence.score, reasons: confidence.reasons };

    if (confidence.autoAction === 'approve') {
      result.autoApproved.push(entry);
      await supabase
        .from('community_templates')
        .update({ status: 'approved', updated_at: new Date().toISOString(), curated_by: 'automation' })
        .eq('id', template.id);
    } else if (confidence.autoAction === 'reject') {
      result.autoRejected.push(entry);
      await supabase
        .from('community_templates')
        .update({ status: 'rejected', updated_at: new Date().toISOString(), curated_by: 'automation', rejection_reason: confidence.reasons.join('. ') })
        .eq('id', template.id);
    } else {
      result.needsReview.push(entry);
    }
  }

  return result;
}
