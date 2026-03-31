import { z } from 'zod';

export const CreateNotificationDto = z.object({
  userId: z.string().uuid('Invalid user ID'),
  title: z.string().min(1).max(255),
  message: z.string().max(1000).optional(),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
});

export const NotificationQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z.coerce.boolean().optional(),
});

export type CreateNotificationDtoType = z.infer<typeof CreateNotificationDto>;
export type NotificationQueryDtoType = z.infer<typeof NotificationQueryDto>;
