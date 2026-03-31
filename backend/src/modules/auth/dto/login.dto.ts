import { z } from 'zod';

export const LoginDto = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export type LoginDtoType = z.infer<typeof LoginDto>;

export const RefreshTokenDto = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .min(1),
});

export type RefreshTokenDtoType = z.infer<typeof RefreshTokenDto>;

export const ForgotPasswordDto = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const ResetPasswordDto = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Must contain uppercase, lowercase and number'
    ),
});

export const ChangePasswordDto = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase and number'),
});
