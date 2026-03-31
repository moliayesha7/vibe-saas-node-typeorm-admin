import { DataSource, Repository } from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { TenantQueryDtoType } from './dto/tenant.dto';

export class TenantRepository {
  private repo: Repository<TenantEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(TenantEntity);
  }

  async findAll(filters: TenantQueryDtoType): Promise<[TenantEntity[], number]> {
    const qb = this.repo
      .createQueryBuilder('tenant')
      .loadRelationCountAndMap('tenant.userCount', 'tenant.users', 'users', (qb) =>
        qb.andWhere('users.isActive = true')
      );

    if (filters.search) {
      qb.andWhere('(tenant.name ILIKE :s OR tenant.slug ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }
    if (filters.plan) {
      qb.andWhere('tenant.plan = :plan', { plan: filters.plan });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('tenant.isActive = :isActive', { isActive: filters.isActive });
    }

    qb.orderBy('tenant.createdAt', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    return qb.getManyAndCount();
  }

  async findById(id: string): Promise<TenantEntity | null> {
    return this.repo
      .createQueryBuilder('tenant')
      .loadRelationCountAndMap('tenant.userCount', 'tenant.users', 'users', (qb) =>
        qb.andWhere('users.isActive = true')
      )
      .where('tenant.id = :id', { id })
      .getOne();
  }

  async findBySlug(slug: string): Promise<TenantEntity | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async create(data: Partial<TenantEntity>): Promise<TenantEntity> {
    const tenant = this.repo.create(data);
    return this.repo.save(tenant);
  }

  async update(id: string, data: Partial<TenantEntity>): Promise<TenantEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { isActive: false });
  }

  async getStats(id: string): Promise<Record<string, unknown>> {
    const result = await this.repo
      .createQueryBuilder('tenant')
      .leftJoin('tenant.users', 'users')
      .leftJoin('tenant.payments', 'payments')
      .select('COUNT(DISTINCT users.id) FILTER (WHERE users.isActive = true)', 'activeUsers')
      .addSelect('COUNT(DISTINCT payments.id) FILTER (WHERE payments.status = \'completed\')', 'completedPayments')
      .addSelect('COALESCE(SUM(payments.amount) FILTER (WHERE payments.status = \'completed\'), 0)', 'totalRevenue')
      .where('tenant.id = :id', { id })
      .getRawOne();

    return result;
  }
}
