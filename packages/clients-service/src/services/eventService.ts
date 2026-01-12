import { v4 as uuidv4 } from 'uuid';
import { UserEvent, NotificationEvent, UserEventType, NotificationTemplate } from '@banking/shared';
import { publishMessage, EXCHANGES } from '../config/rabbitmq';
import { User } from '../types';
import { logger } from '../utils/logger';

const SERVICE_NAME = 'clients-service';
const EVENT_VERSION = '1.0';

const ROUTING_KEYS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  BANKING_DETAILS_UPDATED: 'banking.details.updated',
  NOTIFICATION_SEND: 'notification.send',
} as const;

function createBaseEvent(eventType: string) {
  return {
    eventId: uuidv4(),
    eventType,
    timestamp: new Date().toISOString(),
    version: EVENT_VERSION,
    source: SERVICE_NAME,
  };
}

export function publishUserCreated(user: Omit<User, 'password'>): boolean {
  const event: UserEvent = {
    ...createBaseEvent('user.created'),
    eventType: 'user.created',
    payload: {
      userId: user.id,
      email: user.email,
      name: user.name,
    },
  };

  logger.info('Publishing user.created event', { userId: user.id });

  const published = publishMessage(EXCHANGES.CLIENTS, ROUTING_KEYS.USER_CREATED, event);

  if (published) {
    publishUserNotification(user.id, 'welcome', { name: user.name, email: user.email });
  }

  return published;
}

export function publishUserUpdated(
  user: Omit<User, 'password'>,
  changes: Record<string, unknown>,
): boolean {
  const event: UserEvent = {
    ...createBaseEvent('user.updated'),
    eventType: 'user.updated',
    payload: {
      userId: user.id,
      email: user.email,
      name: user.name,
      changes,
    },
  };

  logger.info('Publishing user.updated event', { userId: user.id, changes: Object.keys(changes) });

  return publishMessage(EXCHANGES.CLIENTS, ROUTING_KEYS.USER_UPDATED, event);
}

export function publishBankingDetailsUpdated(
  userId: string,
  email: string,
  name: string,
  changes: Record<string, unknown>,
): boolean {
  const event: UserEvent = {
    ...createBaseEvent('user.banking_details_updated'),
    eventType: 'user.banking_details_updated',
    payload: {
      userId,
      email,
      name,
      changes,
    },
  };

  logger.info('Publishing banking.details.updated event', { userId });

  return publishMessage(EXCHANGES.CLIENTS, ROUTING_KEYS.BANKING_DETAILS_UPDATED, event);
}

export function publishUserDeleted(userId: string, email: string, name: string): boolean {
  const event: UserEvent = {
    ...createBaseEvent('user.deleted'),
    eventType: 'user.deleted',
    payload: {
      userId,
      email,
      name,
    },
  };

  logger.info('Publishing user.deleted event', { userId });

  return publishMessage(EXCHANGES.CLIENTS, ROUTING_KEYS.USER_DELETED, event);
}

function publishUserNotification(
  userId: string,
  template: NotificationTemplate,
  data: Record<string, unknown>,
): boolean {
  const event: NotificationEvent = {
    ...createBaseEvent('notification.send'),
    eventType: 'notification.send',
    payload: {
      userId,
      type: 'email',
      template,
      priority: 'normal',
      data,
      channels: ['email', 'in_app'],
    },
  };

  logger.info('Publishing notification event', { userId, template });

  return publishMessage(EXCHANGES.NOTIFICATIONS, ROUTING_KEYS.NOTIFICATION_SEND, event);
}

export function publishUserEvent(
  eventType: UserEventType,
  user: Omit<User, 'password'>,
  changes?: Record<string, unknown>,
): boolean {
  switch (eventType) {
    case 'user.created':
      return publishUserCreated(user);
    case 'user.updated':
      return publishUserUpdated(user, changes ?? {});
    case 'user.banking_details_updated':
      return publishBankingDetailsUpdated(user.id, user.email, user.name, changes ?? {});
    case 'user.deleted':
      return publishUserDeleted(user.id, user.email, user.name);
    default:
      logger.warn('Unknown user event type', { eventType });
      return false;
  }
}
