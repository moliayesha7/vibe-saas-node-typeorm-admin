import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '@modules/users/user.entity';
import { TenantEntity } from '@modules/tenants/tenant.entity';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
  type: 'decimal',
  precision: 12,
  scale: 2,
  transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value),
  },
  })
  amount!: number;

  @Column({ length: 10, default: 'BDT' })
  currency!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
  })
  status!: PaymentStatus;

  @Column({
  name: 'bkash_payment_id',
  type: 'varchar',
  length: 255,
  nullable: true,
  })
  bkashPaymentId!: string | null;

 @Column({
  name: 'transaction_id',
  type: 'varchar',
  length: 255,
  nullable: true,
  })
  transactionId!: string | null;

  @Column({
    name: 'order_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  orderId!: string | null;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'executed_at', nullable: true, type: 'timestamptz' })
  executedAt!: Date | null;

  @Column({ name: 'refunded_at', nullable: true, type: 'timestamptz' })
  refundedAt!: Date | null;

  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null;

  @Column({ name: 'tenant_id', nullable: true, type: 'uuid' })
  tenantId!: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // ─── Relations ───────────────────────────────────────────────────
  @ManyToOne(() => UserEntity, (user) => user.payments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.payments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity | null;
}
