import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../errors';
import { ApiResponse } from '../types';

export interface ErrorHandlerOptions {
  logger?: {
    warn: (message: string, meta?: object) => void;
    error: (message: string, error?: unknown) => void;
  };
  includeStack?: boolean;
}

export function createErrorHandler(
  options: ErrorHandlerOptions = {},
): (err: Error, req: Request, res: Response<ApiResponse>, next: NextFunction) => void {
  const { logger, includeStack = false } = options;

  return function errorHandler(
    err: Error,
    _req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction,
  ): void {
    if (err instanceof AppError) {
      logger?.warn(`AppError: ${err.message}`, { statusCode: err.statusCode, code: err.code });

      res.status(err.statusCode).json({
        success: false,
        error: err.message,
        ...(err.code && { code: err.code }),
        ...(includeStack && err.stack && { stack: err.stack }),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger?.error('Unexpected error', err);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal server error',
      ...(includeStack && err.stack && { stack: err.stack }),
      timestamp: new Date().toISOString(),
    });
  };
}

export function notFoundHandler(req: Request, res: Response<ApiResponse>): void {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
}
