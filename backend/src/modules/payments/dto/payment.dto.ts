import { z } from 'zod';

export const CreatePaymentDto = z.object({
  amount: z.number({ required_error: 'Amount is required' }).positive('Amount must be positive'),
  currency: z.string().default('BDT'),
  description: z.string().max(255).optional(),
});

export const PaymentQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tenantId: z.string().uuid().optional(),
});

export const RefundDto = z.object({
  reason: z.string().max(255).optional(),
});

export type CreatePaymentDtoType = z.infer<typeof CreatePaymentDto>;
export type PaymentQueryDtoType = z.infer<typeof PaymentQueryDto>;
