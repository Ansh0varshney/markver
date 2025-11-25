import { DexQuote, DexType } from '../../types/order.types';
import { RaydiumService } from './raydium.service';
import { MeteoraService } from './meteora.service';
import { Logger } from '../../utils/logger';

const logger = new Logger('DexRouterService');

export class DexRouterService {
  private raydiumService: RaydiumService;
  private meteoraService: MeteoraService;

  constructor() {
    this.raydiumService = new RaydiumService();
    this.meteoraService = new MeteoraService();
  }

  /**
   * Get quotes from both DEXs and select the best one
   * Returns the best quote based on amountOut (user receives more tokens)
   */
  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<{
    bestQuote: DexQuote;
    raydiumQuote: DexQuote;
    meteoraQuote: DexQuote;
  }> {
    logger.info('Fetching quotes from all DEXs', { tokenIn, tokenOut, amountIn });

    // Fetch quotes from both DEXs in parallel
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.raydiumService.getQuote(tokenIn, tokenOut, amountIn),
      this.meteoraService.getQuote(tokenIn, tokenOut, amountIn)
    ]);

    // Select the best quote (highest amountOut means better deal for user)
    const bestQuote = raydiumQuote.amountOut > meteoraQuote.amountOut
      ? raydiumQuote
      : meteoraQuote;

    const priceDifference = Math.abs(raydiumQuote.amountOut - meteoraQuote.amountOut);
    const percentageDiff = (priceDifference / Math.max(raydiumQuote.amountOut, meteoraQuote.amountOut)) * 100;

    logger.info('DEX routing decision made', {
      selectedDex: bestQuote.dex,
      raydiumAmountOut: raydiumQuote.amountOut,
      meteoraAmountOut: meteoraQuote.amountOut,
      priceDifferencePercent: percentageDiff.toFixed(2) + '%',
      savings: priceDifference.toFixed(6)
    });

    return {
      bestQuote,
      raydiumQuote,
      meteoraQuote
    };
  }

  /**
   * Execute swap on the selected DEX
   */
  async executeSwap(
    dex: DexType,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    minAmountOut: number
  ): Promise<{ txHash: string; executedPrice: number; amountOut: number }> {
    logger.info('Executing swap on selected DEX', { dex, tokenIn, tokenOut, amountIn });

    if (dex === DexType.RAYDIUM) {
      return this.raydiumService.executeSwap(tokenIn, tokenOut, amountIn, minAmountOut);
    } else if (dex === DexType.METEORA) {
      return this.meteoraService.executeSwap(tokenIn, tokenOut, amountIn, minAmountOut);
    }

    throw new Error(`Unknown DEX type: ${dex}`);
  }
}
