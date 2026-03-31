import { z } from 'zod';

export const RegisterDto = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .trim()
    .min(2, 'Min 2 characters')
    .max(50, 'Max 50 characters'),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .trim()
    .min(2, 'Min 2 characters')
    .max(50, 'Max 50 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  tenantName: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional(),
});

export type RegisterDtoType = z.infer<typeof RegisterDto>;
