import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@common/errors/AppError';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_SECRET = process.env.JWT_SECRET || 'access-secret-min-32-chars-long!!';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-min-32-chars-long!';
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export const generateTokenPair = (payload: JwtPayload): TokenPair => {
  const accessToken = jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
    issuer: 'saas-admin',
    audience: 'saas-client',
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(
    { userId: payload.userId },
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES,
      issuer: 'saas-admin',
    } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, ACCESS_SECRET, {
      issuer: 'saas-admin',
      audience: 'saas-client',
    }) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    return jwt.verify(token, REFRESH_SECRET, {
      issuer: 'saas-admin',
    }) as { userId: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

export const extractBearerToken = (authHeader?: string): string => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization header missing or malformed');
  }
  return authHeader.split(' ')[1];
};
