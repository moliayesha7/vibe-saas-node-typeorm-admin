import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '@modules/users/user.entity';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
 @Column({
  type: 'text',
  })
  token!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
  name: 'expires_at',
  type: 'timestamptz',
  })
  expiresAt!: Date;

  @Column({
  name: 'is_revoked',
  type: 'boolean',
  default: false,
  })
  isRevoked!: boolean;

 @Column({
  name: 'ip_address',
  type: 'varchar',
  length: 45, // supports IPv6
  nullable: true,
  })
  ipAddress!: string | null;

  @Column({
  name: 'user_agent',
  type: 'text',
  nullable: true,
  })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // ─── Relations ───────────────────────────────────────────────────
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
