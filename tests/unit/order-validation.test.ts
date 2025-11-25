import { describe, it, expect } from 'vitest';
import { validateCreateOrder } from '../../src/api/schemas/order.schema';
import { OrderType } from '../../src/types/order.types';

describe('Order Validation', () => {
  describe('validateCreateOrder', () => {
    it('should validate a valid market order', () => {
      const validOrder = {
        orderType: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10
      };

      const result = validateCreateOrder(validOrder);

      expect(result).toEqual({
        ...validOrder,
        tokenIn: 'SOL',
        tokenOut: 'USDC'
      });
    });

    it('should convert token names to uppercase', () => {
      const order = {
        orderType: OrderType.MARKET,
        tokenIn: 'sol',
        tokenOut: 'usdc',
        amountIn: 10
      };

      const result = validateCreateOrder(order);

      expect(result.tokenIn).toBe('SOL');
      expect(result.tokenOut).toBe('USDC');
    });

    it('should accept optional userId', () => {
      const order = {
        orderType: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10,
        userId: 'user123'
      };

      const result = validateCreateOrder(order);

      expect(result.userId).toBe('user123');
    });

    it('should throw error for missing orderType', () => {
      const invalidOrder = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10
      };

      expect(() => validateCreateOrder(invalidOrder)).toThrow();
    });

    it('should throw error for invalid orderType', () => {
      const invalidOrder = {
        orderType: 'invalid',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10
      };

      expect(() => validateCreateOrder(invalidOrder)).toThrow(/orderType must be one of/);
    });

    it('should throw error for missing tokenIn', () => {
      const invalidOrder = {
        orderType: OrderType.MARKET,
        tokenOut: 'USDC',
        amountIn: 10
      };

      expect(() => validateCreateOrder(invalidOrder)).toThrow();
    });

    it('should throw error for empty tokenIn', () => {
      const invalidOrder = {
        orderType: OrderType.MARKET,
        tokenIn: '',
        tokenOut: 'USDC',
        amountIn: 10
      };

      expect(() => validateCreateOrder(invalidOrder)).toThrow();
    });

    it('should throw error for missing amountIn', () => {
      const invalidOrder = {
        orderType: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC'
      };

      expect(() => validateCreateOrder(invalidOrder)).toThrow();
    });

    it('should throw error for negative amountIn', () => {
      const invalidOrder = {
        orderType: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: -10
      };

      expect(() => validateCreateOrder(invalidOrder)).toThrow(/must be a positive number/);
    });

    it('should throw error for zero amountIn', () => {
      const invalidOrder = {
        orderType: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 0
      };

      expect(() => validateCreateOrder(invalidOrder)).toThrow(/must be a positive number/);
    });

    it('should validate all order types', () => {
      const marketOrder = {
        orderType: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10
      };

      const limitOrder = {
        orderType: OrderType.LIMIT,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10
      };

      const sniperOrder = {
        orderType: OrderType.SNIPER,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10
      };

      expect(() => validateCreateOrder(marketOrder)).not.toThrow();
      expect(() => validateCreateOrder(limitOrder)).not.toThrow();
      expect(() => validateCreateOrder(sniperOrder)).not.toThrow();
    });
  });
});
