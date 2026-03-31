import { DataSource, Repository } from 'typeorm';
import { RefreshTokenEntity } from './auth.entity';
import { UserEntity } from '@modules/users/user.entity';

export class AuthRepository {
  private refreshTokenRepo: Repository<RefreshTokenEntity>;
  private userRepo: Repository<UserEntity>;

  constructor(dataSource: DataSource) {
    this.refreshTokenRepo = dataSource.getRepository(RefreshTokenEntity);
    this.userRepo = dataSource.getRepository(UserEntity);
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash') // passwordHash is select:false
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('user.email = :email AND user.isActive = true', { email })
      .getOne();
  }

  async findActiveUserById(id: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { id, isActive: true },
      relations: ['tenant'],
    });
  }

  async findUserByResetToken(token: string): Promise<UserEntity | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.resetToken')
      .addSelect('user.resetTokenExpiry')
      .where(
        'user.resetToken = :token AND user.resetTokenExpiry > NOW()',
        { token }
      )
      .getOne();
  }

  async saveRefreshToken(data: {
    token: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<RefreshTokenEntity> {
    const entity = this.refreshTokenRepo.create(data);
    return this.refreshTokenRepo.save(entity);
  }

  async findRefreshToken(token: string): Promise<RefreshTokenEntity | null> {
    return this.refreshTokenRepo.findOne({
      where: { token, isRevoked: false },
      relations: ['user'],
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepo.update({ token }, { isRevoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
  }

  async cleanExpiredTokens(): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .delete()
      .where('expires_at < NOW() OR is_revoked = true')
      .execute();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepo.update(userId, { lastLogin: new Date() });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userRepo.update(userId, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    });
    await this.revokeAllUserTokens(userId);
  }

  async saveResetToken(
    userId: string,
    token: string,
    expiry: Date
  ): Promise<void> {
    await this.userRepo.update(userId, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });
  }
}
