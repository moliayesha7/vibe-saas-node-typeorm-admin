import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { UserEntity } from './user.entity';
import { UserQueryDtoType } from './dto/user.dto';

export class UserRepository {
  private repo: Repository<UserEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(UserEntity);
  }

  private baseQuery(): SelectQueryBuilder<UserEntity> {
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.tenant', 'tenant');
  }

  async findAll(filters: UserQueryDtoType, requestingUserRole: string, requestingTenantId: string | null): Promise<[UserEntity[], number]> {
    const qb = this.baseQuery();

    // Tenant isolation: non-admins only see their own tenant
    if (requestingUserRole !== 'admin') {
      qb.andWhere('user.tenantId = :tenantId', { tenantId: requestingTenantId });
    } else if (filters.tenantId) {
      qb.andWhere('user.tenantId = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters.search) {
      qb.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.role) {
      qb.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    const allowedSort = ['createdAt', 'email', 'firstName', 'lastName', 'role', 'lastLogin'];
    const sortField = allowedSort.includes(filters.sortBy ?? '')
      ? `user.${filters.sortBy}`
      : 'user.createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    qb.orderBy(sortField, sortOrder)
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    return qb.getManyAndCount();
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.baseQuery().where('user.id = :id', { id }).getOne();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email } });
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { isActive: false });
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<void> {
    await this.repo.update(id, { avatarUrl });
  }
}
