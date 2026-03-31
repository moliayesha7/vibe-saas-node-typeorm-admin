const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let ioInstance = null;

const initializeSocket = (io) => {
  ioInstance = io;

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.tenantId = decoded.tenantId;
      socket.role = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} | User: ${socket.userId}`);

    // Join tenant room for multi-tenancy
    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`);
    }

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Admins join global room
    if (socket.role === 'admin') {
      socket.join('admin:global');
    }

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    // Acknowledge connection
    socket.emit('connected', {
      message: 'Connected to real-time server',
      userId: socket.userId,
    });
  });

  logger.info('Socket.io initialized');
};

// Emit to specific tenant
const emitToTenant = (tenantId, event, data) => {
  if (!ioInstance) return;
  ioInstance.to(`tenant:${tenantId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
};

// Emit to specific user
const emitToUser = (userId, event, data) => {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
};

// Emit to all admins
const emitToAdmins = (event, data) => {
  if (!ioInstance) return;
  ioInstance.to('admin:global').emit(event, { ...data, timestamp: new Date().toISOString() });
};

// Broadcast to all connected
const broadcast = (event, data) => {
  if (!ioInstance) return;
  ioInstance.emit(event, { ...data, timestamp: new Date().toISOString() });
};

module.exports = { initializeSocket, emitToTenant, emitToUser, emitToAdmins, broadcast };
