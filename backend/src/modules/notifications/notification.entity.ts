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

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ nullable: true, type: 'text' })
  message!: string | null;

  @Column({
    type: 'enum',
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info',
  })
  type!: NotificationType;

  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // ─── Relations ───────────────────────────────────────────────────
  @ManyToOne(() => UserEntity, (user) => user.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
