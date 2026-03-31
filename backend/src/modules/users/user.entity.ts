import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { TenantEntity } from '@modules/tenants/tenant.entity';
import { PaymentEntity } from '@modules/payments/payment.entity';
import { NotificationEntity } from '@modules/notifications/notification.entity';

export type UserRole = 'admin' | 'manager' | 'viewer';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'first_name', length: 50 })
  firstName!: string;

  @Column({ name: 'last_name', length: 50 })
  lastName!: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'manager', 'viewer'],
    default: 'viewer',
  })
  role!: UserRole;

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'last_login', nullable: true, type: 'timestamptz' })
  lastLogin!: Date | null;

  @Column({ name: 'reset_token', nullable: true, length: 255, select: false })
  resetToken!: string | null;

  @Column({ name: 'reset_token_expiry', nullable: true, type: 'timestamptz', select: false })
  resetTokenExpiry!: Date | null;

  @Column({ name: 'tenant_id', nullable: true, type: 'uuid' })
  tenantId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // ─── Relations ───────────────────────────────────────────────────
  @ManyToOne(() => TenantEntity, (tenant) => tenant.users, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity | null;

  @OneToMany(() => PaymentEntity, (payment) => payment.user)
  payments!: PaymentEntity[];

  @OneToMany(() => NotificationEntity, (notification) => notification.user)
  notifications!: NotificationEntity[];

  // ─── Hooks ───────────────────────────────────────────────────────
  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail(): void {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }

  // Helper: full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
