import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { authService } from '../services';
import { LoginInput, RefreshTokenInput, LogoutInput } from '../schemas/authSchema';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;
    const tokens = await authService.login(email, password);

    res.status(StatusCodes.OK).json({
      success: true,
      data: tokens,
      message: 'Login successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const tokens = await authService.refreshTokens(refreshToken);

    res.status(StatusCodes.OK).json({
      success: true,
      data: tokens,
      message: 'Tokens refreshed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as LogoutInput;
    await authService.logout(refreshToken);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const revokedCount = await authService.logoutAll(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: { revokedSessions: revokedCount },
      message: 'Logged out from all devices successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { userService } = await import('../services');
    const user = await userService.getUserById(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
