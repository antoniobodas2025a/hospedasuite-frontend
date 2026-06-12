/**
 * Payment Gateway Abstraction
 * 
 * Interface for payment providers (Wompi, MercadoPago, PayU, etc.)
 * Ensures "Soberanía Financiera": 100% of funds go to the hotel's account.
 */

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
  verifySignature(payload: any, secret: string): boolean;
}

/**
 * Wompi Gateway Implementation
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

  verifySignature(payload: any, secret: string): boolean {
    // Simplified verification for demo. In production, use HMAC-SHA256.
    return payload.signature === secret;
  }
}

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
