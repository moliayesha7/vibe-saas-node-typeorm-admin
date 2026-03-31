import { DataSource, Repository } from 'typeorm';
import { NotificationEntity } from './notification.entity';
import { NotificationQueryDtoType } from './dto/notification.dto';

export class NotificationRepository {
  private repo: Repository<NotificationEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(NotificationEntity);
  }

  async findAll(
    userId: string,
    filters: NotificationQueryDtoType
  ): Promise<[NotificationEntity[], number]> {
    const qb = this.repo
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (filters.isRead !== undefined) {
      qb.andWhere('notification.isRead = :isRead', { isRead: filters.isRead });
    }

    const offset = (filters.page - 1) * filters.limit;
    qb.skip(offset).take(filters.limit);

    return qb.getManyAndCount();
  }

  async findById(id: string, userId: string): Promise<NotificationEntity | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async create(data: Partial<NotificationEntity>): Promise<NotificationEntity> {
    const notification = this.repo.create(data);
    return this.repo.save(notification);
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.update({ id, userId }, { isRead: true });
    return (result.affected ?? 0) > 0;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.repo.update(
      { userId, isRead: false },
      { isRead: true }
    );
    return result.affected ?? 0;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  async deleteAllRead(userId: string): Promise<number> {
    const result = await this.repo.delete({ userId, isRead: true });
    return result.affected ?? 0;
  }

  async countUnread(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }
}
