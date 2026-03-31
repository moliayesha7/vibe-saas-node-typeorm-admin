import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticate } from '@common/middleware/auth.middleware';
import { requirePermission } from '@common/middleware/rbac.middleware';
import { validate } from '@common/middleware/validate.middleware';
import { paymentRateLimiter } from '@common/middleware/rateLimiter.middleware';
import { CreatePaymentDto, RefundDto } from './dto/payment.dto';

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Bkash payment processing and management
 */

const router = Router();

// Bkash callback — NO auth (called by Bkash servers)
router.get('/bkash/callback', paymentController.bkashCallback.bind(paymentController));

// All routes below require authentication
router.use(authenticate);

router.get('/', requirePermission('payments:read'), paymentController.getPayments.bind(paymentController));
router.get('/stats', requirePermission('payments:read'), paymentController.getStats.bind(paymentController));
router.post(
  '/',
  paymentRateLimiter,
  requirePermission('payments:create'),
  validate(CreatePaymentDto),
  paymentController.createPayment.bind(paymentController)
);
router.post(
  '/:id/refund',
  requirePermission('payments:refund'),
  validate(RefundDto),
  paymentController.refundPayment.bind(paymentController)
);

export default router;
