import { Router, Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { validateRequest } from '@banking/shared';
import { authenticateInternalService } from '../middlewares/internalAuthMiddleware';
import { getUserSchema, depositSchema, withdrawSchema } from '../schemas/userSchema';
import * as userService from '../services/userService';

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) => {
  authenticateInternalService(req, res, next);
});

router.get(
  '/users/:userId',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(getUserSchema)(req, res, next);
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getUserById(req.params.userId);
      res.status(StatusCodes.OK).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/users/:userId/deposit',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(depositSchema)(req, res, next);
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount } = req.body as { amount: number };
      const user = await userService.deposit(req.params.userId, amount);
      res.status(StatusCodes.OK).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/users/:userId/withdraw',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(withdrawSchema)(req, res, next);
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount } = req.body as { amount: number };
      const user = await userService.withdraw(req.params.userId, amount);
      res.status(StatusCodes.OK).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

export { router as internalRoutes };
