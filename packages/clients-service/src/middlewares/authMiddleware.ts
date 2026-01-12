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

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next();
    }

    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    req.user = decoded;

    next();
  } catch {
    next();
  }
}

export function authorizeOwner(userIdParam = 'userId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const resourceUserId = req.params[userIdParam];
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      throw AppError.unauthorized('User not authenticated');
    }

    if (resourceUserId !== currentUserId) {
      throw AppError.forbidden('Access denied. You can only access your own resources');
    }

    next();
  };
}
