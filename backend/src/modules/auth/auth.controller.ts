import { Request, Response, NextFunction } from 'express';
import AuthService from './auth.service';
import { sendSuccess, sendCreated } from '@common/utils/response.util';

const authService = new AuthService();

export class AuthController {
  // Metadata ex petitione colligit
  private getRequestMeta(req: Request): {
    ipAddress?: string;
    userAgent?: string;
  } {
    const rawUserAgent = req.headers['user-agent'];

    return {
      ipAddress: req.ip,
      userAgent: Array.isArray(rawUserAgent)
        ? rawUserAgent.join(', ')
        : rawUserAgent,
    };
  }

  // Errores communes ad status rectos convertit
  private handleAuthError(
    err: unknown,
    res: Response,
    next: NextFunction
  ): void {
    if (!(err instanceof Error)) {
      next(err);
      return;
    }

    const unauthorizedMessages = new Set([
      'Invalid email or password',
      'Invalid refresh token',
      'Refresh token not found or revoked',
      'User not found or inactive',
      'Access token is required',
      'Current password is incorrect',
      'Unauthorized',
    ]);

    const badRequestMessages = new Set([
      'Refresh token is required',
      'Reset token is required',
      'Password must be at least 6 characters long',
      'Email is required',
      'Password is required',
      'Token is required',
      'First name is required',
      'Current password is required',
      'User ID is required',
    ]);

    const conflictMessages = new Set([
      'Email is already registered',
    ]);

    const notFoundMessages = new Set([
      'User not found',
      'Tenant not found or inactive',
    ]);

    if (unauthorizedMessages.has(err.message)) {
      res.status(401).json({
        success: false,
        message: err.message,
      });
      return;
    }

    if (badRequestMessages.has(err.message)) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
      return;
    }

    if (conflictMessages.has(err.message)) {
      res.status(409).json({
        success: false,
        message: err.message,
      });
      return;
    }

    if (notFoundMessages.has(err.message)) {
      res.status(404).json({
        success: false,
        message: err.message,
      });
      return;
    }

    if (err.message === 'Invalid or expired reset token') {
      res.status(400).json({
        success: false,
        message: err.message,
      });
      return;
    }

    next(err);
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(
        req.body,
        this.getRequestMeta(req)
      );

      sendCreated(res, result, 'Registration successful');
    } catch (err) {
      this.handleAuthError(err, res, next);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body ?? {};

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
        });
        return;
      }

      if (!password) {
        res.status(400).json({
          success: false,
          message: 'Password is required',
        });
        return;
      }

      const result = await authService.login(
        email,
        password,
        this.getRequestMeta(req)
      );

      sendSuccess(res, result, 'Login successful');
    } catch (err) {
      this.handleAuthError(err, res, next);
    }
  }

  async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { refreshToken } = req.body ?? {};

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
        return;
      }

      const tokens = await authService.refreshAccessToken(
        refreshToken,
        this.getRequestMeta(req)
      );

      sendSuccess(res, tokens, 'Tokens refreshed');
    } catch (err) {
      this.handleAuthError(err, res, next);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body ?? {};

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
        return;
      }

      await authService.logout(refreshToken);
      sendSuccess(res, undefined, 'Logged out successfully');
    } catch (err) {
      this.handleAuthError(err, res, next);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const profile = await authService.getProfile(req.user.id);
      sendSuccess(res, profile, 'Profile fetched successfully');
    } catch (err) {
      this.handleAuthError(err, res, next);
    }
  }

  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body ?? {};

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
        });
        return;
      }

      await authService.forgotPassword(email);

      sendSuccess(
        res,
        undefined,
        'If an account with that email exists, a reset link has been generated.'
      );
    } catch (err) {
      this.handleAuthError(err, res, next);
    }
  }

  async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token, password } = req.body ?? {};

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Reset token is required',
        });
        return;
      }

      if (!password) {
        res.status(400).json({
          success: false,
          message: 'Password is required',
        });
        return;
      }

      const result = await authService.resetPassword(token, password);

      sendSuccess(
        res,
        result,
        result.message || 'Password reset successfully'
      );
    } catch (err) {
      this.handleAuthError(err, res, next);
    }
  }

  async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { currentPassword, newPassword } = req.body ?? {};

      if (!currentPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password is required',
        });
        return;
      }

      if (!newPassword) {
        res.status(400).json({
          success: false,
          message: 'Password is required',
        });
        return;
      }

      const result = await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      sendSuccess(
        res,
        result,
        result.message || 'Password changed successfully'
      );
    } catch (err) {
      this.handleAuthError(err, res, next);
    }
  }
}

export const authController = new AuthController();