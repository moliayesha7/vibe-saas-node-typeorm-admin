/**
 * TypeORM DataSource used by the CLI (migrations, schema generation).
 * Run: npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.cli.ts
 */
import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

import { UserEntity } from '@modules/users/user.entity';
import { TenantEntity } from '@modules/tenants/tenant.entity';
import { PaymentEntity } from '@modules/payments/payment.entity';
import { NotificationEntity } from '@modules/notifications/notification.entity';
import { RefreshTokenEntity } from '@modules/auth/auth.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'saas_admin_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  synchronize: false,
  logging: true,
  entities: [UserEntity, TenantEntity, PaymentEntity, NotificationEntity, RefreshTokenEntity],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
