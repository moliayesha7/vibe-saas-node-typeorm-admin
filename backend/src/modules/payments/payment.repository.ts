import { DataSource, Repository } from 'typeorm';
import { PaymentEntity } from './payment.entity';
import { PaymentQueryDtoType } from './dto/payment.dto';

export class PaymentRepository {
  private repo: Repository<PaymentEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(PaymentEntity);
  }

  async findAll(
    filters: PaymentQueryDtoType,
    tenantId?: string | null
  ): Promise<[PaymentEntity[], number]> {
    const qb = this.repo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user');

    if (tenantId) {
      qb.andWhere('payment.tenantId = :tenantId', { tenantId });
    } else if (filters.tenantId) {
      qb.andWhere('payment.tenantId = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters.status) {
      qb.andWhere('payment.status = :status', { status: filters.status });
    }
    if (filters.startDate) {
      qb.andWhere('payment.createdAt >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      qb.andWhere('payment.createdAt <= :endDate', { endDate: filters.endDate });
    }

    qb.orderBy('payment.createdAt', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    return qb.getManyAndCount();
  }

  async findById(id: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['user', 'tenant'],
    });
  }

  async findByBkashId(bkashPaymentId: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({
      where: { bkashPaymentId },
      relations: ['user'],
    });
  }

  async create(data: Partial<PaymentEntity>): Promise<PaymentEntity> {
    const payment = this.repo.create(data);
    return this.repo.save(payment);
  }

  async update(id: string, data: Partial<PaymentEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  async getStats(tenantId?: string | null): Promise<Record<string, unknown>> {
    const qb = this.repo
      .createQueryBuilder('p')
      .select("COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)", 'totalRevenue')
      .addSelect("COUNT(*) FILTER (WHERE p.status = 'completed')", 'completedCount')
      .addSelect("COUNT(*) FILTER (WHERE p.status = 'pending')", 'pendingCount')
      .addSelect("COUNT(*) FILTER (WHERE p.status = 'refunded')", 'refundedCount')
      .addSelect(
        "COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed' AND p.createdAt >= NOW() - INTERVAL '30 days'), 0)",
        'revenueThisMonth'
      )
      .addSelect(
        "COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed' AND p.createdAt >= NOW() - INTERVAL '7 days'), 0)",
        'revenueThisWeek'
      );

    if (tenantId) {
      qb.where('p.tenantId = :tenantId', { tenantId });
    }

    return qb.getRawOne();
  }
}
