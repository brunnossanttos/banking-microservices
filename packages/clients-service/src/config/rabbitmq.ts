import amqp, { ChannelModel, Channel } from 'amqplib';
import { env } from './env';
import { logger } from '../utils/logger';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export const EXCHANGES = {
  CLIENTS: 'clients.exchange',
  NOTIFICATIONS: 'notifications.exchange',
} as const;

export const QUEUES = {
  CLIENT_CREATED: 'client.created',
  CLIENT_UPDATED: 'client.updated',
  BANKING_DETAILS_UPDATED: 'banking.details.updated',
} as const;

function getRabbitMQUrl(): string {
  return `amqp://${env.rabbitmq.user}:${env.rabbitmq.password}@${env.rabbitmq.host}:${env.rabbitmq.port}/${env.rabbitmq.vhost}`;
}

export async function connectRabbitMQ(): Promise<void> {
  try {
    const url = getRabbitMQUrl();
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGES.CLIENTS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.NOTIFICATIONS, 'topic', { durable: true });

    await channel.assertQueue(QUEUES.CLIENT_CREATED, { durable: true });
    await channel.assertQueue(QUEUES.CLIENT_UPDATED, { durable: true });
    await channel.assertQueue(QUEUES.BANKING_DETAILS_UPDATED, { durable: true });

    await channel.bindQueue(QUEUES.CLIENT_CREATED, EXCHANGES.CLIENTS, 'client.created');
    await channel.bindQueue(QUEUES.CLIENT_UPDATED, EXCHANGES.CLIENTS, 'client.updated');
    await channel.bindQueue(
      QUEUES.BANKING_DETAILS_UPDATED,
      EXCHANGES.CLIENTS,
      'banking.details.updated',
    );

    logger.info('RabbitMQ connected successfully');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', error);
    throw error;
  }
}

export async function disconnectRabbitMQ(): Promise<void> {
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

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

export function publishMessage(exchange: string, routingKey: string, message: object): boolean {
  try {
    const ch = getChannel();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    return ch.publish(exchange, routingKey, messageBuffer, {
      persistent: true,
      contentType: 'application/json',
    });
  } catch (error) {
    logger.error('Failed to publish message', { exchange, routingKey, error });
    return false;
  }
}
