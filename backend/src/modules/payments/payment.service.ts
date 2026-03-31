import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '@config/database';
import { PaymentRepository } from './payment.repository';
import { PaymentEntity } from './payment.entity';
import {
  CreatePaymentDtoType,
  PaymentQueryDtoType,
} from './dto/payment.dto';
import {
  buildPaginationMeta,
  PaginationMeta,
} from '@common/utils/pagination.util';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@common/errors/AppError';
import { UserEntity } from '@modules/users/user.entity';
import {
  createPayment,
  executePayment,
  refundPayment,
} from '../../services/bkashService';
import { sendPaymentConfirmEmail } from '../../services/emailService';
import { emitToUser, emitToAdmins } from '../../services/socketService';
import logger from '@common/utils/logger';

type PaymentMailUser = {
  email: string;
  firstName?: string | null;
  first_name?: string | null;
};

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

    return {
      payments,
      pagination: buildPaginationMeta(total, filters.page, filters.limit),
    };
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
    const orderId = `ORDER-${uuidv4().slice(0, 8).toUpperCase()}`;

    const bkashData = await createPayment({
      amount: dto.amount,
      orderId,
      currency: dto.currency || 'BDT',
    });

    if (
      bkashData.statusCode !== '0000' ||
      !bkashData.paymentID ||
      !bkashData.bkashURL
    ) {
      throw new BadRequestError(
        bkashData.statusMessage || 'Payment creation failed'
      );
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
      const existingPayment = await this.paymentRepo.findByBkashId(paymentID);

      if (existingPayment) {
        await this.paymentRepo.update(existingPayment.id, {
          status: status === 'cancel' ? 'cancelled' : 'failed',
        });
      }

      return `${frontendUrl}/payments?status=${status}`;
    }

    try {
      const result = await executePayment(paymentID);
      const payment = await this.paymentRepo.findByBkashId(paymentID);

      if (!payment) {
        return `${frontendUrl}/payments?status=failed`;
      }

      if (result.statusCode === '0000') {
        await this.paymentRepo.update(payment.id, {
          status: 'completed',
          transactionId: result.trxID,
          executedAt: new Date(),
        });

        if (payment.userId) {
          emitToUser(payment.userId, 'payment:completed', {
            paymentId: payment.id,
            amount: payment.amount,
            transactionId: result.trxID,
          });
        }

        emitToAdmins('payment:completed', {
          paymentId: payment.id,
          amount: payment.amount,
          transactionId: result.trxID,
        });

        const mailUser = payment.user as PaymentMailUser | undefined;

        if (mailUser?.email) {
          void sendPaymentConfirmEmail(mailUser, {
            amount: payment.amount,
            transactionId: result.trxID || payment.transactionId || null,
          }).catch((error) => {
            logger.error(
              'Payment confirm email failed:',
              error instanceof Error ? error.message : error
            );
          });
        }

        return `${frontendUrl}/payments?status=success&trxID=${result.trxID || ''}`;
      }

      await this.paymentRepo.update(payment.id, { status: 'failed' });
      return `${frontendUrl}/payments?status=failed`;
    } catch (error) {
      logger.error(
        'Bkash callback handling failed:',
        error instanceof Error ? error.message : error
      );
      return `${frontendUrl}/payments?status=failed`;
    }
  }

  async refund(
    id: string,
    reason: string,
    requestingUser: UserEntity
  ): Promise<void> {
    const payment = await this.paymentRepo.findById(id);

    if (!payment) {
      throw new NotFoundError('Payment');
    }

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

    const result = await refundPayment({
      paymentID: payment.bkashPaymentId!,
      amount: payment.amount,
      trxID: payment.transactionId!,
      sku: payment.orderId!,
      reason,
    });

    if (result.statusCode !== '0000') {
      throw new BadRequestError(
        `Refund failed: ${result.statusMessage || 'Unknown error'}`
      );
    }

    await this.paymentRepo.update(id, {
      status: 'refunded',
      refundedAt: new Date(),
    });

    emitToAdmins('payment:refunded', { paymentId: id });
  }
}