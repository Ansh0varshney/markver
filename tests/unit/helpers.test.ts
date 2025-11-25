import { describe, it, expect } from 'vitest';
import {
  sleep,
  generateOrderId,
  generateMockTxHash,
  calculateExponentialBackoff,
  formatPrice
} from '../../src/utils/helpers';

describe('Helpers', () => {
  describe('sleep', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(95); // Allow small variance
    });
  });

  describe('generateOrderId', () => {
    it('should generate unique order IDs', () => {
      const id1 = generateOrderId();
      const id2 = generateOrderId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^order_\d+_[a-z0-9]+$/);
    });

    it('should start with "order_" prefix', () => {
      const id = generateOrderId();
      expect(id).toMatch(/^order_/);
    });
  });

  describe('generateMockTxHash', () => {
    it('should generate 88 character transaction hash', () => {
      const txHash = generateMockTxHash();
      expect(txHash).toHaveLength(88);
    });

    it('should generate unique transaction hashes', () => {
      const hash1 = generateMockTxHash();
      const hash2 = generateMockTxHash();

      expect(hash1).not.toBe(hash2);
    });

    it('should only contain valid base58 characters', () => {
      const txHash = generateMockTxHash();
      // Base58 excludes: 0, O, I, l
      expect(txHash).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    });
  });

  describe('calculateExponentialBackoff', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(calculateExponentialBackoff(0)).toBe(1000);
      expect(calculateExponentialBackoff(1)).toBe(2000);
      expect(calculateExponentialBackoff(2)).toBe(4000);
      expect(calculateExponentialBackoff(3)).toBe(8000);
    });

    it('should cap at maximum delay', () => {
      const maxDelay = calculateExponentialBackoff(10);
      expect(maxDelay).toBeLessThanOrEqual(10000);
    });

    it('should use custom base delay', () => {
      expect(calculateExponentialBackoff(0, 500)).toBe(500);
      expect(calculateExponentialBackoff(1, 500)).toBe(1000);
    });
  });

  describe('formatPrice', () => {
    it('should format price to 6 decimal places', () => {
      expect(formatPrice(100.123456789)).toBe('100.123457');
      expect(formatPrice(0.000001234)).toBe('0.000001');
    });

    it('should handle whole numbers', () => {
      expect(formatPrice(100)).toBe('100.000000');
    });
  });
});
