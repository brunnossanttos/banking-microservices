import { Router, Request, Response, NextFunction } from 'express';
import { transactionController } from '../controllers';
import { validateRequest } from '@banking/shared';
import {
  createTransactionSchema,
  getTransactionSchema,
  getUserTransactionsSchema,
} from '../schemas/transactionSchema';
import {
  authenticate,
  authorizeTransactionParticipant,
  authorizeOwner,
} from '../middlewares/authMiddleware';

const router = Router();

router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(createTransactionSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authorizeTransactionParticipant(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void transactionController.create(req, res, next);
  },
);

router.get(
  '/user/:userId',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(getUserTransactionsSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authorizeOwner('userId')(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void transactionController.getByUserId(req, res, next);
  },
);

router.get(
  '/:transactionId',
  (req: Request, res: Response, next: NextFunction) => {
    void validateRequest(getTransactionSchema)(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    authenticate(req, res, next);
  },
  (req: Request, res: Response, next: NextFunction) => {
    void transactionController.getById(req, res, next);
  },
);

export { router as transactionRoutes };
