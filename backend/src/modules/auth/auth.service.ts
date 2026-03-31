import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '@config/database';
import { UserEntity } from '@modules/users/user.entity';
import { TenantEntity } from '@modules/tenants/tenant.entity';
import { AuthRepository } from './auth.repository';
import {
  RegisterDtoType,
  LoginDtoType,
} from './dto/register.dto';
import { hashPassword, comparePassword } from '@common/utils/hash.util';
import {
  generateTokenPair,
  verifyRefreshToken,
  JwtPayload,
  TokenPair,
} from '@common/utils/jwt.util';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from '@common/errors/AppError';
import logger from '@common/utils/logger';

export interface AuthResult {
  user: Partial<UserEntity> & { tenantName?: string; tenantPlan?: string };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private authRepo: AuthRepository;

  constructor() {
    this.authRepo = new AuthRepository(AppDataSource);
  }

  async register(dto: RegisterDtoType, meta?: { ip?: string; ua?: string }): Promise<AuthResult> {
    // Check email uniqueness
    const existing = await this.authRepo.findUserByEmail(dto.email);
    if (existing) throw new ConflictError('Email already registered');

    let tenantId: string | null = null;
    let userRole: 'admin' | 'manager' | 'viewer' = 'viewer';

    await AppDataSource.transaction(async (manager) => {
      // Create tenant if tenantName provided
      if (dto.tenantName) {
        const slug =
          dto.tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-') +
          '-' +
          uuidv4().slice(0, 8);

        const tenant = manager.create(TenantEntity, {
          id: uuidv4(),
          name: dto.tenantName,
          slug,
          plan: 'free',
        });
        await manager.save(tenant);
        tenantId = tenant.id;
        userRole = 'admin'; // First user of a new tenant is admin
      } else {
        // Default tenant
        const defaultTenant = await manager.findOne(TenantEntity, {
          where: { slug: 'default' },
        });
        tenantId = defaultTenant?.id ?? null;
      }

      const passwordHash = await hashPassword(dto.password);
      const user = manager.create(UserEntity, {
        id: uuidv4(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        role: userRole,
        tenantId,
      });
      await manager.save(user);
    });

    // Fetch saved user with tenant
    const user = await this.authRepo.findUserByEmail(dto.email);
    if (!user) throw new Error('User creation failed');

    const tokens = await this._issueTokens(user, meta);

    // Non-blocking welcome email
    this._sendWelcomeEmail(user).catch((e) =>
      logger.error('Welcome email failed:', e.message)
    );

    return { ...tokens, user: this._sanitizeUser(user) };
  }

  async login(dto: LoginDtoType, meta?: { ip?: string; ua?: string }): Promise<AuthResult> {
    const user = await this.authRepo.findUserByEmail(dto.email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedError('Invalid email or password');

    await this.authRepo.updateLastLogin(user.id);
    const tokens = await this._issueTokens(user, meta);
    return { ...tokens, user: this._sanitizeUser(user) };
  }

  async refreshTokens(
    token: string,
    meta?: { ip?: string; ua?: string }
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId } = verifyRefreshToken(token);

    const stored = await this.authRepo.findRefreshToken(token);
    if (!stored || stored.isExpired) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await this.authRepo.findActiveUserById(userId);
    if (!user) throw new UnauthorizedError('User not found or inactive');

    // Rotate: revoke old, issue new
    await this.authRepo.revokeRefreshToken(token);
    return this._issueTokens(user, meta);
  }

  async logout(refreshToken?: string, userId?: string): Promise<void> {
    if (refreshToken) {
      await this.authRepo.revokeRefreshToken(refreshToken);
    } else if (userId) {
      await this.authRepo.revokeAllUserTokens(userId);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.authRepo.findUserByEmail(email);
    if (!user) return; // Silent — prevent email enumeration

    const resetToken = uuidv4();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.authRepo.saveResetToken(user.id, resetToken, expiry);

    // Non-blocking
    this._sendPasswordResetEmail(user, resetToken).catch((e) =>
      logger.error('Reset email failed:', e.message)
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.authRepo.findUserByResetToken(token);
    if (!user) throw new BadRequestError('Invalid or expired reset token');

    const passwordHash = await hashPassword(newPassword);
    await this.authRepo.updatePassword(user.id, passwordHash);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await AppDataSource.getRepository(UserEntity)
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundError('User');

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestError('Current password is incorrect');

    const passwordHash = await hashPassword(newPassword);
    await this.authRepo.updatePassword(userId, passwordHash);
  }

  async getProfile(userId: string): Promise<Partial<UserEntity>> {
    const user = await this.authRepo.findActiveUserById(userId);
    if (!user) throw new NotFoundError('User');
    return this._sanitizeUser(user);
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  private async _issueTokens(
    user: UserEntity,
    meta?: { ip?: string; ua?: string }
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    const { accessToken, refreshToken } = generateTokenPair(payload);

    // Compute expiry from JWT_REFRESH_EXPIRES_IN env (default 30d)
    const days = parseInt(
      (process.env.JWT_REFRESH_EXPIRES_IN || '30d').replace(/\D/g, '')
    );
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.authRepo.saveRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt,
      ipAddress: meta?.ip,
      userAgent: meta?.ua,
    });

    return { accessToken, refreshToken };
  }

  private _sanitizeUser(
    user: UserEntity
  ): Partial<UserEntity> & { tenantName?: string; tenantPlan?: string } {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name,
      tenantPlan: user.tenant?.plan,
      lastLogin: user.lastLogin ?? undefined,
      createdAt: user.createdAt,
    };
  }

  private async _sendWelcomeEmail(_user: UserEntity): Promise<void> {
    // Import lazily to avoid circular deps
    const { sendWelcomeEmail } = await import('../../../services/emailService');
    await sendWelcomeEmail(_user as unknown as Parameters<typeof sendWelcomeEmail>[0]);
  }

  private async _sendPasswordResetEmail(
    _user: UserEntity,
    _token: string
  ): Promise<void> {
    const { sendPasswordResetEmail } = await import('../../../services/emailService');
    await sendPasswordResetEmail(
      _user as unknown as Parameters<typeof sendPasswordResetEmail>[0],
      _token
    );
  }
}
