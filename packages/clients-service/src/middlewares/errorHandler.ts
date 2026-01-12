export { AppError, createErrorHandler, notFoundHandler } from '@banking/shared';

import { createErrorHandler } from '@banking/shared';
import { logger } from '../utils/logger';

export const errorHandler = createErrorHandler({
  logger,
  includeStack: process.env.NODE_ENV === 'development',
});
