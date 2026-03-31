import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserEntity } from '@modules/users/user.entity';
import { PaymentEntity } from '@modules/payments/payment.entity';

export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';

@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Index({ unique: true })
  @Column({ length: 150, unique: true })
  slug!: string;

  @Column({
    type: 'enum',
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'free',
  })
  plan!: TenantPlan;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  settings!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // ─── Relations ───────────────────────────────────────────────────
  @OneToMany(() => UserEntity, (user) => user.tenant)
  users!: UserEntity[];

  @OneToMany(() => PaymentEntity, (payment) => payment.tenant)
  payments!: PaymentEntity[];
}
