import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '@config/database';
import { PaymentRepository } from './payment.repository';
import { PaymentEntity } from './payment.entity';
import { CreatePaymentDtoType, PaymentQueryDtoType } from './dto/payment.dto';
import { buildPaginationMeta, PaginationMeta } from '@common/utils/pagination.util';
import { NotFoundError, BadRequestError, ForbiddenError } from '@common/errors/AppError';
import { UserEntity } from '@modules/users/user.entity';
import { emitToUser, emitToAdmins } from '../../../services/socketService';
import logger from '@common/utils/logger';

export class PaymentService {
  private paymentRepo: PaymentRepository;

  constructor() {
    this.paymentRepo = new PaymentRepository(AppDataSource);
  }

  async findAll(
    filters: PaymentQueryDtoType,
    requestingUser: UserEntity
  ): Promise<{ payments: PaymentEntity[]; pagination: PaginationMeta }> {
    const tenantId =
      requestingUser.role !== 'admin' ? requestingUser.tenantId : null;
    const [payments, total] = await this.paymentRepo.findAll(filters, tenantId);
    return { payments, pagination: buildPaginationMeta(total, filters.page, filters.limit) };
  }

  async getStats(requestingUser: UserEntity): Promise<Record<string, unknown>> {
    const tenantId =
      requestingUser.role !== 'admin' ? requestingUser.tenantId : null;
    return this.paymentRepo.getStats(tenantId);
  }

  async createBkashPayment(
    dto: CreatePaymentDtoType,
    requestingUser: UserEntity
  ): Promise<{ bkashURL: string; paymentID: string; orderId: string }> {
    const { createPayment } = await import('../../../services/bkashService');
    const orderId = `ORDER-${uuidv4().slice(0, 8).toUpperCase()}`;

    const bkashData = await createPayment({ amount: dto.amount, orderId });
    if (bkashData.statusCode !== '0000') {
      throw new BadRequestError(bkashData.statusMessage || 'Payment creation failed');
    }

    await this.paymentRepo.create({
      id: uuidv4(),
      userId: requestingUser.id,
      tenantId: requestingUser.tenantId,
      amount: dto.amount,
      currency: dto.currency,
      status: 'pending',
      bkashPaymentId: bkashData.paymentID,
      orderId,
      description: dto.description ?? null,
    });

    return {
      bkashURL: bkashData.bkashURL,
      paymentID: bkashData.paymentID,
      orderId,
    };
  }

  async handleBkashCallback(
    paymentID: string,
    status: string
  ): Promise<string> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (status === 'cancel' || status === 'failure') {
      await this.paymentRepo.update(
        (await this.paymentRepo.findByBkashId(paymentID))?.id ?? '',
        { status: status === 'cancel' ? 'cancelled' : 'failed' }
      );
      return `${frontendUrl}/payments?status=${status}`;
    }

    try {
      const { executePayment } = await import('../../../services/bkashService');
      const result = await executePayment(paymentID);

      const payment = await this.paymentRepo.findByBkashId(paymentID);
      if (!payment) return `${frontendUrl}/payments?status=failed`;

      if (result.statusCode === '0000') {
        await this.paymentRepo.update(payment.id, {
          status: 'completed',
          transactionId: result.trxID,
          executedAt: new Date(),
        });

        // Real-time notifications
        if (payment.userId) {
          emitToUser(payment.userId, 'payment:completed', { payment });
        }
        emitToAdmins('payment:completed', { payment });

        // Email confirmation
        if (payment.user) {
          const { sendPaymentConfirmEmail } = await import('../../../services/emailService');
          sendPaymentConfirmEmail(payment.user as unknown as Parameters<typeof sendPaymentConfirmEmail>[0], payment as unknown as Parameters<typeof sendPaymentConfirmEmail>[1]).catch(
            (e) => logger.error('Payment confirm email failed:', e.message)
          );
        }

        return `${frontendUrl}/payments?status=success&trxID=${result.trxID}`;
      } else {
        await this.paymentRepo.update(payment.id, { status: 'failed' });
        return `${frontendUrl}/payments?status=failed`;
      }
    } catch {
      return `${frontendUrl}/payments?status=failed`;
    }
  }

  async refund(
    id: string,
    reason: string,
    requestingUser: UserEntity
  ): Promise<void> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== 'completed') {
      throw new BadRequestError('Only completed payments can be refunded');
    }
    if (payment.refundedAt) {
      throw new BadRequestError('Payment already refunded');
    }
    if (
      requestingUser.role !== 'admin' &&
      payment.tenantId !== requestingUser.tenantId
    ) {
      throw new ForbiddenError('Access denied');
    }

    const { refundPayment } = await import('../../../services/bkashService');
    const result = await refundPayment({
      paymentID: payment.bkashPaymentId!,
      amount: payment.amount,
      trxID: payment.transactionId!,
      sku: payment.orderId!,
      reason,
    });

    if (result.statusCode !== '0000') {
      throw new BadRequestError('Refund failed: ' + result.statusMessage);
    }

    await this.paymentRepo.update(id, {
      status: 'refunded',
      refundedAt: new Date(),
    });
    emitToAdmins('payment:refunded', { paymentId: id });
  }
}
