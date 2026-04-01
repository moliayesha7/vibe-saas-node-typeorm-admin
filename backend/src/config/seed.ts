import bcrypt from 'bcryptjs';
import { AppDataSource } from '@config/database';
import { TenantEntity } from '@modules/tenants/tenant.entity';
import { UserEntity } from '@modules/users/user.entity';
import { PaymentEntity } from '@modules/payments/payment.entity';
import { NotificationEntity } from '@modules/notifications/notification.entity';
import logger from '@common/utils/logger';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const DEFAULT_ADMIN_EMAIL = 'admin@saas.com';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';
const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

// ─── Helper ────────────────────────────────────────────────────────────────────
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(randomBetween(min, max + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const seedInitialData = async (): Promise<void> => {
  const tenantRepo      = AppDataSource.getRepository(TenantEntity);
  const userRepo        = AppDataSource.getRepository(UserEntity);
  const paymentRepo     = AppDataSource.getRepository(PaymentEntity);
  const notificationRepo = AppDataSource.getRepository(NotificationEntity);

  // ── 1. Tenants ──────────────────────────────────────────────────────────────
  const tenantsData = [
    { id: DEFAULT_TENANT_ID,                         name: 'SaaS Platform HQ',     slug: 'saas-platform-hq',     plan: 'enterprise' as const },
    { id: '22222222-2222-2222-2222-222222222222',    name: 'Acme Corporation',      slug: 'acme-corporation',     plan: 'pro' as const },
    { id: '33333333-3333-3333-3333-333333333333',    name: 'StartupHub Labs',       slug: 'startuphub-labs',      plan: 'starter' as const },
    { id: '44444444-4444-4444-4444-444444444444',    name: 'FreeUser Co',           slug: 'freeuser-co',          plan: 'free' as const },
  ];

  for (const t of tenantsData) {
    const existing = await tenantRepo.findOne({ where: { id: t.id } });
    if (!existing) {
      await tenantRepo.save(tenantRepo.create({ ...t, isActive: true, settings: {} }));
      logger.info(`✅ Tenant seeded: ${t.name}`);
    }
  }

  // ── 2. Users ─────────────────────────────────────────────────────────────────
  const usersData = [
    // Default Tenant — admin
    { email: DEFAULT_ADMIN_EMAIL,       pw: DEFAULT_ADMIN_PASSWORD, firstName: 'Super',   lastName: 'Admin',    role: 'admin'   as const, tenantId: DEFAULT_TENANT_ID },
    { email: 'sarah.manager@saas.com',  pw: 'Manager@123',          firstName: 'Sarah',   lastName: 'Johnson',  role: 'manager' as const, tenantId: DEFAULT_TENANT_ID },
    { email: 'john.viewer@saas.com',    pw: 'Viewer@123',           firstName: 'John',    lastName: 'Smith',    role: 'viewer'  as const, tenantId: DEFAULT_TENANT_ID },

    // Acme Corporation
    { email: 'ceo@acme.com',            pw: 'Admin@123',            firstName: 'Michael', lastName: 'Brown',    role: 'admin'   as const, tenantId: '22222222-2222-2222-2222-222222222222' },
    { email: 'ops@acme.com',            pw: 'Manager@123',          firstName: 'Emily',   lastName: 'Davis',    role: 'manager' as const, tenantId: '22222222-2222-2222-2222-222222222222' },
    { email: 'finance@acme.com',        pw: 'Viewer@123',           firstName: 'Robert',  lastName: 'Wilson',   role: 'viewer'  as const, tenantId: '22222222-2222-2222-2222-222222222222' },
    { email: 'dev@acme.com',            pw: 'Viewer@123',           firstName: 'Lisa',    lastName: 'Anderson', role: 'viewer'  as const, tenantId: '22222222-2222-2222-2222-222222222222' },

    // StartupHub Labs
    { email: 'founder@startuphub.io',   pw: 'Admin@123',            firstName: 'David',   lastName: 'Martinez', role: 'admin'   as const, tenantId: '33333333-3333-3333-3333-333333333333' },
    { email: 'growth@startuphub.io',    pw: 'Manager@123',          firstName: 'Jessica', lastName: 'Garcia',   role: 'manager' as const, tenantId: '33333333-3333-3333-3333-333333333333' },
    { email: 'support@startuphub.io',   pw: 'Viewer@123',           firstName: 'Kevin',   lastName: 'Lee',      role: 'viewer'  as const, tenantId: '33333333-3333-3333-3333-333333333333' },

    // FreeUser Co
    { email: 'admin@freeuser.net',      pw: 'Admin@123',            firstName: 'Anna',    lastName: 'Taylor',   role: 'admin'   as const, tenantId: '44444444-4444-4444-4444-444444444444' },
    { email: 'viewer@freeuser.net',     pw: 'Viewer@123',           firstName: 'Chris',   lastName: 'White',    role: 'viewer'  as const, tenantId: '44444444-4444-4444-4444-444444444444' },
  ];

  const createdUsers: Record<string, UserEntity> = {};

  for (const u of usersData) {
    let existing = await userRepo.findOne({ where: { email: u.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.pw, BCRYPT_ROUNDS);
      existing = await userRepo.save(
        userRepo.create({
          firstName: u.firstName,
          lastName:  u.lastName,
          email:     u.email,
          passwordHash,
          role:      u.role,
          tenantId:  u.tenantId,
          isActive:  true,
          lastLogin: daysAgo(randomInt(0, 7)),
        })
      );
      // Backdate created_at to spread users over last 60 days
      await AppDataSource.query(
        `UPDATE users SET created_at = $1 WHERE id = $2`,
        [daysAgo(randomInt(5, 60)).toISOString(), existing.id]
      );
      logger.info(`✅ User seeded: ${u.email}`);
    }
    createdUsers[u.email] = existing;
  }

  const adminUser = createdUsers[DEFAULT_ADMIN_EMAIL];

  // ── 3. Payments ──────────────────────────────────────────────────────────────
  const existingPaymentCount = await paymentRepo.count();
  if (existingPaymentCount < 5) {
    type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded' | 'cancelled';
    const statuses: PaymentStatus[] = [
      'completed', 'completed', 'completed', 'completed', 'completed', 'completed',
      'pending', 'failed', 'refunded', 'cancelled',
    ];
    const descriptions = [
      'Subscription renewal', 'Pro plan upgrade', 'Annual license fee',
      'API credits top-up', 'Team seat addition', 'Support package',
      'Training session', 'Custom development', 'Integration fee', 'Consulting hours',
    ];

    const paymentUsers = Object.values(createdUsers);

    for (let i = 0; i < 90; i++) {
      const user  = pick(paymentUsers);
      const status: PaymentStatus = pick(statuses);
      const amount = parseFloat(randomBetween(500, 25000).toFixed(2));
      const createdAt = daysAgo(randomInt(0, 90));
      const orderId = `ORDER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const transactionId = status === 'completed'
        ? `TXN-${Math.random().toString(36).substring(2, 14).toUpperCase()}`
        : null;
      const executedAt  = status === 'completed' ? createdAt.toISOString() : null;
      const refundedAt  = status === 'refunded'  ? new Date(createdAt.getTime() + 3_600_000).toISOString() : null;

      // Use raw INSERT to allow backdating created_at past TypeORM's @CreateDateColumn
      await AppDataSource.query(
        `INSERT INTO payments
           (amount, currency, status, order_id, transaction_id, description,
            executed_at, refunded_at, user_id, tenant_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,
        [
          amount, 'BDT', status, orderId, transactionId, pick(descriptions),
          executedAt, refundedAt, user.id, user.tenantId, createdAt.toISOString(),
        ]
      );
    }
    logger.info('✅ Payments seeded (90 records)');
  }

  // ── 4. Notifications ─────────────────────────────────────────────────────────
  const existingNotifCount = await notificationRepo.count({ where: { userId: adminUser.id } });
  if (existingNotifCount < 3 && adminUser) {
    const notifData = [
      { title: 'Welcome to SaaS Admin!',           message: 'Your platform is ready. Explore the dashboard to get started.',  type: 'success' as const, isRead: true,  daysBack: 30 },
      { title: 'New payment received',              message: 'A payment of ৳15,000 BDT has been completed successfully.',       type: 'success' as const, isRead: true,  daysBack: 7 },
      { title: 'New user registered',               message: 'Michael Brown from Acme Corporation joined the platform.',        type: 'info'    as const, isRead: true,  daysBack: 6 },
      { title: 'Monthly revenue report ready',      message: 'Your revenue this month has increased by 23% vs last month.',     type: 'info'    as const, isRead: false, daysBack: 5 },
      { title: 'Payment failed alert',              message: 'A payment attempt of ৳8,500 failed. Check the payments page.',    type: 'warning' as const, isRead: false, daysBack: 4 },
      { title: 'Tenant StartupHub Labs upgraded',   message: 'StartupHub Labs has upgraded from Free to Starter plan.',        type: 'success' as const, isRead: false, daysBack: 3 },
      { title: 'System maintenance scheduled',      message: 'Scheduled maintenance on Sunday 2:00–4:00 AM UTC.',              type: 'warning' as const, isRead: false, daysBack: 2 },
      { title: 'Security alert resolved',           message: 'The rate-limiting incident from yesterday has been resolved.',   type: 'info'    as const, isRead: false, daysBack: 1 },
      { title: 'New API integration available',     message: 'Stripe payment integration is now available for all Pro+ plans.', type: 'info'   as const, isRead: false, daysBack: 0 },
      { title: 'Refund processed',                  message: 'A refund of ৳5,200 has been processed for Acme Corporation.',    type: 'info'    as const, isRead: false, daysBack: 0 },
    ];

    for (const n of notifData) {
      const createdAt = daysAgo(n.daysBack).toISOString();
      await AppDataSource.query(
        `INSERT INTO notifications (title, message, type, is_read, user_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [n.title, n.message, n.type, n.isRead, adminUser.id, createdAt]
      );
    }
    logger.info('✅ Notifications seeded (10 records)');
  }

  logger.info('🌱 Seed complete');
  logger.info(`📧 Admin login: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
  logger.info('📧 Manager login: sarah.manager@saas.com / Manager@123');
  logger.info('📧 Viewer login:  john.viewer@saas.com / Viewer@123');
};
