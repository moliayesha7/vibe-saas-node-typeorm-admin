import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import logger from '@common/utils/logger';

interface DecodedToken {
  userId: string;
  tenantId?: string;
  role?: string;
}

interface AuthedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  role?: string;
}

type SocketPayload = Record<string, unknown>;

let ioInstance: Server | null = null;

// Socketium init
export const initializeSocket = (io: Server): void => {
  ioInstance = io;

  io.use((socket: AuthedSocket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as DecodedToken;

      socket.userId = decoded.userId;
      socket.tenantId = decoded.tenantId;
      socket.role = decoded.role;

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    logger.info(`Socket connected: ${socket.id} | User: ${socket.userId}`);

    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`);
    }

    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    if (socket.role === 'admin') {
      socket.join('admin:global');
    }

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    socket.emit('connected', {
      message: 'Connected to real-time server',
      userId: socket.userId,
    });
  });

  logger.info('Socket.io initialized');
};

// Ad tenantem mittit
export const emitToTenant = (
  tenantId: string,
  event: string,
  data: SocketPayload
): void => {
  if (!ioInstance) return;

  ioInstance.to(`tenant:${tenantId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Ad usorem mittit
export const emitToUser = (
  userId: string,
  event: string,
  data: SocketPayload
): void => {
  if (!ioInstance) return;

  ioInstance.to(`user:${userId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Ad administratores mittit
export const emitToAdmins = (event: string, data: SocketPayload): void => {
  if (!ioInstance) return;

  ioInstance.to('admin:global').emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Ad omnes mittit
export const broadcast = (event: string, data: SocketPayload): void => {
  if (!ioInstance) return;

  ioInstance.emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};