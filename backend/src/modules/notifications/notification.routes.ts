import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticate } from '@common/middleware/auth.middleware';
import { validate } from '@common/middleware/validate.middleware';
import { CreateNotificationDto } from './dto/notification.dto';

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notifications with real-time Socket.io delivery
 */

const router = Router();
router.use(authenticate);

router.get('/', notificationController.getNotifications.bind(notificationController));
router.post('/', validate(CreateNotificationDto), notificationController.createNotification.bind(notificationController));
router.patch('/read-all', notificationController.markAllAsRead.bind(notificationController));
router.patch('/:id/read', notificationController.markAsRead.bind(notificationController));
router.delete('/read', notificationController.deleteAllRead.bind(notificationController));
router.delete('/:id', notificationController.deleteNotification.bind(notificationController));

export default router;
