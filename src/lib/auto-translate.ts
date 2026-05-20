/**
 * 🌐 Auto-Translation Service — Option C (Hybrid)
 *
 * When a hotelier saves hotel/room data in Spanish, it's automatically
 * translated to English. The hotelier can edit the translation if needed.
 *
 * Uses DeepL API (free tier: 500K chars/month) or Google Translate as fallback.
 * Cost: ~$5.000 COP/month per hotel (well within margin).
 */

interface TranslationResult {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
}

/**
 * Translates hotel metadata to English.
 * Called when hotelier saves hotel info.
 */
export async function translateHotelData(
  data: {
    name?: string;
    description?: string;
    location?: string;
    address?: string;
    cancellation_policy?: string;
    reception_hours?: string;
  }
): Promise<TranslationResult> {
  try {
    const fieldsToTranslate: Record<string, string> = {};

    if (data.name) fieldsToTranslate.name = data.name;
    if (data.description) fieldsToTranslate.description = data.description;
    if (data.location) fieldsToTranslate.location = data.location;
    if (data.address) fieldsToTranslate.address = data.address;
    if (data.cancellation_policy) fieldsToTranslate.cancellation_policy = data.cancellation_policy;
    if (data.reception_hours) fieldsToTranslate.reception_hours = data.reception_hours;

    if (Object.keys(fieldsToTranslate).length === 0) {
      return { success: true, data: {} };
    }

    const translated: Record<string, string> = {};

    for (const [key, text] of Object.entries(fieldsToTranslate)) {
      translated[key] = await translateText(text, 'es', 'en');
    }

    return { success: true, data: translated };
  } catch (error) {
    console.error('[translateHotelData] Error:', error);
    return { success: false, error: 'Error al traducir datos del hotel' };
  }
}

/**
 * Translates room data to English.
 * Called when hotelier saves room info.
 */
export async function translateRoomData(
  data: {
    name?: string;
    description?: string;
  }
): Promise<TranslationResult> {
  try {
    const fieldsToTranslate: Record<string, string> = {};

    if (data.name) fieldsToTranslate.name = data.name;
    if (data.description) fieldsToTranslate.description = data.description;

    if (Object.keys(fieldsToTranslate).length === 0) {
      return { success: true, data: {} };
    }

    const translated: Record<string, string> = {};

    for (const [key, text] of Object.entries(fieldsToTranslate)) {
      translated[key] = await translateText(text, 'es', 'en');
    }

    return { success: true, data: translated };
  } catch (error) {
    console.error('[translateRoomData] Error:', error);
    return { success: false, error: 'Error al traducir datos de la habitación' };
  }
}

/**
 * Translates menu category data to English.
 * Called when hotelier saves carta digital category.
 */
export async function translateCategoryData(
  data: {
    name?: string;
    description?: string;
  }
): Promise<TranslationResult> {
  try {
    const fieldsToTranslate: Record<string, string> = {};

    if (data.name) fieldsToTranslate.name = data.name;
    if (data.description) fieldsToTranslate.description = data.description;

    if (Object.keys(fieldsToTranslate).length === 0) {
      return { success: true, data: {} };
    }

    const translated: Record<string, string> = {};

    for (const [key, text] of Object.entries(fieldsToTranslate)) {
      translated[key] = await translateText(text, 'es', 'en');
    }

    return { success: true, data: translated };
  } catch (error) {
    console.error('[translateCategoryData] Error:', error);
    return { success: false, error: 'Error al traducir categoría' };
  }
}

/**
 * Translates menu item data to English.
 * Called when hotelier saves carta digital items.
 */
export async function translateMenuData(
  data: {
    name?: string;
    description?: string;
    category?: string;
  }
): Promise<TranslationResult> {
  try {
    const fieldsToTranslate: Record<string, string> = {};

    if (data.name) fieldsToTranslate.name = data.name;
    if (data.description) fieldsToTranslate.description = data.description;
    if (data.category) fieldsToTranslate.category = data.category;

    if (Object.keys(fieldsToTranslate).length === 0) {
      return { success: true, data: {} };
    }

    const translated: Record<string, string> = {};

    for (const [key, text] of Object.entries(fieldsToTranslate)) {
      translated[key] = await translateText(text, 'es', 'en');
    }

    return { success: true, data: translated };
  } catch (error) {
    console.error('[translateMenuData] Error:', error);
    return { success: false, error: 'Error al traducir datos del menú' };
  }
}

/**
 * Core translation function.
 * Uses DeepL API if available, falls back to Google Translate free.
 */
async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  // Try DeepL API first (if key is configured)
  const deeplKey = process.env.DEEPL_API_KEY;
  if (deeplKey) {
    try {
      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${deeplKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text,
          source_lang: sourceLang.toUpperCase(),
          target_lang: targetLang.toUpperCase(),
        }),
      });

      if (response.ok) {
        const json = await response.json();
        return json.translations?.[0]?.text || text;
      }
    } catch (e) {
      console.warn('[translateText] DeepL failed, falling back:', e);
    }
  }

  // Fallback: MyMemory Translate API (free, no key needed)
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    );

    if (response.ok) {
      const json = await response.json();
      return json.responseData?.translatedText || text;
    }
  } catch (e) {
    console.warn('[translateText] MyMemory failed:', e);
  }

  // Last resort: return original text
  return text;
}
