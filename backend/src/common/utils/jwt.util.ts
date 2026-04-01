import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@common/errors/AppError';

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string | null;
  tenantId?: string | null;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_SECRET =
  process.env.JWT_SECRET || 'access-secret-min-32-chars-long!!';

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'refresh-secret-min-32-chars-long!';

const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Par accessus et renovationis generat
export const generateTokenPair = (payload: JwtPayload): TokenPair => {
  const accessToken = jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role ?? null,
      tenantId: payload.tenantId ?? null,
    },
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES,
    } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { userId: payload.userId },
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES,
    } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

// Access token verificat
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload;

    if (!decoded?.userId) {
      throw new UnauthorizedError('Invalid access token');
    }

    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired');
    }

    throw new UnauthorizedError('Invalid access token');
  }
};

// Refresh token verificat
export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as { userId?: string };

    if (!decoded?.userId) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    return { userId: decoded.userId };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

// Bearer token e capite extrahit
export const extractBearerToken = (authHeader?: string): string => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization header missing or malformed');
  }

  const token = authHeader.split(' ')[1]?.trim();

  if (!token) {
    throw new UnauthorizedError('Authorization header missing or malformed');
  }

  return token;
};