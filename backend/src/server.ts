import 'reflect-metadata';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import logger from '@common/utils/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async (): Promise<void> => {
  const databaseModule = await import('./config/database');
  const { initializeDatabase, closeDatabase } = databaseModule;

  if (typeof initializeDatabase !== 'function') {
    logger.error('Database module exports:', Object.keys(databaseModule));
    throw new Error('initializeDatabase is not a function');
  }

  await initializeDatabase();

  // Data initialia post initium database seruntur
  const { seedInitialData } = await import('./config/seed');
  await seedInitialData();

  const { createApp } = await import('./app');
  const app = createApp();
  const httpServer = http.createServer(app);

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

  const { initializeSocket } = await import('./services/socketService');
  initializeSocket(io);

  httpServer.listen(PORT, () => {
    logger.info(
      `🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`
    );
    logger.info(`📖 API docs: http://localhost:${PORT}/api/docs`);
    logger.info(`❤  Health:   http://localhost:${PORT}/api/health`);
  });

  // Clausura lenis servatoris
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);

    httpServer.close(async () => {
      if (typeof closeDatabase === 'function') {
        await closeDatabase();
      }
      logger.info('Server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced exit after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

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