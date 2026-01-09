import { StatusCodes } from 'http-status-codes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    isOperational = true,
    code?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: string): AppError {
    return new AppError(message, StatusCodes.BAD_REQUEST, true, code);
  }

  static unauthorized(message = 'Unauthorized', code?: string): AppError {
    return new AppError(message, StatusCodes.UNAUTHORIZED, true, code);
  }

  static forbidden(message = 'Forbidden', code?: string): AppError {
    return new AppError(message, StatusCodes.FORBIDDEN, true, code);
  }

  static notFound(message = 'Resource not found', code?: string): AppError {
    return new AppError(message, StatusCodes.NOT_FOUND, true, code);
  }

  static conflict(message: string, code?: string): AppError {
    return new AppError(message, StatusCodes.CONFLICT, true, code);
  }

  static unprocessableEntity(message: string, code?: string): AppError {
    return new AppError(message, StatusCodes.UNPROCESSABLE_ENTITY, true, code);
  }

  static internal(message = 'Internal server error', code?: string): AppError {
    return new AppError(message, StatusCodes.INTERNAL_SERVER_ERROR, false, code);
  }

  static serviceUnavailable(message = 'Service unavailable', code?: string): AppError {
    return new AppError(message, StatusCodes.SERVICE_UNAVAILABLE, true, code);
  }
}
