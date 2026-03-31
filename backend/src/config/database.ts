import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserEntity } from '@modules/users/user.entity';
import { TenantEntity } from '@modules/tenants/tenant.entity';
import { PaymentEntity } from '@modules/payments/payment.entity';
import { NotificationEntity } from '@modules/notifications/notification.entity';
import { RefreshTokenEntity } from '@modules/auth/auth.entity';
import logger from '@common/utils/logger';

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
  synchronize: process.env.NODE_ENV === 'development', // auto-sync in dev only
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: [
    UserEntity,
    TenantEntity,
    PaymentEntity,
    NotificationEntity,
    RefreshTokenEntity,
  ],
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  maxQueryExecutionTime: 3000,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('✅ PostgreSQL connected via TypeORM');
    }
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Database connection closed');
  }
};
