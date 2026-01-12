import { Router } from 'express';
import { healthRoutes } from './healthRoutes';
import { userRoutes } from './userRoutes';
import { authRoutes } from './authRoutes';
import { internalRoutes } from './internalRoutes';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/internal', internalRoutes);

export { router as routes };
