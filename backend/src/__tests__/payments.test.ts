import request from 'supertest';
import { createApp } from '../app';
import { AppDataSource } from '../config/database';
import { UserEntity } from '../modules/users/user.entity';

const app = createApp();
let adminToken: string;
let userToken: string;

beforeAll(async () => {
  await AppDataSource.initialize();

  // Login as seeded admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@saas.com', password: 'Admin@123' });
  adminToken = adminRes.body.data?.accessToken;

  // Register a regular viewer
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({
      firstName: 'Pay',
      lastName: 'Tester',
      email: 'pay-test@example.com',
      password: 'PayTest@123',
    });
  userToken = userRes.body.data?.accessToken;
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.getRepository(UserEntity).delete({ email: 'pay-test@example.com' });
    await AppDataSource.destroy();
  }
});

describe('GET /api/payments', () => {
  it('returns paginated payments for admin', async () => {
    const res = await request(app)
      .get('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/payments');
    expect(res.status).toBe(401);
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/payments?status=completed')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((p: { status: string }) => {
      expect(p.status).toBe('completed');
    });
  });
});

describe('GET /api/payments/stats', () => {
  it('returns stats for admin', async () => {
    const res = await request(app)
      .get('/api/payments/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalRevenue');
    expect(res.body.data).toHaveProperty('byStatus');
  });
});

describe('POST /api/payments', () => {
  it('validates amount is required', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currency: 'BDT' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('validates amount is positive', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: -100 });

    expect(res.status).toBe(400);
  });

  // NOTE: Actual Bkash payment creation requires sandbox credentials.
  // Tested via integration/E2E tests with mocked bkashService.
});

describe('GET /api/payments/bkash/callback', () => {
  it('redirects to frontend on cancel status', async () => {
    const res = await request(app)
      .get('/api/payments/bkash/callback?paymentID=TEST123&status=cancel');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('status=cancel');
  });

  it('redirects to frontend on failure status', async () => {
    const res = await request(app)
      .get('/api/payments/bkash/callback?paymentID=TEST123&status=failure');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('status=failure');
  });
});
