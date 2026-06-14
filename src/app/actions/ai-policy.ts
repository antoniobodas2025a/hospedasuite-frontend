'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApprovedTemplates } from './community-templates';

const MODEL_NAME = 'gemini-3.1-flash-lite';

const GUARD_RULES = `
RESTRICCIONES OBLIGATORIAS (NO PUEDES IGNORARLAS):
1. SOLO puedes redactar texto relacionado con el campo específico que se te asignó.
2. Si el usuario pide algo fuera de contexto (código, chistes, recetas, preguntas generales, otro tema), responde EXACTAMENTE: "Este asistente solo redacta texto para el campo actual. Por favor, escribe una instrucción relacionada."
3. NO respondas preguntas sobre tu funcionamiento, modelo, o capacidades.
4. NO generes contenido ofensivo, político, religioso o no relacionado con hotelería.
5. Mantén la respuesta breve y enfocada. NO agregues saludos, despedidas ni explicaciones.
6. Si las instrucciones son vagas o insuficientes, generá una versión genérica pero profesional del texto solicitado.
`;

export interface PolicyContext {
  propertyType?: string;
  cityName?: string;
  checkInTime?: string;
  checkOutTime?: string;
  roomType?: string;
  roomCapacity?: number;
}

/**
 * Build few-shot examples from approved community templates
 */
async function buildFewShotContext(type: string, locale: string): Promise<string> {
  try {
    const templates = await getApprovedTemplates(type, locale);
    if (templates.length === 0) return '';

    const examples = templates.slice(0, 3).map((t, i) => {
      const preview = t.content.length > 200 ? t.content.substring(0, 200) + '...' : t.content;
      return `EJEMPLO ${i + 1} (aprobado por la comunidad):\n${preview}`;
    }).join('\n\n');

    return `\n\nREFERENCIAS DE LA COMUNIDAD (usa estos como inspiración para el tono y estilo):\n${examples}`;
  } catch {
    return '';
  }
}

export async function generatePolicyText(
  type: 'cancellation' | 'roomDescription' | 'hotelDescription',
  userInstructions: string,
  context: PolicyContext = {}
): Promise<{ success: boolean; text: string; error?: string }> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'text/plain' },
    });

    // Fetch few-shot context in parallel
    const locale = process.env.DEFAULT_LOCALE || 'es';
    const fewShotContext = buildFewShotContext(type, locale);

    const systemPrompts: Record<typeof type, string> = {
      cancellation: `Eres un asistente que redacta políticas de cancelación para alojamientos turísticos. 
El usuario te dará instrucciones sobre qué tipo de política quiere. 
Contexto: tipo de propiedad: ${context.propertyType || 'no especificado'}, 
check-in: ${context.checkInTime || '15:00'}, check-out: ${context.checkOutTime || '11:00'}.
Redacta la política en español, tono profesional pero cercano, máximo 3-4 párrafos. 
Incluí plazos, penalidades y excepciones si corresponde. 
Respondé SOLO con el texto de la política, sin explicaciones adicionales.`,

      roomDescription: `Eres un asistente que redacta descripciones atractivas de habitaciones para sitios de reservas hoteleras.
El usuario te dará instrucciones. Contexto: tipo de habitación: ${context.roomType || 'no especificado'}, 
capacidad: ${context.roomCapacity || 'no especificada'} personas.
Redacta en español, tono cálido y descriptivo, máximo 2-3 párrafos. 
Mencioná amenities, ambiente y experiencia del huésped. 
Respondé SOLO con la descripción, sin explicaciones adicionales.`,

      hotelDescription: `Eres un asistente que redacta descripciones de hoteles/alojamientos para sitios de reservas.
El usuario te dará instrucciones. Contexto: tipo: ${context.propertyType || 'no especificado'}, 
ciudad: ${context.cityName || 'no especificada'}.
Redacta en español, tono profesional y atractivo, máximo 2-3 párrafos. 
Respondé SOLO con la descripción, sin explicaciones adicionales.`,
    };

    const fewShot = await fewShotContext;
    const prompt = `${systemPrompts[type]}\n\n${GUARD_RULES}${fewShot}\n\nInstrucciones del usuario: ${userInstructions}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    return { success: true, text };
  } catch (error: any) {
    console.error('Error AI Policy Generator:', error);
    return { success: false, text: '', error: 'No se pudo generar el texto. Intenta de nuevo.' };
  }
}
