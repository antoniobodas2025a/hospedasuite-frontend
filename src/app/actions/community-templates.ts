'use server';

import { createClient } from '@/utils/supabase/server';
import { communityTemplateSchema } from '@/lib/community-templates-schema';
import type { CommunityTemplate } from '@/lib/community-templates-schema';

/**
 * Submit a template from the wizard (always goes to 'pending')
 */
export async function submitCommunityTemplate(data: {
  type: 'cancellation' | 'roomDescription' | 'hotelDescription';
  content: string;
  locale: string;
  propertyType?: string;
  hotelName?: string;
  source?: 'ai_generated' | 'user_written' | 'ai_enriched';
}) {
  const validated = communityTemplateSchema.omit({
    id: true, status: true, createdAt: true, updatedAt: true,
    curatedBy: true, curatedAt: true, rejectionReason: true,
  }).safeParse({
    type: data.type,
    content: data.content.trim(),
    locale: data.locale === 'en' ? 'en' : 'es',
    propertyType: data.propertyType,
    hotelName: data.hotelName,
    source: data.source || 'ai_generated',
  });

  if (!validated.success) {
    return { success: false, error: 'Datos inválidos: contenido muy corto o tipo incorrecto' };
  }

  const now = new Date().toISOString();
  const template = {
    ...validated.data,
    id: crypto.randomUUID(),
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('community_templates')
      .insert(template);

    if (error) {
      // If table doesn't exist yet, fallback to file-based storage
      return saveTemplateToFile(template);
    }

    return { success: true, id: template.id };
  } catch {
    return saveTemplateToFile(template);
  }
}

/**
 * Get approved templates for the AI assistant to use as context
 */
export async function getApprovedTemplates(type?: string, locale?: string): Promise<CommunityTemplate[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('community_templates')
      .select('*')
      .eq('status', 'approved');

    if (type) query = query.eq('type', type);
    if (locale) query = query.eq('locale', locale);

    const { data, error } = await query.order('createdAt', { ascending: false }).limit(20);

    if (error || !data) return [];
    return data as CommunityTemplate[];
  } catch {
    return getTemplatesFromFile(type, locale);
  }
}

/**
 * Admin: curate a template (approve/reject)
 */
export async function curateTemplate(templateId: string, action: 'approve' | 'reject', reason?: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('community_templates')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      curatedAt: now,
      updatedAt: now,
      rejectionReason: action === 'reject' ? reason : null,
    })
    .eq('id', templateId);

  return { success: !error, error: error?.message };
}

/**
 * Admin: get pending templates for review
 */
export async function getPendingTemplates(): Promise<CommunityTemplate[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('community_templates')
      .select('*')
      .eq('status', 'pending')
      .order('createdAt', { ascending: false });

    return (data || []) as CommunityTemplate[];
  } catch {
    return getTemplatesFromFile(undefined, undefined, 'pending');
  }
}

// ── File-based fallback (no DB table yet) ──

const TEMPLATES_PATH = process.env.TEMPLATES_PATH || '/tmp/community-templates.json';

async function saveTemplateToFile(template: Omit<CommunityTemplate, 'curatedBy' | 'curatedAt' | 'rejectionReason'> & { curatedBy?: string; curatedAt?: string; rejectionReason?: string }) {
  try {
    const fs = await import('fs/promises');
    let existing: CommunityTemplate[] = [];
    try {
      const raw = await fs.readFile(TEMPLATES_PATH, 'utf-8');
      existing = JSON.parse(raw);
    } catch {
      // file doesn't exist yet
    }

    existing.push(template as CommunityTemplate);
    await fs.writeFile(TEMPLATES_PATH, JSON.stringify(existing, null, 2));
    return { success: true, id: template.id, note: 'Stored locally (DB table not created yet)' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function getTemplatesFromFile(type?: string, locale?: string, status?: string): Promise<CommunityTemplate[]> {
  try {
    const fs = await import('fs/promises');
    const raw = await fs.readFile(TEMPLATES_PATH, 'utf-8');
    let templates: CommunityTemplate[] = JSON.parse(raw);

    if (type) templates = templates.filter(t => t.type === type);
    if (locale) templates = templates.filter(t => t.locale === locale);
    if (status) templates = templates.filter(t => t.status === status);

    return templates;
  } catch {
    return [];
  }
}

// ============================================================================
// Amenity Suggestions — Hoteleros proponen, admin cura
// ============================================================================

export interface AmenitySuggestion {
  id: string;
  name: string;
  description?: string;
  locale: 'es' | 'en';
  category?: 'hotel' | 'room' | 'both';
  suggestedIcon?: string;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  hotelName?: string;
  createdAt: string;
  updatedAt: string;
  curatedBy?: string;
  curatedAt?: string;
  rejectionReason?: string;
  mergedId?: string;
}

/**
 * Submit a new amenity suggestion from the wizard
 */
export async function submitAmenitySuggestion(data: {
  name: string;
  description?: string;
  locale: string;
  category?: 'hotel' | 'room' | 'both';
  suggestedIcon?: string;
  hotelName?: string;
}) {
  const name = data.name.trim();
  if (name.length < 2) {
    return { success: false, error: 'El nombre debe tener al menos 2 caracteres' };
  }
  if (name.length > 50) {
    return { success: false, error: 'El nombre no puede tener más de 50 caracteres' };
  }

  const now = new Date().toISOString();
  const suggestion: Omit<AmenitySuggestion, 'curatedBy' | 'curatedAt' | 'rejectionReason' | 'mergedId'> = {
    id: crypto.randomUUID(),
    name,
    description: data.description?.trim(),
    locale: data.locale === 'en' ? 'en' : 'es',
    category: data.category || 'both',
    suggestedIcon: data.suggestedIcon,
    status: 'pending',
    hotelName: data.hotelName,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('amenity_suggestions')
      .insert(suggestion);

    if (error) {
      return saveAmenityToFile(suggestion);
    }

    return { success: true, id: suggestion.id };
  } catch {
    return saveAmenityToFile(suggestion);
  }
}

/**
 * Get pending amenity suggestions for admin review
 */
export async function getPendingAmenitySuggestions(): Promise<AmenitySuggestion[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('amenity_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return (data || []) as AmenitySuggestion[];
  } catch {
    return getAmenitiesFromFile('pending');
  }
}

/**
 * Admin: curate an amenity suggestion
 */
export async function curateAmenitySuggestion(
  suggestionId: string,
  action: 'approve' | 'reject' | 'merge',
  reason?: string,
  mergedId?: string
) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const statusMap = { approve: 'approved', reject: 'rejected', merge: 'merged' };

  const { error } = await supabase
    .from('amenity_suggestions')
    .update({
      status: statusMap[action],
      curated_at: now,
      updated_at: now,
      rejection_reason: action === 'reject' ? reason : null,
      merged_id: action === 'merge' ? mergedId : null,
    })
    .eq('id', suggestionId);

  return { success: !error, error: error?.message };
}

/**
 * Get approved amenity suggestions (to merge into registry)
 */
export async function getApprovedAmenitySuggestions(): Promise<AmenitySuggestion[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('amenity_suggestions')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    return (data || []) as AmenitySuggestion[];
  } catch {
    return getAmenitiesFromFile('approved');
  }
}

// ── File-based fallback for amenity suggestions ──

const AMENITIES_PATH = process.env.AMENITIES_PATH || '/tmp/amenity-suggestions.json';

async function saveAmenityToFile(suggestion: Omit<AmenitySuggestion, 'curatedBy' | 'curatedAt' | 'rejectionReason' | 'mergedId'> & { curatedBy?: string; curatedAt?: string; rejectionReason?: string; mergedId?: string }) {
  try {
    const fs = await import('fs/promises');
    let existing: AmenitySuggestion[] = [];
    try {
      const raw = await fs.readFile(AMENITIES_PATH, 'utf-8');
      existing = JSON.parse(raw);
    } catch {
      // file doesn't exist yet
    }

    existing.push(suggestion as AmenitySuggestion);
    await fs.writeFile(AMENITIES_PATH, JSON.stringify(existing, null, 2));
    return { success: true, id: suggestion.id, note: 'Stored locally (DB table not created yet)' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function getAmenitiesFromFile(status?: string): Promise<AmenitySuggestion[]> {
  try {
    const fs = await import('fs/promises');
    const raw = await fs.readFile(AMENITIES_PATH, 'utf-8');
    let suggestions: AmenitySuggestion[] = JSON.parse(raw);

    if (status) suggestions = suggestions.filter(s => s.status === status);
    return suggestions;
  } catch {
    return [];
  }
}

// ============================================================================
// AUTOMATION ENGINE WRAPPERS
// ============================================================================

import { runAmenityAutomation, runTemplateAutomation, DEFAULT_CONFIG, type CurationConfig } from '@/lib/curation-automation';

export type { AutomationResult } from '@/lib/curation-automation';

/**
 * Run the full automation pipeline on pending items
 */
export async function runCurationAutomation(config?: Partial<CurationConfig>) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [amenityResult, templateResult] = await Promise.all([
    runAmenityAutomation(mergedConfig),
    runTemplateAutomation(mergedConfig),
  ]);

  return {
    amenities: amenityResult,
    templates: templateResult,
    summary: {
      totalProcessed: amenityResult.totalProcessed + templateResult.totalProcessed,
      autoApproved: amenityResult.autoApproved.length + templateResult.autoApproved.length,
      autoRejected: amenityResult.autoRejected.length + templateResult.autoRejected.length,
      needsReview: amenityResult.needsReview.length + templateResult.needsReview.length,
      duplicatesFound: amenityResult.duplicatesFound.length + templateResult.duplicatesFound.length,
    },
  };
}

/**
 * Get curation stats for the dashboard
 */
export async function getCurationStats() {
  try {
    const supabase = await createClient();

    const [amenityStats, templateStats] = await Promise.all([
      supabase.from('amenity_suggestions').select('status').then(r => {
        const counts = { pending: 0, approved: 0, rejected: 0, merged: 0 };
        (r.data || []).forEach((item: any) => { counts[item.status as keyof typeof counts]++; });
        return counts;
      }),
      supabase.from('community_templates').select('status').then(r => {
        const counts = { pending: 0, approved: 0, rejected: 0, draft: 0 };
        (r.data || []).forEach((item: any) => { counts[item.status as keyof typeof counts]++; });
        return counts;
      }),
    ]);

    // Top suggested amenity names
    const { data: topAmenities } = await supabase
      .from('amenity_suggestions')
      .select('name, status')
      .neq('status', 'rejected');

    const frequencyMap: Record<string, number> = {};
    (topAmenities || []).forEach((a: any) => {
      frequencyMap[a.name] = (frequencyMap[a.name] || 0) + 1;
    });
    const topSuggested = Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      amenities: amenityStats,
      templates: templateStats,
      topSuggested,
    };
  } catch {
    return { amenities: {}, templates: {}, topSuggested: [] };
  }
}

/**
 * Generate code snippet to merge approved amenities into the registry
 */
export async function generateRegistryMergeCode() {
  try {
    const supabase = await createClient();
    const { data: approved } = await supabase
      .from('amenity_suggestions')
      .select('*')
      .eq('status', 'approved')
      .is('merged_id', null)
      .order('created_at', { ascending: true });

    if (!approved || approved.length === 0) {
      return { success: true, code: '// No hay amenidades aprobadas pendientes de merge', count: 0 };
    }

    let code = `// ── Auto-merged amenidades aprobadas (${new Date().toISOString().split('T')[0]}) ──\n`;
    code += `// Copiar y pegar en src/lib/amenity-registry.ts\n\n`;

    for (const amenity of approved) {
      const id = amenity.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const icon = amenity.suggested_icon || 'Star';
      const label = amenity.name;
      const description = amenity.description ? `\n    storyTitle: '${label}',\n    storyDescription: '${(amenity.description || '').replace(/'/g, "\\'")}',` : '';
      const category = amenity.category === 'room' ? 'ROOM_AMENITY' : 'AMENITY';

      code += `// Sugerido por: ${amenity.hotel_name || 'Anónimo'} | ${amenity.locale}\n`;
      code += `${category === 'ROOM_AMENITY' ? '  ' : ''}${id}: {\n`;
      code += `    id: '${id}',\n`;
      code += `    label: '${label.replace(/'/g, "\\'")}',\n`;
      code += `    icon: ${icon},${description}\n`;
      code += `  },\n\n`;
    }

    return { success: true, code, count: approved.length };
  } catch (e: any) {
    return { success: false, error: e.message, code: '', count: 0 };
  }
}
