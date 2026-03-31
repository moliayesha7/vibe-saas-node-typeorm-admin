import 'reflect-metadata';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

// Load env first, before any other imports that read process.env
dotenv.config();

import { createApp } from './app';
import { initializeDatabase } from '@config/database';
import logger from '@common/utils/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async (): Promise<void> => {
  // ─── Database ──────────────────────────────────────────────────────────────
  await initializeDatabase();

  // ─── Express app ──────────────────────────────────────────────────────────
  const app = createApp();
  const httpServer = http.createServer(app);

  // ─── Socket.io ────────────────────────────────────────────────────────────
  const io = new SocketServer(httpServer, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Delegate socket logic to the existing socketService
  const { initializeSocket } = await import('./services/socketService');
  initializeSocket(io);

  // ─── Listen ────────────────────────────────────────────────────────────────
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    logger.info(`📖 API docs: http://localhost:${PORT}/api/docs`);
    logger.info(`❤  Health:   http://localhost:${PORT}/api/health`);
  });

  // ─── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      const { closeDatabase } = await import('@config/database');
      await closeDatabase();
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 10s if close stalls
    setTimeout(() => {
      logger.error('Forced exit after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    process.exit(1);
  });
};

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
