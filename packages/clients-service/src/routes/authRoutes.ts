import { Router, Request, Response, NextFunction } from 'express';
import { authController } from '../controllers';
import { validateRequest } from '@banking/shared';
import { loginSchema, refreshTokenSchema, logoutSchema } from '../schemas/authSchema';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post(
  '/login',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(loginSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void authController.login(req, res, next);
  },
);

router.post(
  '/refresh',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(refreshTokenSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void authController.refresh(req, res, next);
  },
);

router.post(
  '/logout',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(logoutSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void authController.logout(req, res, next);
  },
);

router.post(
  '/logout-all',
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void authController.logoutAll(req, res, next);
  },
);

router.get(
  '/me',
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void authController.me(req, res, next);
  },
);

export { router as authRoutes };
