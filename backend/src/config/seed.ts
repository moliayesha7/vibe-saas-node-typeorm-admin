import bcrypt from 'bcryptjs';
import { AppDataSource } from '@config/database';
import { TenantEntity } from '@modules/tenants/tenant.entity';
import { UserEntity } from '@modules/users/user.entity';
import logger from '@common/utils/logger';

const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const DEFAULT_ADMIN_EMAIL = 'admin@saas.com';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';
const DEFAULT_BCRYPT_ROUNDS = parseInt(
  process.env.BCRYPT_SALT_ROUNDS || '12',
  10
);

export const seedInitialData = async (): Promise<void> => {
  // Repositoria accipiuntur ex fonte datorum
  const tenantRepo = AppDataSource.getRepository(TenantEntity);
  const userRepo = AppDataSource.getRepository(UserEntity);

  // Primum tenantem quaerimus
  let tenant = await tenantRepo.findOne({
    where: { id: DEFAULT_TENANT_ID },
  });

  // Si deest, creamus
  if (!tenant) {
    tenant = tenantRepo.create({
      id: DEFAULT_TENANT_ID,
      name: 'Default Tenant',
      slug: 'default-tenant',
      plan: 'enterprise',
      isActive: true,
      settings: {},
    });

    await tenantRepo.save(tenant);
    logger.info('✅ Default tenant seeded');
  }

  // Deinde administratorem per email quaerimus
  const existingAdmin = await userRepo.findOne({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  // Si iam adest, nihil facimus
  if (existingAdmin) {
    logger.info('ℹ️ Default admin already exists');
    return;
  }

  // Hash novus ex verbo noto generatur
  const passwordHash = await bcrypt.hash(
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_BCRYPT_ROUNDS
  );

  // Administratorem creamus
  const adminUser = userRepo.create({
    tenantId: tenant.id,
    firstName: 'Super',
    lastName: 'Admin',
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
    isActive: true,
  });

  await userRepo.save(adminUser);

  // Credentia initialia in log scribuntur
  logger.info('✅ Default admin user seeded');
  logger.info(`📧 Admin email: ${DEFAULT_ADMIN_EMAIL}`);
  logger.info(`🔑 Admin password: ${DEFAULT_ADMIN_PASSWORD}`);
};