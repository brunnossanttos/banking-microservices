import { createApp } from './app';
import { env, connectDatabase, connectRedis, connectRabbitMQ } from './config';
import { logger } from './utils';

async function connectServices(): Promise<void> {
  const connectionPromises: Promise<void>[] = [];

  if (!env.isTest) {
    connectionPromises.push(
      connectDatabase().catch(err => {
        logger.warn('Database connection failed, continuing without database', err);
      }),
    );

    connectionPromises.push(
      connectRedis().catch(err => {
        logger.warn('Redis connection failed, continuing without redis', err);
      }),
    );

    connectionPromises.push(
      connectRabbitMQ().catch(err => {
        logger.warn('RabbitMQ connection failed, continuing without rabbitmq', err);
      }),
    );
  }

  await Promise.all(connectionPromises);
}

async function bootstrap(): Promise<void> {
  await connectServices();

  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`Clients Service started on port ${env.port}`);
    logger.info(`Environment: ${env.nodeEnv}`);
    logger.info(`Health check: http://localhost:${env.port}/api/health`);
    logger.info(`Hello World: http://localhost:${env.port}/api/hello`);
  });
}

bootstrap().catch(error => {
  logger.error('Failed to start server', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
