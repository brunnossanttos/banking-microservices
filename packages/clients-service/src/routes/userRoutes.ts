import { Router, Request, Response, NextFunction } from 'express';
import { userController } from '../controllers';
import { validateRequest } from '@banking/shared';
import {
  createUserSchema,
  getUserSchema,
  updateUserSchema,
  updateProfilePictureSchema,
  depositSchema,
  withdrawSchema,
} from '../schemas/userSchema';
import { authenticate, authorizeOwner } from '../middlewares/authMiddleware';

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

router.get(
  '/:userId',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(getUserSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authorizeOwner('userId')(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void userController.getById(req, res, next);
  },
);

router.patch(
  '/:userId',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(updateUserSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authorizeOwner('userId')(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void userController.update(req, res, next);
  },
);

router.patch(
  '/:userId/profile-picture',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(updateProfilePictureSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authorizeOwner('userId')(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void userController.updateProfilePicture(req, res, next);
  },
);

router.post(
  '/:userId/deposit',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(depositSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authorizeOwner('userId')(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void userController.deposit(req, res, next);
  },
);

router.post(
  '/:userId/withdraw',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(withdrawSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authorizeOwner('userId')(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void userController.withdraw(req, res, next);
  },
);

export { router as userRoutes };
