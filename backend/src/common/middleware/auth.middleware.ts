import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractBearerToken, JwtPayload } from '@common/utils/jwt.util';
import { AppDataSource } from '@config/database';
import { UserEntity } from '@modules/users/user.entity';
import { UnauthorizedError } from '@common/errors/AppError';

// Augment Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserEntity;
      tokenPayload?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const payload = verifyAccessToken(token);

    const userRepo = AppDataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({
      where: { id: payload.userId, isActive: true },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedError('User not found or inactive');
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
};

// Optional auth: doesn't fail if no token provided
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header) return next();

    const token = extractBearerToken(header);
    const payload = verifyAccessToken(token);

    const userRepo = AppDataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({
      where: { id: payload.userId, isActive: true },
    });

    if (user) {
      req.user = user;
      req.tokenPayload = payload;
    }
  } catch {
    // Swallow errors — optional auth
  }
  next();
};
