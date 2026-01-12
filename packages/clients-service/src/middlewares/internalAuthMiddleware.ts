import { Request, Response, NextFunction } from 'express';
import { AppError } from '@banking/shared';
import { env } from '../config';

/**
 * Middleware for service-to-service authentication
 * Uses a shared API key for internal microservice communication
 */
export function authenticateInternalService(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const apiKey = req.headers['x-internal-api-key'] as string | undefined;

  if (!apiKey) {
    throw AppError.unauthorized('Internal API key required');
  }

  if (apiKey !== env.internalApiKey) {
    throw AppError.unauthorized('Invalid internal API key');
  }

  next();
}
