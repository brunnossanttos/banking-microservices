import { Router, Request, Response, NextFunction } from 'express';
import { userController } from '../controllers';
import { validateRequest } from '@banking/shared';
import { createUserSchema } from '../schemas/userSchema';

const router = Router();

router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(createUserSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void userController.create(req, res, next);
  },
);

export { router as userRoutes };
