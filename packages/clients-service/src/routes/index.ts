import { Router } from 'express';
import { healthRoutes } from './healthRoutes';
import { userRoutes } from './userRoutes';
import { authRoutes } from './authRoutes';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export { router as routes };
