import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

// Config
import { setupSwagger } from '@config/swagger';

// Middleware
import { globalRateLimiter } from '@common/middleware/rateLimiter.middleware';
import { errorMiddleware, notFoundMiddleware } from '@common/middleware/error.middleware';
import logger from '@common/utils/logger';

// Routes (TypeScript modules)
import authRoutes from '@modules/auth/auth.routes';
import userRoutes from '@modules/users/user.routes';
import tenantRoutes from '@modules/tenants/tenant.routes';
import paymentRoutes from '@modules/payments/payment.routes';
import notificationRoutes from '@modules/notifications/notification.routes';

export const createApp = (): Application => {
  const app = express();

  // ─── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    })
  );

  // ─── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    })
  );

  // ─── Body parsing & compression ────────────────────────────────────────────
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─── HTTP request logging ──────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    app.use(
      morgan('combined', {
        stream: { write: (msg) => logger.http(msg.trim()) },
        skip: (req) => req.url === '/api/health',
      })
    );
  }

  // ─── Global rate limiting ──────────────────────────────────────────────────
  app.use('/api', globalRateLimiter);

  // ─── Swagger API docs ──────────────────────────────────────────────────────
  setupSwagger(app);

  // ─── Health check ──────────────────────────────────────────────────────────
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // ─── API routes ────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/notifications', notificationRoutes);

  // ─── Serve static uploads (local dev fallback) ─────────────────────────────
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ─── 404 & error handlers ──────────────────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
