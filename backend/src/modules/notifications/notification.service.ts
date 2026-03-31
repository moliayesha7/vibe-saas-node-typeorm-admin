import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '@config/database';
import { NotificationRepository } from './notification.repository';
import { NotificationEntity } from './notification.entity';
import { CreateNotificationDtoType, NotificationQueryDtoType } from './dto/notification.dto';
import { buildPaginationMeta, PaginationMeta } from '@common/utils/pagination.util';
import { NotFoundError, ForbiddenError } from '@common/errors/AppError';
import { UserEntity } from '@modules/users/user.entity';
import { emitToUser } from '../../services/socketService';

export class NotificationService {
  private notificationRepo: NotificationRepository;

  constructor() {
    this.notificationRepo = new NotificationRepository(AppDataSource);
  }

  async findAll(
    requestingUser: UserEntity,
    filters: NotificationQueryDtoType
  ): Promise<{ notifications: NotificationEntity[]; pagination: PaginationMeta; unreadCount: number }> {
    const [notifications, total] = await this.notificationRepo.findAll(requestingUser.id, filters);
    const unreadCount = await this.notificationRepo.countUnread(requestingUser.id);
    return {
      notifications,
      pagination: buildPaginationMeta(total, filters.page, filters.limit),
      unreadCount,
    };
  }

  async create(dto: CreateNotificationDtoType, requestingUser: UserEntity): Promise<NotificationEntity> {
    // Only admins can create notifications for other users
    if (requestingUser.role !== 'admin' && dto.userId !== requestingUser.id) {
      throw new ForbiddenError('Access denied');
    }

    const notification = await this.notificationRepo.create({
      id: uuidv4(),
      userId: dto.userId,
      title: dto.title,
      message: dto.message ?? null,
      type: dto.type,
    });

    // Push real-time notification to target user
    emitToUser(dto.userId, 'notification:new', { notification });

    return notification;
  }

  async markAsRead(id: string, requestingUser: UserEntity): Promise<void> {
    const updated = await this.notificationRepo.markAsRead(id, requestingUser.id);
    if (!updated) throw new NotFoundError('Notification');
  }

  async markAllAsRead(requestingUser: UserEntity): Promise<{ updated: number }> {
    const updated = await this.notificationRepo.markAllAsRead(requestingUser.id);
    return { updated };
  }

  async delete(id: string, requestingUser: UserEntity): Promise<void> {
    const deleted = await this.notificationRepo.delete(id, requestingUser.id);
    if (!deleted) throw new NotFoundError('Notification');
  }

  async deleteAllRead(requestingUser: UserEntity): Promise<{ deleted: number }> {
    const deleted = await this.notificationRepo.deleteAllRead(requestingUser.id);
    return { deleted };
  }
}
