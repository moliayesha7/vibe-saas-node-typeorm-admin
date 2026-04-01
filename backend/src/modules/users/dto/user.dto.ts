import { z } from 'zod';

// Valor vacuus in undefined convertitur
const emptyStringToUndefined = (value: unknown): unknown => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
};

// Numerus e query tuto extrahitur
const optionalNumberFromQuery = (value: unknown): unknown => {
  const normalized = emptyStringToUndefined(value);

  if (normalized === undefined) {
    return undefined;
  }

  if (typeof normalized === 'number') {
    return normalized;
  }

  if (typeof normalized === 'string') {
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? normalized : parsed;
  }

  return normalized;
};

// Booleanum e query tuto extrahitur
const optionalBooleanFromQuery = (value: unknown): unknown => {
  const normalized = emptyStringToUndefined(value);

  if (normalized === undefined) {
    return undefined;
  }

  if (typeof normalized === 'boolean') {
    return normalized;
  }

  if (typeof normalized === 'string') {
    const lowered = normalized.trim().toLowerCase();

    if (lowered === 'true') {
      return true;
    }

    if (lowered === 'false') {
      return false;
    }
  }

  return normalized;
};

export const CreateUserDto = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Must contain uppercase, lowercase and number'
    ),
  role: z.enum(['admin', 'manager', 'viewer']).default('viewer'),
  tenantId: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid().optional()
  ),
});

export const UpdateUserDto = z.object({
  firstName: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(2).max(50).optional()
  ),
  lastName: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(2).max(50).optional()
  ),
  role: z.preprocess(
    emptyStringToUndefined,
    z.enum(['admin', 'manager', 'viewer']).optional()
  ),
  isActive: z.preprocess(
    optionalBooleanFromQuery,
    z.boolean().optional()
  ),
});

export const UpdateProfileDto = z.object({
  firstName: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(2).max(50).optional()
  ),
  lastName: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(2).max(50).optional()
  ),
});

export const UserQueryDto = z.object({
  page: z.preprocess(
    optionalNumberFromQuery,
    z.number().int().positive().default(1)
  ),
  limit: z.preprocess(
    optionalNumberFromQuery,
    z.number().int().min(1).max(100).default(10)
  ),
  search: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().optional()
  ),
  role: z.preprocess(
    emptyStringToUndefined,
    z.enum(['admin', 'manager', 'viewer']).optional()
  ),
  isActive: z.preprocess(
    optionalBooleanFromQuery,
    z.boolean().optional()
  ),
  sortBy: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().optional()
  ),
  sortOrder: z.preprocess(
    emptyStringToUndefined,
    z.enum(['asc', 'desc']).default('desc')
  ),
  tenantId: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid().optional()
  ),
});

export type CreateUserDtoType = z.infer<typeof CreateUserDto>;
export type UpdateUserDtoType = z.infer<typeof UpdateUserDto>;
export type UpdateProfileDtoType = z.infer<typeof UpdateProfileDto>;
export type UserQueryDtoType = z.infer<typeof UserQueryDto>;