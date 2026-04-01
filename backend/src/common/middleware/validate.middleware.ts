import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '@common/errors/AppError';

type RequestPart = 'body' | 'query' | 'params';

// Valores vacuos in undefined convertit
const normalizeEmptyQueryValues = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.trim() === '' ? undefined : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeEmptyQueryValues(item));
  }

  if (value && typeof value === 'object') {
    const normalized: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      normalized[key] = normalizeEmptyQueryValues(item);
    }

    return normalized;
  }

  return value;
};

/**
 * Middleware factory for Zod schema validation.
 * Strips unknown fields and replaces request part with parsed value.
 */
export const validate = (schema: ZodSchema, part: RequestPart = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      next(new ValidationError(errors));
      return;
    }

    // Pars petitionis valide reponitur
    switch (part) {
      case 'body':
        req.body = result.data;
        break;
      case 'query':
        req.query = result.data as Request['query'];
        break;
      case 'params':
        req.params = result.data as Request['params'];
        break;
      default:
        break;
    }

    next();
  };
}