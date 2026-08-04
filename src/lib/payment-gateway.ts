/**
 * Payment Gateway Abstraction
 * 
 * Interface for payment providers (Wompi, MercadoPago, PayU, etc.)
 * Ensures "Soberanía Financiera": 100% of funds go to the hotel's account.
 */

import { createHmac, timingSafeEqual } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentGatewayConfig {
  hotelId: string;
  hotelPublicKey: string;
  hotelSecretKey: string;
  isSandbox: boolean;
}

export interface CheckoutParams {
  amountInCents: number;
  currency: string;
  reference: string; // Booking ID
  redirectUrl: string;
  customerEmail?: string;
}

export interface PaymentGateway {
  name: string;
  getCheckoutUrl(config: PaymentGatewayConfig, params: CheckoutParams): string;
  verifySignature(payload: WompiWebhookPayload, secret: string): boolean;
}

// ============================================================================
// WOMPI WEBHOOK PAYLOAD
// ============================================================================

export interface WompiWebhookPayload {
  event: string;
  data: {
    transaction: {
      id: number;
      amount_in_cents: number;
      reference: string;
      status: string;
      // ... other fields
    };
  };
  signature: {
    checksum: string; // HMAC-SHA256 of the payload
    properties: string[]; // Fields included in checksum
    timestamp: number;
  };
}

// ============================================================================
// WOMPI GATEWAY IMPLEMENTATION
// ============================================================================

/**
 * Wompi Gateway Implementation
 * 
 * Signature verification follows Wompi's official documentation:
 * https://docs.wompi.co/docs/webhooks
 * 
 * The checksum is an HMAC-SHA256 of concatenated field values,
 * signed with the integration secret key.
 */
export class WompiGateway implements PaymentGateway {
  name = 'Wompi';

  getCheckoutUrl(config: PaymentGatewayConfig, params: CheckoutParams): string {
    const baseUrl = config.isSandbox 
      ? 'https://checkout.sandbox.wompi.co/p/' 
      : 'https://checkout.wompi.co/p/';

    const url = new URL(baseUrl);
    url.searchParams.append('public-key', config.hotelPublicKey);
    url.searchParams.append('currency', params.currency);
    url.searchParams.append('amount-in-cents', params.amountInCents.toString());
    url.searchParams.append('reference', params.reference);
    url.searchParams.append('redirect-url', params.redirectUrl);

    return url.toString();
  }

  /**
   * Verifies Wompi webhook signature using HMAC-SHA256.
   * 
   * Wompi's signature format:
   * - checksum = HMAC-SHA256(secret, concatenation of field values)
   * - Fields are listed in signature.properties
   * - Values are concatenated in order without separator
   */
  verifySignature(payload: WompiWebhookPayload, secret: string): boolean {
    try {
      // 1. Extract signature data
      const { checksum, properties, timestamp } = payload.signature;
      
      if (!checksum || !properties || !timestamp) {
        return false;
      }

      // 2. Build the string to verify (concatenate field values)
      const fieldsToSign = properties.map(prop => {
        // Navigate nested properties like "transaction.status"
        // Wompi puts fields under data.transaction, so search from data level
        const value = prop.split('.').reduce((obj: any, key) => obj?.[key], payload.data || payload);
        return String(value ?? '');
      }).join('');

      // 3. Compute HMAC-SHA256
      const computedChecksum = createHmac('sha256', secret)
        .update(fieldsToSign)
        .digest('hex');

      // 4. Timing-safe comparison
      const checksumBuffer = Buffer.from(checksum, 'hex');
      const computedBuffer = Buffer.from(computedChecksum, 'hex');

      return checksumBuffer.length === computedBuffer.length &&
             timingSafeEqual(checksumBuffer, computedBuffer);
    } catch {
      return false;
    }
  }
}

// ============================================================================
// GATEWAY FACTORY
// ============================================================================

/**
 * Gateway Factory
 */
export function createGateway(type: 'wompi' | 'mercadopago' | 'payu'): PaymentGateway {
  switch (type) {
    case 'wompi':
      return new WompiGateway();
    case 'mercadopago':
      throw new Error('MercadoPago connector coming soon');
    case 'payu':
      throw new Error('PayU connector coming soon');
    default:
      throw new Error('Unknown payment gateway');
  }
}
