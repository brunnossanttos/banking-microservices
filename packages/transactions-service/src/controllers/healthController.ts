import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse, HealthData } from '../types';

export class HealthController {
  public check = (_req: Request, res: Response<ApiResponse<HealthData>>): void => {
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      message: 'Transactions Service is running.',
      timestamp: new Date().toISOString(),
    });
  };

  public hello = (_req: Request, res: Response<ApiResponse<{ message: string }>>): void => {
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        message: 'Hello, World!',
      },
      timestamp: new Date().toISOString(),
    });
  };
}

export const healthController = new HealthController();
