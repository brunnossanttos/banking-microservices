export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  source: string;
}

export type TransactionEventType =
  | 'transaction.created'
  | 'transaction.completed'
  | 'transaction.failed'
  | 'transaction.reversed';

export interface TransactionEvent extends BaseEvent {
  eventType: TransactionEventType;
  payload: {
    transactionId: string;
    senderUserId: string;
    receiverUserId: string;
    amount: number;
    fee: number;
    description?: string;
    type: 'transfer' | 'deposit' | 'withdrawal' | 'payment' | 'refund';
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed' | 'cancelled';
    errorMessage?: string;
    errorCode?: string;
  };
}

export type UserEventType =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.banking_details_updated'
  | 'user.balance_updated';

export interface UserEvent extends BaseEvent {
  eventType: UserEventType;
  payload: {
    userId: string;
    email: string;
    name: string;
    changes?: Record<string, unknown>;
  };
}

export interface BalanceUpdateEvent extends BaseEvent {
  eventType: 'user.balance_updated';
  payload: {
    userId: string;
    previousBalance: number;
    newBalance: number;
    transactionId: string;
    operation: 'debit' | 'credit';
  };
}

export type NotificationType = 'email' | 'sms' | 'push' | 'in_app';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationTemplate =
  | 'transaction_completed'
  | 'transaction_failed'
  | 'transaction_received'
  | 'balance_low'
  | 'welcome'
  | 'password_reset'
  | 'account_verified';

export interface NotificationEvent extends BaseEvent {
  eventType: 'notification.send';
  payload: {
    userId: string;
    type: NotificationType;
    template: NotificationTemplate;
    priority: NotificationPriority;
    data: Record<string, unknown>;
    channels?: NotificationType[];
  };
}

export interface NotificationRequest {
  userId: string;
  template: NotificationTemplate;
  channels: NotificationType[];
  priority: NotificationPriority;
  data: Record<string, unknown>;
  scheduledAt?: string;
}

export interface NotificationResponse {
  notificationId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export function createEvent<T extends BaseEvent>(
  eventType: string,
  payload: Record<string, unknown>,
  source: string,
): T {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    version: '1.0',
    source,
    payload,
  } as unknown as T;
}

export const ROUTING_KEYS = {
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_FAILED: 'transaction.failed',
  TRANSACTION_REVERSED: 'transaction.reversed',

  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_BANKING_DETAILS_UPDATED: 'user.banking_details_updated',
  USER_BALANCE_UPDATED: 'user.balance_updated',

  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_EMAIL: 'notification.email',
  NOTIFICATION_SMS: 'notification.sms',
  NOTIFICATION_PUSH: 'notification.push',
} as const;

export const EXCHANGES = {
  TRANSACTIONS: 'transactions.exchange',
  CLIENTS: 'clients.exchange',
  NOTIFICATIONS: 'notifications.exchange',
} as const;
