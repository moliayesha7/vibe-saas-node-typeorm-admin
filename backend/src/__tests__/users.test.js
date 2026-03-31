const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const { query } = require('../config/database');

jest.mock('../config/database', () => ({
  connectDB: jest.fn(),
  query: jest.fn(),
  withTransaction: jest.fn((cb) => cb({ query: jest.fn() })),
}));
jest.mock('../services/socketService', () => ({
  initializeSocket: jest.fn(),
  emitToTenant: jest.fn(),
  emitToUser: jest.fn(),
  emitToAdmins: jest.fn(),
}));

const makeToken = (overrides = {}) => jwt.sign(
  { userId: 'user-1', email: 'admin@test.com', role: 'admin', tenantId: 'tenant-1', ...overrides },
  process.env.JWT_SECRET || 'test-secret'
);

describe('Users API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/users', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('should return users list for admin', async () => {
      const mockUser = { id: 'user-1', email: 'admin@test.com', role: 'admin', tenant_id: 'tenant-1', is_active: true };
      query
        .mockResolvedValueOnce({ rows: [mockUser] }) // passport JWT
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // count
        .mockResolvedValueOnce({ rows: [mockUser] }); // users

      const token = makeToken();
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should return 403 for viewer role', async () => {
      const mockUser = { id: 'viewer-1', email: 'viewer@test.com', role: 'viewer', tenant_id: 'tenant-1', is_active: true };
      query.mockResolvedValueOnce({ rows: [mockUser] });

      const token = makeToken({ userId: 'viewer-1', role: 'viewer' });
      const res = await request(app)
        .delete('/api/users/some-user-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
