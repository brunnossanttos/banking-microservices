import { Router } from 'express';
import { healthRoutes } from './healthRoutes';
import { userRoutes } from './userRoutes';

const router = Router();

router.use('/', healthRoutes);
router.use('/users', userRoutes);

export { router as routes };
