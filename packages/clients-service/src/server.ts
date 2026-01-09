import http from 'http';
import { createApp } from './app';
import {
  env,
  connectDatabase,
  disconnectDatabase,
  connectRedis,
  disconnectRedis,
  connectRabbitMQ,
  disconnectRabbitMQ,
} from './config';
import { logger } from './utils';

let server: http.Server | null = null;

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

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    await Promise.allSettled([
      disconnectDatabase().catch(err => {
        logger.error('Error disconnecting database', err);
      }),
      disconnectRedis().catch(err => {
        logger.error('Error disconnecting Redis', err);
      }),
      disconnectRabbitMQ().catch(err => {
        logger.error('Error disconnecting RabbitMQ', err);
      }),
    ]);

    logger.info('All connections closed. Exiting...');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  await connectServices();

  const app = createApp();

  server = app.listen(env.port, () => {
    logger.info(`Clients Service started on port ${env.port}`);
    logger.info(`Environment: ${env.nodeEnv}`);
    logger.info(`Health check: http://localhost:${env.port}/api/health`);
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

bootstrap().catch(error => {
  logger.error('Failed to start server', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', error);
  void gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});
