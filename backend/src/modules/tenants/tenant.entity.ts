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

  // Columna nunc obligatoria est
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  name!: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 150,
    unique: true,
  })
  slug!: string;

  @Column({
    type: 'enum',
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'free',
  })
  plan!: TenantPlan;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @Column({
    type: 'jsonb',
    default: {},
  })
  settings!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relationes ad usores
  @OneToMany(() => UserEntity, (user) => user.tenant)
  users!: UserEntity[];

  // Relationes ad solutiones
  @OneToMany(() => PaymentEntity, (payment) => payment.tenant)
  payments!: PaymentEntity[];
}