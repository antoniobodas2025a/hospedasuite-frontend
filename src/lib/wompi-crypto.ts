import crypto from 'crypto';

// 1. Tipado Estricto de Cero Confianza (Zero Trust)
export interface WompiSignature {
  properties: string[];
  checksum: string;
}

export interface WompiEventPayload {
  event: string;
  data: Record<string, unknown>;
  environment: string;
  signature: WompiSignature;
  timestamp: number; // Unix Epoch proporcionado por Wompi
  sent_at?: string;
  [key: string]: unknown; // Extensibilidad segura
}

export interface VerificationOptions {
  maxAgeSeconds?: number; // Defensa contra Replay Attacks
}

export function verifyWompiSignature(
  payload: WompiEventPayload,
  secret: string,
  options: VerificationOptions = { maxAgeSeconds: 300 } // 5 minutos de validez máxima
): boolean {
  try {
    const { signature, timestamp } = payload;

    // 1. Validación de Contrato Estructural
    if (!signature || !Array.isArray(signature.properties) || typeof signature.checksum !== 'string') {
      console.warn('⚠️ [WOMPI SEC] Contrato de firma inválido o corrompido.');
      return false;
    }

    // 2. Barrera Temporal (Defensa contra Replay Attacks)
    if (options.maxAgeSeconds && timestamp) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const eventAge = nowInSeconds - timestamp;
      
      // Permitimos un drift de -60s por desincronización de relojes NTP
      if (eventAge > options.maxAgeSeconds || eventAge < -60) {
        console.error(`🚨 [WOMPI SEC] REPLAY ATTACK ABORTADO: Payload caducado o fuera de ventana por ${eventAge}s.`);
        return false;
      }
    }

    // 3. Reconstrucción Criptográfica (Traversal de Grafo Seguro)
    let concatString = '';
    for (const prop of signature.properties) {
      const keys = prop.split('.');
      let val: unknown = payload;
      
      // Recorrido de profundidad segura
      for (const k of keys) {
        if (val === undefined || val === null) break;
        // Type assertion segura dado que verificamos nulabilidad
        val = (val as Record<string, unknown>)[k];
      }
      
      // Prevenir concatenación accidental de objetos (Ej: "[object Object]")
      if (typeof val === 'object' && val !== null) {
        console.warn(`⚠️ [WOMPI SEC] Inyección de objeto detectada en la propiedad: ${prop}`);
        return false;
      }

      concatString += (val !== undefined && val !== null) ? String(val) : '';
    }
    
    concatString += secret;

    // 4. Hashing Determinista (Enforzando UTF-8)
    const expectedChecksum = crypto.createHash('sha256').update(concatString, 'utf8').digest('hex');
    
    // 5. Comparación Segura contra Timing Attacks (Memoria Criptográfica)
    const hashBuffer = Buffer.from(expectedChecksum, 'utf8');
    const signatureBuffer = Buffer.from(signature.checksum, 'utf8');
    
    if (hashBuffer.length !== signatureBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(hashBuffer, signatureBuffer);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Excepción algorítmica desconocida';
    console.error('❌ [CRITICAL] Colapso en el motor criptográfico de Wompi:', msg);
    return false;
  }
}