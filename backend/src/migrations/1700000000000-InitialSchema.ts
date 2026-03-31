import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Extensions ─────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ─── Enums ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "tenant_plan_enum" AS ENUM ('free', 'starter', 'pro', 'enterprise')
    `);
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('admin', 'manager', 'viewer')
    `);
    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM ('info', 'success', 'warning', 'error')
    `);

    // ─── Tenants ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name"        VARCHAR(255) NOT NULL,
        "slug"        VARCHAR(255) NOT NULL UNIQUE,
        "plan"        "tenant_plan_enum" NOT NULL DEFAULT 'free',
        "is_active"   BOOLEAN NOT NULL DEFAULT TRUE,
        "settings"    JSONB NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at"  TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_tenants_slug" ON "tenants" ("slug")`);

    // ─── Users ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "first_name"      VARCHAR(100) NOT NULL,
        "last_name"       VARCHAR(100) NOT NULL,
        "email"           VARCHAR(255) NOT NULL UNIQUE,
        "password_hash"   VARCHAR(255) NOT NULL,
        "role"            "user_role_enum" NOT NULL DEFAULT 'viewer',
        "is_active"       BOOLEAN NOT NULL DEFAULT TRUE,
        "avatar_url"      VARCHAR(500),
        "last_login"      TIMESTAMPTZ,
        "reset_token"     VARCHAR(255),
        "reset_token_expires_at" TIMESTAMPTZ,
        "tenant_id"       UUID REFERENCES "tenants"("id") ON DELETE SET NULL,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_email"     ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "idx_users_tenant_id" ON "users" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "idx_users_role"      ON "users" ("role")`);

    // ─── Refresh Tokens ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "token"       VARCHAR(512) NOT NULL UNIQUE,
        "user_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expires_at"  TIMESTAMPTZ NOT NULL,
        "is_revoked"  BOOLEAN NOT NULL DEFAULT FALSE,
        "ip_address"  VARCHAR(45),
        "user_agent"  VARCHAR(500),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_token"   ON "refresh_tokens" ("token")`);

    // ─── Payments ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id"                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "amount"            DECIMAL(12,2) NOT NULL,
        "currency"          VARCHAR(10) NOT NULL DEFAULT 'BDT',
        "status"            "payment_status_enum" NOT NULL DEFAULT 'pending',
        "bkash_payment_id"  VARCHAR(255),
        "transaction_id"    VARCHAR(255),
        "order_id"          VARCHAR(255),
        "description"       TEXT,
        "executed_at"       TIMESTAMPTZ,
        "refunded_at"       TIMESTAMPTZ,
        "user_id"           UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "tenant_id"         UUID REFERENCES "tenants"("id") ON DELETE SET NULL,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_payments_status"     ON "payments" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_payments_tenant_id"  ON "payments" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "idx_payments_created_at" ON "payments" ("created_at")`);

    // ─── Notifications ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title"       VARCHAR(255) NOT NULL,
        "message"     TEXT,
        "type"        "notification_type_enum" NOT NULL DEFAULT 'info',
        "is_read"     BOOLEAN NOT NULL DEFAULT FALSE,
        "user_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_notifications_user_id"    ON "notifications" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_notifications_created_at" ON "notifications" ("created_at")`);

    // ─── updated_at trigger function ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    for (const table of ['tenants', 'users', 'payments']) {
      await queryRunner.query(`
        CREATE TRIGGER "${table}_updated_at"
        BEFORE UPDATE ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    }

    // ─── Seed: default admin tenant + user ───────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "tenants" ("id", "name", "slug", "plan")
      VALUES ('00000000-0000-0000-0000-000000000001', 'System Admin', 'system-admin', 'enterprise')
      ON CONFLICT DO NOTHING
    `);
    // Password: Admin@123  (bcrypt hash, 10 rounds)
    await queryRunner.query(`
      INSERT INTO "users" ("id", "first_name", "last_name", "email", "password_hash", "role", "tenant_id")
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'Super', 'Admin',
        'admin@saas.com',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'admin',
        '00000000-0000-0000-0000-000000000001'
      )
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenant_plan_enum"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);
  }
}
