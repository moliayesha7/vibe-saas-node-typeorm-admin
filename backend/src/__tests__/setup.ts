import 'reflect-metadata';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Silence logger during tests
jest.mock('../common/utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  },
}));

// Prevent socket emission errors in unit tests
jest.mock('../services/socketService', () => ({
  initializeSocket: jest.fn(),
  emitToUser: jest.fn(),
  emitToAdmins: jest.fn(),
  emitToTenant: jest.fn(),
  broadcast: jest.fn(),
}));
