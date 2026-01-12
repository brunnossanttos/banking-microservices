import { v4 as uuidv4 } from 'uuid';
import {
  TransactionEvent,
  NotificationEvent,
  TransactionEventType,
  NotificationTemplate,
} from '@banking/shared';
import { publishMessage, EXCHANGES, ROUTING_KEYS } from '../config/rabbitmq';
import { Transaction } from '../types';
import { logger } from '../utils/logger';

const SERVICE_NAME = 'transactions-service';
const EVENT_VERSION = '1.0';

function createBaseEvent(eventType: string) {
  return {
    eventId: uuidv4(),
    eventType,
    timestamp: new Date().toISOString(),
    version: EVENT_VERSION,
    source: SERVICE_NAME,
  };
}

export function publishTransactionCreated(transaction: Transaction): boolean {
  const event: TransactionEvent = {
    ...createBaseEvent('transaction.created'),
    eventType: 'transaction.created',
    payload: {
      transactionId: transaction.id,
      senderUserId: transaction.senderUserId,
      receiverUserId: transaction.receiverUserId,
      amount: transaction.amount,
      fee: transaction.fee,
      description: transaction.description,
      type: transaction.type,
      status: transaction.status,
    },
  };

  logger.info('Publishing transaction.created event', { transactionId: transaction.id });

  return publishMessage(EXCHANGES.TRANSACTIONS, ROUTING_KEYS.TRANSACTION_CREATED, event);
}

export function publishTransactionCompleted(transaction: Transaction): boolean {
  const event: TransactionEvent = {
    ...createBaseEvent('transaction.completed'),
    eventType: 'transaction.completed',
    payload: {
      transactionId: transaction.id,
      senderUserId: transaction.senderUserId,
      receiverUserId: transaction.receiverUserId,
      amount: transaction.amount,
      fee: transaction.fee,
      description: transaction.description,
      type: transaction.type,
      status: 'completed',
    },
  };

  logger.info('Publishing transaction.completed event', { transactionId: transaction.id });

  const published = publishMessage(
    EXCHANGES.TRANSACTIONS,
    ROUTING_KEYS.TRANSACTION_COMPLETED,
    event,
  );

  if (published) {
    publishTransactionNotification(transaction, 'transaction_completed', transaction.senderUserId);
    publishTransactionNotification(transaction, 'transaction_received', transaction.receiverUserId);
  }

  return published;
}

export function publishTransactionFailed(
  transaction: Transaction,
  errorMessage?: string,
  errorCode?: string,
): boolean {
  const event: TransactionEvent = {
    ...createBaseEvent('transaction.failed'),
    eventType: 'transaction.failed',
    payload: {
      transactionId: transaction.id,
      senderUserId: transaction.senderUserId,
      receiverUserId: transaction.receiverUserId,
      amount: transaction.amount,
      fee: transaction.fee,
      description: transaction.description,
      type: transaction.type,
      status: 'failed',
      errorMessage,
      errorCode,
    },
  };

  logger.info('Publishing transaction.failed event', { transactionId: transaction.id, errorCode });

  const published = publishMessage(EXCHANGES.TRANSACTIONS, ROUTING_KEYS.TRANSACTION_FAILED, event);

  if (published) {
    publishTransactionNotification(transaction, 'transaction_failed', transaction.senderUserId);
  }

  return published;
}

function publishTransactionNotification(
  transaction: Transaction,
  template: NotificationTemplate,
  userId: string,
): boolean {
  const event: NotificationEvent = {
    ...createBaseEvent('notification.send'),
    eventType: 'notification.send',
    payload: {
      userId,
      type: 'in_app',
      template,
      priority: template === 'transaction_failed' ? 'high' : 'normal',
      data: {
        transactionId: transaction.id,
        amount: transaction.amount,
        senderUserId: transaction.senderUserId,
        receiverUserId: transaction.receiverUserId,
        description: transaction.description,
        status: transaction.status,
      },
      channels: ['email', 'in_app'],
    },
  };

  logger.info('Publishing notification event', { userId, template, transactionId: transaction.id });

  return publishMessage(EXCHANGES.NOTIFICATIONS, 'notification.send', event);
}

export function publishTransactionEvent(
  eventType: TransactionEventType,
  transaction: Transaction,
  errorInfo?: { message?: string; code?: string },
): boolean {
  switch (eventType) {
    case 'transaction.created':
      return publishTransactionCreated(transaction);
    case 'transaction.completed':
      return publishTransactionCompleted(transaction);
    case 'transaction.failed':
      return publishTransactionFailed(transaction, errorInfo?.message, errorInfo?.code);
    default:
      logger.warn('Unknown transaction event type', { eventType });
      return false;
  }
}
