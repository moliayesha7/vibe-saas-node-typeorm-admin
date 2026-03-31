const request = require('supertest');
const { app } = require('../../server');
const { query } = require('../config/database');

// Mock the database
jest.mock('../config/database', () => ({
  connectDB: jest.fn(),
  query: jest.fn(),
  withTransaction: jest.fn((cb) => cb({ query: jest.fn() })),
}));

jest.mock('../services/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/socketService', () => ({
  initializeSocket: jest.fn(),
  emitToTenant: jest.fn(),
  emitToUser: jest.fn(),
  emitToAdmins: jest.fn(),
  broadcast: jest.fn(),
}));

describe('Auth API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/auth/register', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ firstName: 'Test', lastName: 'User', email: 'test@test.com', password: '123' });
      expect(res.status).toBe(400);
    });

    it('should return 409 if email already exists', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: '1' }] }); // email exists
      const res = await request(app)
        .post('/api/auth/register')
        .send({ firstName: 'Test', lastName: 'User', email: 'exists@test.com', password: 'Test@1234' });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // user not found
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrongpass' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });
});
