import { describe, it, expect, beforeEach } from 'vitest';
import { DexRouterService } from '../../src/services/dex/router.service';
import { DexType } from '../../src/types/order.types';

describe('DexRouterService', () => {
  let dexRouter: DexRouterService;

  beforeEach(() => {
    dexRouter = new DexRouterService();
  });

  describe('getBestQuote', () => {
    it('should fetch quotes from both Raydium and Meteora', async () => {
      const result = await dexRouter.getBestQuote('SOL', 'USDC', 10);

      expect(result.raydiumQuote).toBeDefined();
      expect(result.meteoraQuote).toBeDefined();
      expect(result.bestQuote).toBeDefined();

      expect(result.raydiumQuote.dex).toBe(DexType.RAYDIUM);
      expect(result.meteoraQuote.dex).toBe(DexType.METEORA);
    });

    it('should select the quote with higher amountOut', async () => {
      const result = await dexRouter.getBestQuote('SOL', 'USDC', 10);

      const maxAmountOut = Math.max(
        result.raydiumQuote.amountOut,
        result.meteoraQuote.amountOut
      );

      expect(result.bestQuote.amountOut).toBe(maxAmountOut);
    });

    it('should return valid quote structure', async () => {
      const result = await dexRouter.getBestQuote('SOL', 'USDC', 10);

      expect(result.bestQuote).toHaveProperty('dex');
      expect(result.bestQuote).toHaveProperty('price');
      expect(result.bestQuote).toHaveProperty('amountOut');
      expect(result.bestQuote).toHaveProperty('fee');
      expect(result.bestQuote).toHaveProperty('slippage');
      expect(result.bestQuote).toHaveProperty('timestamp');
    });

    it('should have different fees for Raydium and Meteora', async () => {
      const result = await dexRouter.getBestQuote('SOL', 'USDC', 10);

      // Raydium: 0.25% fee, Meteora: 0.20% fee
      expect(result.raydiumQuote.fee).toBe(0.0025);
      expect(result.meteoraQuote.fee).toBe(0.002);
    });

    it('should calculate amountOut correctly', async () => {
      const amountIn = 10;
      const result = await dexRouter.getBestQuote('SOL', 'USDC', amountIn);

      // AmountOut should be positive and reasonable
      expect(result.raydiumQuote.amountOut).toBeGreaterThan(0);
      expect(result.meteoraQuote.amountOut).toBeGreaterThan(0);

      // For SOL/USDC, amountOut should be roughly amountIn * price * (1 - fee)
      const raydiumExpected = amountIn * result.raydiumQuote.price * (1 - result.raydiumQuote.fee);
      const meteoraExpected = amountIn * result.meteoraQuote.price * (1 - result.meteoraQuote.fee);

      expect(result.raydiumQuote.amountOut).toBeCloseTo(raydiumExpected, 2);
      expect(result.meteoraQuote.amountOut).toBeCloseTo(meteoraExpected, 2);
    });
  });

  describe('executeSwap', () => {
    it('should execute swap on Raydium', async () => {
      const result = await dexRouter.executeSwap(
        DexType.RAYDIUM,
        'SOL',
        'USDC',
        10,
        900
      );

      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('executedPrice');
      expect(result).toHaveProperty('amountOut');

      expect(result.txHash).toBeTruthy();
      expect(result.txHash.length).toBe(88); // Solana tx hash length
      expect(result.executedPrice).toBeGreaterThan(0);
      expect(result.amountOut).toBeGreaterThan(0);
    });

    it('should execute swap on Meteora', async () => {
      const result = await dexRouter.executeSwap(
        DexType.METEORA,
        'SOL',
        'USDC',
        10,
        900
      );

      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('executedPrice');
      expect(result).toHaveProperty('amountOut');

      expect(result.txHash).toBeTruthy();
      expect(result.txHash.length).toBe(88);
    });

    it('should respect slippage protection', async () => {
      // Set minAmountOut very high to trigger slippage protection
      await expect(
        dexRouter.executeSwap(DexType.RAYDIUM, 'SOL', 'USDC', 10, 999999)
      ).rejects.toThrow(/slippage protection/i);
    });

    it('should throw error for unknown DEX type', async () => {
      await expect(
        dexRouter.executeSwap('unknown' as any, 'SOL', 'USDC', 10, 900)
      ).rejects.toThrow(/unknown dex type/i);
    });
  });
});
