import { describe, it, expect } from 'vitest';
import { WompiGateway, createGateway } from '../payment-gateway';
import { createHmac } from 'crypto';

describe('payment-gateway', () => {
  const gateway = new WompiGateway();
  const secret = 'test-wompi-secret-key';

  describe('WompiGateway', () => {
    it('should have correct name', () => {
      expect(gateway.name).toBe('Wompi');
    });

    describe('getCheckoutUrl', () => {
      it('should generate sandbox URL', () => {
        const url = gateway.getCheckoutUrl(
          {
            hotelId: 'hotel-123',
            hotelPublicKey: 'pub_test_123',
            hotelSecretKey: 'sec_test_123',
            isSandbox: true,
          },
          {
            amountInCents: 50000,
            currency: 'COP',
            reference: 'booking-456',
            redirectUrl: 'https://example.com/callback',
          }
        );

        expect(url).toContain('checkout.sandbox.wompi.co');
        expect(url).toContain('public-key=pub_test_123');
        expect(url).toContain('amount-in-cents=50000');
        expect(url).toContain('reference=booking-456');
      });

      it('should generate production URL', () => {
        const url = gateway.getCheckoutUrl(
          {
            hotelId: 'hotel-123',
            hotelPublicKey: 'pub_live_123',
            hotelSecretKey: 'sec_live_123',
            isSandbox: false,
          },
          {
            amountInCents: 100000,
            currency: 'COP',
            reference: 'booking-789',
            redirectUrl: 'https://example.com/success',
          }
        );

        expect(url).toContain('checkout.wompi.co');
        expect(url).not.toContain('sandbox');
      });
    });

    describe('verifySignature', () => {
      it('should verify valid HMAC-SHA256 signature', () => {
        // Create a test payload
        const payload = {
          event: 'transaction.updated',
          data: {
            transaction: {
              id: 12345,
              amount_in_cents: 50000,
              reference: 'booking-456',
              status: 'APPROVED',
            },
          },
          signature: {
            checksum: '',
            properties: ['transaction.status', 'transaction.reference'],
            timestamp: Date.now(),
          },
        };

        // Compute the expected checksum
        const fieldsToSign = payload.signature.properties
          .map(prop => {
            // Wompi puts fields under data.transaction
            const value = prop.split('.').reduce((obj: any, key) => obj?.[key], payload.data || payload);
            return String(value ?? '');
          })
          .join('');

        const expectedChecksum = createHmac('sha256', secret)
          .update(fieldsToSign)
          .digest('hex');

        payload.signature.checksum = expectedChecksum;

        const isValid = gateway.verifySignature(payload, secret);
        expect(isValid).toBe(true);
      });

      it('should reject invalid signature', () => {
        const payload = {
          event: 'transaction.updated',
          data: {
            transaction: {
              id: 12345,
              amount_in_cents: 50000,
              reference: 'booking-456',
              status: 'APPROVED',
            },
          },
          signature: {
            checksum: 'invalid-checksum',
            properties: ['transaction.status'],
            timestamp: Date.now(),
          },
        };

        const isValid = gateway.verifySignature(payload, secret);
        expect(isValid).toBe(false);
      });

      it('should reject payload with missing signature fields', () => {
        const payload = {
          event: 'transaction.updated',
          data: { transaction: { id: 12345 } },
          signature: {
            checksum: '',
            properties: [],
            timestamp: Date.now(),
          },
        };

        const isValid = gateway.verifySignature(payload, secret);
        expect(isValid).toBe(false);
      });

      it('should reject tampered payload', () => {
        // Create valid signature for original data
        const originalPayload = {
          event: 'transaction.updated',
          data: {
            transaction: {
              id: 12345,
              amount_in_cents: 50000,
              reference: 'booking-456',
              status: 'APPROVED',
            },
          },
          signature: {
            checksum: '',
            properties: ['transaction.status', 'transaction.reference'],
            timestamp: Date.now(),
          },
        };

        const fieldsToSign = originalPayload.signature.properties
          .map(prop => {
            // Wompi puts fields under data.transaction
            const value = prop.split('.').reduce((obj: any, key) => obj?.[key], originalPayload.data || originalPayload);
            return String(value ?? '');
          })
          .join('');

        const checksum = createHmac('sha256', secret)
          .update(fieldsToSign)
          .digest('hex');

        // Tamper with the data but keep original checksum
        // The checksum was computed from "APPROVEDbooking-456"
        // Now we change status to "DECLINED" but keep the old checksum
        const tamperedPayload = {
          event: 'transaction.updated',
          data: {
            transaction: {
              id: 12345,
              amount_in_cents: 50000,
              reference: 'booking-456',
              status: 'DECLINED', // Changed!
            },
          },
          signature: {
            checksum, // Checksum computed from "APPROVEDbooking-456"
            properties: ['transaction.status', 'transaction.reference'],
            timestamp: originalPayload.signature.timestamp,
          },
        };

        const isValid = gateway.verifySignature(tamperedPayload, secret);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('createGateway', () => {
    it('should create Wompi gateway', () => {
      const gateway = createGateway('wompi');
      expect(gateway.name).toBe('Wompi');
    });

    it('should throw for unknown gateway', () => {
      expect(() => createGateway('mercadopago')).toThrow('coming soon');
    });
  });
});
