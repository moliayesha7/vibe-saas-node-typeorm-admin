import { z } from 'zod';

export const CreateUserDto = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase and number'),
  role: z.enum(['admin', 'manager', 'viewer']).default('viewer'),
  tenantId: z.string().uuid().optional(),
});

export const UpdateUserDto = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  isActive: z.boolean().optional(),
});

export const UpdateProfileDto = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
});

export const UserQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  tenantId: z.string().uuid().optional(),
});

export type CreateUserDtoType = z.infer<typeof CreateUserDto>;
export type UpdateUserDtoType = z.infer<typeof UpdateUserDto>;
export type UserQueryDtoType = z.infer<typeof UserQueryDto>;
