'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

// Definimos la estructura exacta que esperamos (Auditoría de Datos)
const MODEL_NAME = 'gemini-2.5-flash';

export async function processIdCard(formData: FormData) {
  const imageFile = formData.get('image') as File;

  if (!imageFile) {
    return { success: false, error: 'No se recibió imagen forense.' };
  }

  try {
    // 1. Convertir archivo a Buffer para Google
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // 2. Inicializar Cliente Seguro (La llave vive en el servidor)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' }, // Forzamos JSON
    });

    // 3. Prompt de Ingeniería Forense
    const prompt = `
      Actúa como un experto en documentos de identidad colombianos. 
      Analiza esta imagen de una Cédula de Ciudadanía.
      Extrae los datos con precisión forense.
      Retorna SOLAMENTE un objeto JSON con esta estructura:
      {
        "docNumber": "string (solo números, sin puntos)",
        "fullName": "string (nombre completo en mayúsculas)",
        "bloodType": "string (ej: O+, A-)",
        "birthDate": "string (YYYY-MM-DD)",
        "gender": "string (M/F)"
      }
      Si la imagen no es legible o no es una cédula, retorna: { "error": "DOCUMENTO_ILEGIBLE" }
    `;

    // 4. Ejecución
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: imageFile.type,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();
    const data = JSON.parse(text);

    if (data.error) {
      return {
        success: false,
        error: 'Documento no reconocido por el sistema forense.',
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error Forense AI:', error);
    return { success: false, error: 'Fallo en el procesamiento neural.' };
  }
}
