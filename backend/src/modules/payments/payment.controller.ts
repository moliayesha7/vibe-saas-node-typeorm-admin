import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { PaymentQueryDto } from './dto/payment.dto';
import { sendSuccess, sendPaginated } from '@common/utils/response.util';

const paymentService = new PaymentService();

export class PaymentController {
  /**
   * @swagger
   * /api/payments:
   *   get:
   *     tags: [Payments]
   *     summary: List payments with filters and pagination
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [pending, completed, failed, refunded, cancelled] }
   *       - in: query
   *         name: startDate
   *         schema: { type: string, format: date }
   *       - in: query
   *         name: endDate
   *         schema: { type: string, format: date }
   *     responses:
   *       200:
   *         description: Paginated payments
   */
  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = PaymentQueryDto.parse(req.query);
      const { payments, pagination } = await paymentService.findAll(filters, req.user!);
      sendPaginated(res, payments, pagination);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/payments/stats:
   *   get:
   *     tags: [Payments]
   *     summary: Get payment statistics
   *     responses:
   *       200:
   *         description: Revenue stats, counts by status, weekly/monthly revenue
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await paymentService.getStats(req.user!);
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/payments:
   *   post:
   *     tags: [Payments]
   *     summary: Create a Bkash payment and get checkout URL
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreatePaymentRequest'
   *     responses:
   *       200:
   *         description: Bkash checkout URL returned
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 bkashURL: { type: string }
   *                 paymentID: { type: string }
   *                 orderId: { type: string }
   */
  async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.createBkashPayment(req.body, req.user!);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/payments/bkash/callback:
   *   get:
   *     tags: [Payments]
   *     summary: Bkash callback (called by Bkash servers — no auth)
   *     security: []
   *     parameters:
   *       - in: query
   *         name: paymentID
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: status
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       302:
   *         description: Redirect to frontend with status
   */
  async bkashCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentID, status } = req.query as Record<string, string>;
      const redirectUrl = await paymentService.handleBkashCallback(paymentID, status);
      res.redirect(redirectUrl);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/payments/{id}/refund:
   *   post:
   *     tags: [Payments]
   *     summary: Refund a completed payment (admin only)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Refund processed
   *       400:
   *         description: Cannot refund (wrong status or already refunded)
   */
  async refundPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await paymentService.refund(
        req.params.id,
        req.body.reason || 'Admin refund',
        req.user!
      );
      sendSuccess(res, undefined, 'Payment refunded successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();
