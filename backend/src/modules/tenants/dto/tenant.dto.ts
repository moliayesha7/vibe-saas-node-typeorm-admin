import { z } from 'zod';

export const CreateTenantDto = z.object({
  name: z.string().trim().min(2).max(100),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).default('free'),
  settings: z.record(z.unknown()).optional().default({}),
});

export const UpdateTenantDto = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const TenantQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateTenantDtoType = z.infer<typeof CreateTenantDto>;
export type UpdateTenantDtoType = z.infer<typeof UpdateTenantDto>;
export type TenantQueryDtoType = z.infer<typeof TenantQueryDto>;
