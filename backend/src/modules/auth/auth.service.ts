import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DataSource } from 'typeorm';

import { AppDataSource } from '@config/database';
import logger from '@common/utils/logger';
import { AuthRepository } from './auth.repository';
import { UserEntity } from '@modules/users/user.entity';

type JwtPayload = {
  userId: string;
  tenantId?: string | null;
  role?: string | null;
};

type LoginMeta = {
  ipAddress?: string;
  userAgent?: string;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type LoginResponse = AuthTokens & {
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    role?: string | null;
    tenantId?: string | null;
  };
};

export class AuthService {
  private authRepository: AuthRepository;

  constructor(private readonly dataSource: DataSource = AppDataSource) {
    // DataSource explicite traditur ut repository non frangatur
    this.authRepository = new AuthRepository(this.dataSource);
  }

  // Secretum accessus accipit
  private getAccessTokenSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

  // Secretum refresh accipit
  private getRefreshTokenSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET or JWT_SECRET is not configured');
    }
    return secret;
  }

  // Tempus vitae accessus accipit
  private getAccessTokenExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '15m';
  }

  // Tempus vitae refresh accipit
  private getRefreshTokenExpiresIn(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  // Diem expirationis ex intervallo componit
  private calculateRefreshExpiry(): Date {
    const raw = this.getRefreshTokenExpiresIn().trim();
    const now = new Date();

    // Forma minutorum
    if (/^\d+$/.test(raw)) {
      const seconds = parseInt(raw, 10);
      return new Date(now.getTime() + seconds * 1000);
    }

    // Forma simplicis unitatis
    const match = raw.match(/^(\d+)([smhd])$/i);
    if (!match) {
      // Si forma aliena est, ad septem dies revertimur
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(now.getTime() + value * multipliers[unit]);
  }

  // Payload JWT ex usore format
  private buildJwtPayload(user: UserEntity): JwtPayload {
    return {
      userId: user.id,
      tenantId: user.tenant?.id ?? null,
      role: user.role ?? null,
    };
  }

  // Access token generat
  private generateAccessToken(user: UserEntity): string {
    const payload = this.buildJwtPayload(user);

    const options: SignOptions = {
      expiresIn: this.getAccessTokenExpiresIn() as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, this.getAccessTokenSecret(), options);
  }

  // Refresh token generat
  private generateRefreshToken(user: UserEntity): string {
    const payload = this.buildJwtPayload(user);

    const options: SignOptions = {
      expiresIn: this.getRefreshTokenExpiresIn() as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, this.getRefreshTokenSecret(), options);
  }

  // Comparat verbum secretum
  private async comparePassword(
    plainPassword: string,
    passwordHash?: string | null
  ): Promise<boolean> {
    if (!passwordHash) {
      return false;
    }
    return bcrypt.compare(plainPassword, passwordHash);
  }

  // Hash novum conficit
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    return bcrypt.hash(password, saltRounds);
  }

  // Structuram usoris tutam reddit
  private sanitizeUser(user: UserEntity) {
    return {
      id: user.id,
      email: user.email,
      fullName: (user as any).fullName ?? null,
      role: user.role ?? null,
      tenantId: user.tenant?.id ?? null,
    };
  }

  // Login principalis
  async login(
    email: string,
    password: string,
    meta: LoginMeta = {}
  ): Promise<LoginResponse> {
    const user = await this.authRepository.findUserByEmail(email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const passwordHash = (user as any).passwordHash;
    const isPasswordValid = await this.comparePassword(password, passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const expiresAt = this.calculateRefreshExpiry();

    await this.authRepository.saveRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await this.authRepository.updateLastLogin(user.id);

    logger.info(`User logged in: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  // Refresh token renovat
  async refreshAccessToken(
    refreshToken: string,
    meta: LoginMeta = {}
  ): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(
        refreshToken,
        this.getRefreshTokenSecret()
      ) as JwtPayload;
    } catch (error) {
      logger.warn('Invalid refresh token signature');
      throw new Error('Invalid refresh token');
    }

    const storedToken = await this.authRepository.findRefreshToken(refreshToken);

    if (!storedToken) {
      throw new Error('Refresh token not found or revoked');
    }

    const user = await this.authRepository.findActiveUserById(decoded.userId);

    if (!user) {
      throw new Error('User not found or inactive');
    }

    // Vetus token revocatur
    await this.authRepository.revokeRefreshToken(refreshToken);

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);
    const expiresAt = this.calculateRefreshExpiry();

    await this.authRepository.saveRefreshToken({
      token: newRefreshToken,
      userId: user.id,
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // Logout unius sessionis
  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    await this.authRepository.revokeRefreshToken(refreshToken);
  }

  // Logout omnium sessionum
  async logoutAll(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    await this.authRepository.revokeAllUserTokens(userId);
  }

  // Profilum usoris accipit
  async getProfile(userId: string): Promise<UserEntity> {
    const user = await this.authRepository.findActiveUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Initiat processum reset password
  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const user = await this.authRepository.findUserByEmail(email);

    // Responsio neutra servatur ut enumeratio vitetur
    if (!user) {
      return {
        message: 'If that email exists, a reset link has been generated',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await this.authRepository.saveResetToken(user.id, resetToken, expiry);

    // Hic solet email mitti; nunc tantum loggamus
    logger.info(`Password reset token generated for ${email}`);

    return {
      message: 'If that email exists, a reset link has been generated',
      resetToken,
    };
  }

  // Confirmat novam clavem secretam
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token) {
      throw new Error('Reset token is required');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const user = await this.authRepository.findUserByResetToken(token);

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.authRepository.updatePassword(user.id, passwordHash);

    logger.info(`Password reset successful for userId=${user.id}`);

    return {
      message: 'Password updated successfully',
    };
  }

  // Mundat tokenes veteres
  async cleanExpiredRefreshTokens(): Promise<void> {
    await this.authRepository.cleanExpiredTokens();
  }

  // Utilitas ad validationem tokenis accessus
  verifyAccessToken(token: string): JwtPayload {
    if (!token) {
      throw new Error('Access token is required');
    }

    return jwt.verify(token, this.getAccessTokenSecret()) as JwtPayload;
  }
}

export default AuthService;