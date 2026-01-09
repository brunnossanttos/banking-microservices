import amqp, { ChannelModel, Channel } from 'amqplib';
import { env } from './env';
import { logger } from '../utils/logger';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export const EXCHANGES = {
  TRANSACTIONS: 'transactions.exchange',
  NOTIFICATIONS: 'notifications.exchange',
} as const;

export const QUEUES = {
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_FAILED: 'transaction.failed',
  NOTIFICATION_SEND: 'notification.send',
} as const;

export const ROUTING_KEYS = {
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_FAILED: 'transaction.failed',
  USER_BALANCE_UPDATED: 'user.balance.updated',
} as const;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(env.rabbitmq.url);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGES.TRANSACTIONS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.NOTIFICATIONS, 'topic', { durable: true });

    await channel.assertQueue(QUEUES.TRANSACTION_CREATED, { durable: true });
    await channel.assertQueue(QUEUES.TRANSACTION_COMPLETED, { durable: true });
    await channel.assertQueue(QUEUES.TRANSACTION_FAILED, { durable: true });
    await channel.assertQueue(QUEUES.NOTIFICATION_SEND, { durable: true });

    await channel.bindQueue(
      QUEUES.TRANSACTION_CREATED,
      EXCHANGES.TRANSACTIONS,
      ROUTING_KEYS.TRANSACTION_CREATED,
    );
    await channel.bindQueue(
      QUEUES.TRANSACTION_COMPLETED,
      EXCHANGES.TRANSACTIONS,
      ROUTING_KEYS.TRANSACTION_COMPLETED,
    );
    await channel.bindQueue(
      QUEUES.TRANSACTION_FAILED,
      EXCHANGES.TRANSACTIONS,
      ROUTING_KEYS.TRANSACTION_FAILED,
    );

    logger.info('RabbitMQ connected successfully');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', error);
    throw error;
  }
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', error);
  }
}

export function publishMessage(exchange: string, routingKey: string, message: object): boolean {
  try {
    const ch = getChannel();
    const content = Buffer.from(JSON.stringify(message));
    return ch.publish(exchange, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Failed to publish message', { exchange, routingKey, error });
    return false;
  }
}
