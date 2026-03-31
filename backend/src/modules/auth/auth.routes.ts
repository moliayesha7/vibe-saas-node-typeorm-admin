import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '@common/middleware/auth.middleware';
import { authRateLimiter } from '@common/middleware/rateLimiter.middleware';
import { validate } from '@common/middleware/validate.middleware';
import { RegisterDto } from './dto/register.dto';
import {
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/login.dto';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & authorization endpoints
 */

// Public routes (no auth required)
router.post('/register', authRateLimiter, validate(RegisterDto), authController.register.bind(authController));
router.post('/login', authRateLimiter, validate(LoginDto), authController.login.bind(authController));
router.post('/refresh', validate(RefreshTokenDto), authController.refreshToken.bind(authController));
router.post('/forgot-password', authRateLimiter, validate(ForgotPasswordDto), authController.forgotPassword.bind(authController));
router.post('/reset-password', validate(ResetPasswordDto), authController.resetPassword.bind(authController));

// Protected routes
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.getMe.bind(authController));
router.post('/change-password', authenticate, validate(ChangePasswordDto), authController.changePassword.bind(authController));

export default router;
