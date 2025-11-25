import { z } from 'zod';
import { OrderType } from '../../types/order.types';

/**
 * Schema for creating a new order
 */
export const createOrderSchema = z.object({
  orderType: z.nativeEnum(OrderType, {
    errorMap: () => ({ message: 'orderType must be one of: market, limit, sniper' })
  }),
  tokenIn: z.string().min(1, 'tokenIn is required').toUpperCase(),
  tokenOut: z.string().min(1, 'tokenOut is required').toUpperCase(),
  amountIn: z.number().positive('amountIn must be a positive number'),
  userId: z.string().optional()
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;

/**
 * Schema for order ID parameter
 */
export const orderIdParamSchema = z.object({
  orderId: z.string().min(1, 'orderId is required')
});

/**
 * Validation helper
 */
export function validateCreateOrder(data: unknown): CreateOrderDTO {
  return createOrderSchema.parse(data);
}
