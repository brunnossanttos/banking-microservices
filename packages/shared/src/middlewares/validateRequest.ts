import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';

interface RequestData {
  body: unknown;
  query: unknown;
  params: unknown;
}

export function validateRequest(schema: ZodSchema<RequestData>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      } as RequestData);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };
}
