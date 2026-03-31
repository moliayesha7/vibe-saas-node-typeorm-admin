import 'reflect-metadata';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import { initializeDatabase } from '@config/database';
import logger from '@common/utils/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async (): Promise<void> => {
  await initializeDatabase();

  // App post database init oneratur
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

  // Si socketService typis recte exportatur
  const { initializeSocket } = await import('./services/socketService');
  initializeSocket(io);

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    logger.info(`📖 API docs: http://localhost:${PORT}/api/docs`);
    logger.info(`❤  Health:   http://localhost:${PORT}/api/health`);
  });
};

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});