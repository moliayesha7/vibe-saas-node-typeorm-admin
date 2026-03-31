import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '@config/database';
import { UserRepository } from './user.repository';
import { UserEntity } from './user.entity';
import {
  CreateUserDtoType,
  UpdateUserDtoType,
  UserQueryDtoType,
} from './dto/user.dto';
import { hashPassword } from '@common/utils/hash.util';
import { buildPaginationMeta, PaginationMeta } from '@common/utils/pagination.util';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '@common/errors/AppError';

export class UserService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository(AppDataSource);
  }

  async findAll(
    filters: UserQueryDtoType,
    requestingUser: UserEntity
  ): Promise<{ users: UserEntity[]; pagination: PaginationMeta }> {
    const [users, total] = await this.userRepo.findAll(
      filters,
      requestingUser.role,
      requestingUser.tenantId
    );
    return {
      users,
      pagination: buildPaginationMeta(total, filters.page, filters.limit),
    };
  }

  async findById(id: string, requestingUser: UserEntity): Promise<UserEntity> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User');

    // Tenant isolation
    if (
      requestingUser.role !== 'admin' &&
      user.tenantId !== requestingUser.tenantId
    ) {
      throw new ForbiddenError('Access denied');
    }
    return user;
  }

  async create(dto: CreateUserDtoType, requestingUser: UserEntity): Promise<UserEntity> {
    const exists = await this.userRepo.findByEmail(dto.email);
    if (exists) throw new ConflictError('Email already exists');

    // Non-admins are confined to their own tenant
    const tenantId =
      requestingUser.role === 'admin'
        ? dto.tenantId ?? requestingUser.tenantId
        : requestingUser.tenantId;

    // Non-admins cannot create admin users
    const role =
      requestingUser.role !== 'admin' && dto.role === 'admin'
        ? 'manager'
        : dto.role;

    const passwordHash = await hashPassword(dto.password);
    return this.userRepo.create({
      id: uuidv4(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash,
      role,
      tenantId,
    });
  }

  async update(
    id: string,
    dto: UpdateUserDtoType,
    requestingUser: UserEntity
  ): Promise<UserEntity> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User');

    if (
      requestingUser.role !== 'admin' &&
      user.tenantId !== requestingUser.tenantId
    ) {
      throw new ForbiddenError('Access denied');
    }

    if (requestingUser.role === 'manager' && dto.role === 'admin') {
      throw new ForbiddenError('Managers cannot assign the admin role');
    }

    const updated = await this.userRepo.update(id, {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.role && { role: dto.role }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    if (!updated) throw new NotFoundError('User');
    return updated;
  }

  async softDelete(id: string, requestingUser: UserEntity): Promise<void> {
    if (id === requestingUser.id) {
      throw new BadRequestError('You cannot deactivate your own account');
    }
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User');
    await this.userRepo.softDelete(id);
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<UserEntity> {
    const updated = await this.userRepo.update(userId, data);
    if (!updated) throw new NotFoundError('User');
    return updated;
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    await this.userRepo.updateAvatar(userId, avatarUrl);
  }
}
