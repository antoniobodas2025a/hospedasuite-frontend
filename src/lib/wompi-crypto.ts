import crypto from 'crypto';

export function verifyWompiSignature(payload: any, secret: string): boolean {
  try {
    const signature = payload?.signature;
    if (!signature || !signature.properties || !signature.checksum) return false;

    let concatString = '';
    signature.properties.forEach((prop: string) => {
      const keys = prop.split('.');
      let val = payload;
      keys.forEach(k => { 
        val = val?.[k]; 
      });
      concatString += val !== undefined && val !== null ? val : '';
    });
    
    concatString += secret;
    const expectedChecksum = crypto.createHash('sha256').update(concatString).digest('hex');
    
    const hashBuffer = Buffer.from(expectedChecksum);
    const signatureBuffer = Buffer.from(signature.checksum);
    
    if (hashBuffer.length !== signatureBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, signatureBuffer);
  } catch (error) {
    console.error('[CRITICAL] Fallo en la validación criptográfica:', error);
    return false;
  }
}