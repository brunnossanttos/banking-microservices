import { Router } from 'express';
import { healthRoutes } from './healthRoutes';
import { transactionRoutes } from './transactionRoutes';

const router = Router();

router.use('/', healthRoutes);
router.use('/transactions', transactionRoutes);

export { router as routes };
