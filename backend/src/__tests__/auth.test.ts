import request from 'supertest';
import { createApp } from '../app';
import { AppDataSource } from '../config/database';
import { UserEntity } from '../modules/users/user.entity';
import { TenantEntity } from '../modules/tenants/tenant.entity';
import { RefreshTokenEntity } from '../modules/auth/auth.entity';

const app = createApp();

beforeAll(async () => {
  await AppDataSource.initialize();
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.getRepository(RefreshTokenEntity).delete({});
    await AppDataSource.getRepository(UserEntity).delete({ email: 'test-auth@example.com' });
    await AppDataSource.destroy();
  }
});

describe('POST /api/auth/register', () => {
  it('registers a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test-auth@example.com',
        password: 'TestPass@123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe('test-auth@example.com');
  });

  it('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test-auth@example.com',
        password: 'TestPass@123',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('validates required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test-auth@example.com', password: 'TestPass@123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test-auth@example.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'TestPass@123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test-auth@example.com', password: 'TestPass@123' });
    refreshToken = res.body.data.refreshToken;
  });

  it('issues new tokens', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    // Old token should be rotated (new token differs)
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('rejects invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test-auth@example.com', password: 'TestPass@123' });
    accessToken = res.body.data.accessToken;
  });

  it('returns current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test-auth@example.com');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
