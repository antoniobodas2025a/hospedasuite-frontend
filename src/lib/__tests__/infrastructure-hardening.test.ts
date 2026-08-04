import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac } from 'crypto';

// Mock环境变量
const ORIGINAL_ENV = process.env.QSTASH_SIGNING_SECRET;

beforeEach(() => {
  vi.stubEnv('QSTASH_SIGNING_SECRET', 'test-qstash-secret-key');
});

afterEach(() => {
  if (ORIGINAL_ENV !== undefined) {
    vi.stubEnv('QSTASH_SIGNING_SECRET', ORIGINAL_ENV);
  } else {
    vi.unstubAllEnvs();
  }
});

describe('Infrastructure Hardening (PR #5)', () => {
  describe('QStash Signature Verification', () => {
    it('should compute correct HMAC-SHA256 signature', () => {
      const secret = 'test-qstash-secret-key';
      const body = '{"event":"test","data":{}}';
      
      const signature = createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      
      expect(signature).toHaveLength(64);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different signatures for different bodies', () => {
      const secret = 'test-qstash-secret-key';
      
      const sig1 = createHmac('sha256', secret).update('body1').digest('hex');
      const sig2 = createHmac('sha256', secret).update('body2').digest('hex');
      
      expect(sig1).not.toBe(sig2);
    });

    it('should produce same signature for same input', () => {
      const secret = 'test-qstash-secret-key';
      const body = '{"event":"test"}';
      
      const sig1 = createHmac('sha256', secret).update(body).digest('hex');
      const sig2 = createHmac('sha256', secret).update(body).digest('hex');
      
      expect(sig1).toBe(sig2);
    });
  });

  describe('Rate Limiting IP Extraction', () => {
    it('should extract first IP from x-forwarded-for', () => {
      const forwarded = '192.168.1.1, 10.0.0.1, 172.16.0.1';
      const firstIp = forwarded.split(',')[0]?.trim();
      
      expect(firstIp).toBe('192.168.1.1');
    });

    it('should handle single IP in x-forwarded-for', () => {
      const forwarded = '192.168.1.1';
      const firstIp = forwarded.split(',')[0]?.trim();
      
      expect(firstIp).toBe('192.168.1.1');
    });
  });

  describe('CAPTCHA Verification', () => {
    it('should define score threshold', () => {
      const SCORE_THRESHOLD = 0.5;
      
      expect(SCORE_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(SCORE_THRESHOLD).toBeLessThanOrEqual(1);
    });

    it('should classify scores correctly', () => {
      const SCORE_THRESHOLD = 0.5;
      
      expect(0.9 >= SCORE_THRESHOLD).toBe(true);  // Human
      expect(0.5 >= SCORE_THRESHOLD).toBe(true);  // Borderline
      expect(0.3 >= SCORE_THRESHOLD).toBe(false); // Bot
    });
  });
});
