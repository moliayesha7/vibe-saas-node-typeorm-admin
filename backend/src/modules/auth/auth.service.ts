import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';

import { AppDataSource } from '@config/database';
import logger from '@common/utils/logger';
import { AuthRepository } from './auth.repository';
import { UserEntity } from '@modules/users/user.entity';
import { TenantEntity, TenantPlan } from '@modules/tenants/tenant.entity';

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

type RegisterPayload = {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  tenantName?: string;
  tenantSlug?: string;
  tenantId?: string;
  plan?: TenantPlan;
};

export class AuthService {
  private authRepository: AuthRepository;
  private userRepo: Repository<UserEntity>;
  private tenantRepo: Repository<TenantEntity>;

  constructor(private readonly dataSource: DataSource = AppDataSource) {
    // Repositoria e fonte datorum construuntur
    this.authRepository = new AuthRepository(this.dataSource);
    this.userRepo = this.dataSource.getRepository(UserEntity);
    this.tenantRepo = this.dataSource.getRepository(TenantEntity);
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

  // Email in formam constantem redigit
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  // Nomen plenum ex partibus componit
  private buildFullName(user: Partial<UserEntity>): string | null {
    const firstName = ((user as any).firstName || '').trim();
    const lastName = ((user as any).lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || null;
  }

  // Slug e nomine format
  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  // Slug unicum quaerit
  private async ensureUniqueTenantSlug(baseSlug: string): Promise<string> {
    const initialSlug = this.slugify(baseSlug) || `tenant-${Date.now()}`;
    let slug = initialSlug;
    let counter = 1;

    while (await this.tenantRepo.findOne({ where: { slug } })) {
      slug = `${initialSlug}-${counter}`;
      counter += 1;
    }

    return slug;
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
      tenantId: (user as any).tenant?.id ?? (user as any).tenantId ?? null,
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
      fullName: this.buildFullName(user),
      role: user.role ?? null,
      tenantId: (user as any).tenant?.id ?? (user as any).tenantId ?? null,
    };
  }

  // Usorem cum tessera secreto accipit
  private async findUserByIdWithPassword(
    userId: string
  ): Promise<UserEntity | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('user.id = :userId AND user.isActive = true', { userId })
      .getOne();
  }

  // Responsionem authenticationis format
  private async buildAuthResponse(
    user: UserEntity,
    meta: LoginMeta = {}
  ): Promise<LoginResponse> {
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

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  // Register novum usorem et tenantem si opus est
  async register(
    payload: RegisterPayload,
    meta: LoginMeta = {}
  ): Promise<LoginResponse> {
    const firstName = payload.firstName?.trim();
    const lastName = payload.lastName?.trim() || '';
    const email = this.normalizeEmail(payload.email || '');
    const password = payload.password || '';

    if (!firstName) {
      throw new Error('First name is required');
    }

    if (!email) {
      throw new Error('Email is required');
    }

    if (!password) {
      throw new Error('Password is required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const existingUser = await this.userRepo.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Email is already registered');
    }

    let tenant: TenantEntity | null = null;

    if (payload.tenantId) {
      tenant = await this.tenantRepo.findOne({
        where: { id: payload.tenantId },
      });

      if (!tenant || !tenant.isActive) {
        throw new Error('Tenant not found or inactive');
      }
    } else {
      const fallbackTenantName = payload.tenantName?.trim() || `${firstName}'s Workspace`;
      const uniqueSlug = await this.ensureUniqueTenantSlug(
        payload.tenantSlug?.trim() || fallbackTenantName
      );

      tenant = this.tenantRepo.create({
        name: fallbackTenantName,
        slug: uniqueSlug,
        plan: payload.plan || 'free',
        isActive: true,
        settings: {},
      });

      tenant = await this.tenantRepo.save(tenant);
      logger.info(`Tenant created during registration: ${tenant.slug}`);
    }

    const passwordHash = await this.hashPassword(password);

    const createdUser = this.userRepo.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role: 'admin' as any,
      isActive: true,
      tenantId: tenant.id,
    });

    await this.userRepo.save(createdUser);

    const freshUser = await this.userRepo.findOne({
      where: { id: createdUser.id },
      relations: ['tenant'],
    });

    if (!freshUser) {
      throw new Error('Failed to load newly created user');
    }

    logger.info(`User registered: ${freshUser.email}`);

    return this.buildAuthResponse(freshUser, meta);
  }

  // Login principalis
  async login(
    email: string,
    password: string,
    meta: LoginMeta = {}
  ): Promise<LoginResponse> {
    const normalizedEmail = this.normalizeEmail(email || '');
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const passwordHash = (user as any).passwordHash;
    const isPasswordValid = await this.comparePassword(password, passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    logger.info(`User logged in: ${user.email}`);

    return this.buildAuthResponse(user, meta);
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
    } catch {
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
  async forgotPassword(
    email: string
  ): Promise<{ message: string; resetToken?: string }> {
    const normalizedEmail = this.normalizeEmail(email || '');
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

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
    logger.info(`Password reset token generated for ${normalizedEmail}`);

    return {
      message: 'If that email exists, a reset link has been generated',
      resetToken,
    };
  }

  // Confirmat novam clavem secretam
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
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

  // Clavem mutat post verificationem veteris
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!currentPassword) {
      throw new Error('Current password is required');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const user = await this.findUserByIdWithPassword(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const isCurrentPasswordValid = await this.comparePassword(
      currentPassword,
      (user as any).passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.authRepository.updatePassword(user.id, passwordHash);

    logger.info(`Password changed successfully for userId=${user.id}`);

    return {
      message: 'Password changed successfully',
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