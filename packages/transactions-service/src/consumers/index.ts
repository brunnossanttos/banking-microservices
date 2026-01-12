import { ConsumeMessage } from 'amqplib';
import { getChannel, QUEUES } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { TransactionEvent } from '@banking/shared';

type MessageHandler<T> = (message: T) => Promise<void>;

async function setupConsumer<T>(queue: string, handler: MessageHandler<T>): Promise<void> {
  const channel = getChannel();

  await channel.consume(
    queue,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString()) as T;
        logger.info(`Processing message from ${queue}`, { messageId: msg.properties.messageId });

        await handler(content);

        channel.ack(msg);
        logger.debug(`Message acknowledged`, { queue });
      } catch (error) {
        logger.error(`Error processing message from ${queue}`, { error });
        channel.nack(msg, false, false);
      }
    },
    { noAck: false },
  );

  logger.info(`Consumer started for queue: ${queue}`);
}

async function handleTransactionCreated(event: TransactionEvent): Promise<void> {
  logger.info('Handling transaction.created event', {
    transactionId: event.payload.transactionId,
    senderUserId: event.payload.senderUserId,
    receiverUserId: event.payload.receiverUserId,
    amount: event.payload.amount,
  });
}

async function handleTransactionCompleted(event: TransactionEvent): Promise<void> {
  logger.info('Handling transaction.completed event', {
    transactionId: event.payload.transactionId,
    status: event.payload.status,
  });
}

async function handleTransactionFailed(event: TransactionEvent): Promise<void> {
  logger.warn('Handling transaction.failed event', {
    transactionId: event.payload.transactionId,
    errorCode: event.payload.errorCode,
    errorMessage: event.payload.errorMessage,
  });
}

export async function startConsumers(): Promise<void> {
  try {
    await setupConsumer<TransactionEvent>(QUEUES.TRANSACTION_CREATED, handleTransactionCreated);

    await setupConsumer<TransactionEvent>(QUEUES.TRANSACTION_COMPLETED, handleTransactionCompleted);

    await setupConsumer<TransactionEvent>(QUEUES.TRANSACTION_FAILED, handleTransactionFailed);

    logger.info('All consumers started successfully');
  } catch (error) {
    logger.error('Failed to start consumers', { error });
    throw error;
  }
}
