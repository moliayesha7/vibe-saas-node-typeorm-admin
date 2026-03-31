import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '@common/errors/AppError';
import logger from '@common/utils/logger';
import { ZodError } from 'zod';
import { QueryFailedError } from 'typeorm';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Operational AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`${req.method} ${req.originalUrl} → ${err.statusCode}: ${err.message}`, {
        stack: err.stack,
        body: req.body,
      });
    } else {
      logger.warn(`${req.method} ${req.originalUrl} → ${err.statusCode}: ${err.message}`);
    }

    const body: Record<string, unknown> = {
      success: false,
      message: err.message,
    };

    if (err instanceof ValidationError) {
      body.errors = err.errors;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({ success: false, message: 'Validation failed', errors });
    return;
  }

  // TypeORM: unique constraint violation
  if (err instanceof QueryFailedError) {
    const pgErr = err as QueryFailedError & { code?: string; detail?: string };
    if (pgErr.code === '23505') {
      res.status(409).json({
        success: false,
        message: 'A record with this information already exists',
      });
      return;
    }
    if (pgErr.code === '23503') {
      res.status(400).json({
        success: false,
        message: 'Referenced record does not exist',
      });
      return;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token has expired' });
    return;
  }

  // Unknown / programming errors
  logger.error(`UNHANDLED: ${req.method} ${req.originalUrl}`, {
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};
