import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, JwtPayload } from '@banking/shared';
import { env } from '../config';
import { logger } from '../utils';

export { JwtPayload } from '@banking/shared';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw AppError.unauthorized('Authorization header missing');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw AppError.unauthorized('Invalid authorization format. Use: Bearer <token>');
    }

    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;

    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired', { error: error.message });
      throw AppError.unauthorized('Token expired');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token', { error: error.message });
      throw AppError.unauthorized('Invalid token');
    }

    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Authentication error', error);
    throw AppError.unauthorized('Authentication failed');
  }
}

export function authorizeTransactionParticipant(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const { senderUserId } = req.body as { senderUserId?: string };
  const currentUserId = req.user?.userId;

  if (!currentUserId) {
    throw AppError.unauthorized('User not authenticated');
  }

  if (senderUserId && senderUserId !== currentUserId) {
    throw AppError.forbidden('You can only create transactions from your own account');
  }

  next();
}
