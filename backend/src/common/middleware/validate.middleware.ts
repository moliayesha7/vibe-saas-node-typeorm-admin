import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@common/errors/AppError';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Middleware factory for Zod schema validation.
 * Strips unknown fields and replaces request part with parsed value.
 */
export const validate = (schema: ZodSchema, part: RequestPart = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      next(new ValidationError(errors));
      return;
    }

    // Replace with parsed (type-safe, stripped) value
    (req as Record<string, unknown>)[part] = result.data;
    next();
  };
};
