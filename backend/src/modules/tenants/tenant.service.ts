import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '@config/database';
import { TenantRepository } from './tenant.repository';
import { TenantEntity } from './tenant.entity';
import { CreateTenantDtoType, UpdateTenantDtoType, TenantQueryDtoType } from './dto/tenant.dto';
import { buildPaginationMeta, PaginationMeta } from '@common/utils/pagination.util';
import { NotFoundError, ForbiddenError } from '@common/errors/AppError';
import { UserEntity } from '@modules/users/user.entity';

export class TenantService {
  private tenantRepo: TenantRepository;

  constructor() {
    this.tenantRepo = new TenantRepository(AppDataSource);
  }

  async findAll(
    filters: TenantQueryDtoType
  ): Promise<{ tenants: TenantEntity[]; pagination: PaginationMeta }> {
    const [tenants, total] = await this.tenantRepo.findAll(filters);
    return { tenants, pagination: buildPaginationMeta(total, filters.page, filters.limit) };
  }

  async findById(id: string, requestingUser: UserEntity): Promise<TenantEntity> {
    if (requestingUser.role !== 'admin' && requestingUser.tenantId !== id) {
      throw new ForbiddenError('Access denied');
    }
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) throw new NotFoundError('Tenant');
    return tenant;
  }

  async create(dto: CreateTenantDtoType): Promise<TenantEntity> {
    const slug =
      dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-') +
      '-' +
      uuidv4().slice(0, 8);

    return this.tenantRepo.create({
      id: uuidv4(),
      name: dto.name,
      slug,
      plan: dto.plan,
      settings: dto.settings ?? {},
    });
  }

  async update(
    id: string,
    dto: UpdateTenantDtoType,
    requestingUser: UserEntity
  ): Promise<TenantEntity> {
    if (requestingUser.role !== 'admin' && requestingUser.tenantId !== id) {
      throw new ForbiddenError('Access denied');
    }
    const updated = await this.tenantRepo.update(id, dto);
    if (!updated) throw new NotFoundError('Tenant');
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) throw new NotFoundError('Tenant');
    await this.tenantRepo.softDelete(id);
    // Deactivate all users in tenant
    await AppDataSource.getRepository(UserEntity).update(
      { tenantId: id },
      { isActive: false }
    );
  }

  async getStats(id: string, requestingUser: UserEntity): Promise<Record<string, unknown>> {
    if (requestingUser.role !== 'admin' && requestingUser.tenantId !== id) {
      throw new ForbiddenError('Access denied');
    }
    return this.tenantRepo.getStats(id);
  }
}
