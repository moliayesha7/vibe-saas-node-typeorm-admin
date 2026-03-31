import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification.dto';
import { sendSuccess, sendPaginated } from '@common/utils/response.util';

const notificationService = new NotificationService();

export class NotificationController {
  /**
   * @swagger
   * /api/notifications:
   *   get:
   *     tags: [Notifications]
   *     summary: Get current user's notifications
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *       - in: query
   *         name: isRead
   *         schema: { type: boolean }
   *     responses:
   *       200:
   *         description: Paginated notifications with unread count
   */
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = NotificationQueryDto.parse(req.query);
      const { notifications, pagination, unreadCount } = await notificationService.findAll(req.user!, filters);
      sendSuccess(res, { notifications, unreadCount }, 'Success', 200, pagination);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/notifications:
   *   post:
   *     tags: [Notifications]
   *     summary: Create a notification (admin can target any user)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateNotificationRequest'
   *     responses:
   *       200:
   *         description: Notification created and pushed via Socket.io
   */
  async createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await notificationService.create(req.body, req.user!);
      sendSuccess(res, notification, 'Notification created');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/notifications/{id}/read:
   *   patch:
   *     tags: [Notifications]
   *     summary: Mark a notification as read
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Marked as read
   *       404:
   *         description: Notification not found
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAsRead(req.params.id, req.user!);
      sendSuccess(res, undefined, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/notifications/read-all:
   *   patch:
   *     tags: [Notifications]
   *     summary: Mark all notifications as read
   *     responses:
   *       200:
   *         description: All notifications marked as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAllAsRead(req.user!);
      sendSuccess(res, result, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/notifications/{id}:
   *   delete:
   *     tags: [Notifications]
   *     summary: Delete a notification
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Notification deleted
   *       404:
   *         description: Notification not found
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.delete(req.params.id, req.user!);
      sendSuccess(res, undefined, 'Notification deleted');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/notifications/read:
   *   delete:
   *     tags: [Notifications]
   *     summary: Delete all read notifications
   *     responses:
   *       200:
   *         description: Read notifications cleared
   */
  async deleteAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.deleteAllRead(req.user!);
      sendSuccess(res, result, 'Read notifications cleared');
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
